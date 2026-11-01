"""The same file twice in one member's folders is skipped (a retried or repeated upload)."""

import hashlib
from collections.abc import Iterable

from django.db.models import Q

from ..models import Folder, Media


class DuplicateUpload(Exception):
    """The member already has this exact file; `media` is where it is."""

    def __init__(self, media: Media) -> None:
        self.media = media
        where = media.folder.name
        super().__init__(f"Already uploaded: “{media.original_filename}” in “{where}”.")


def fingerprint(blocks: Iterable[bytes]) -> str:
    """SHA-256 of the file's bytes, fed block by block (large videos never sit in memory)."""
    digest = hashlib.sha256()
    for block in blocks:
        digest.update(block)
    return digest.hexdigest()


def check_duplicate(folder: Folder, sha256: str) -> None:
    """Raise DuplicateUpload if the file is in any folder of the member who owns `folder`."""
    top = folder.top_level_id
    existing = (
        Media.objects.filter(Q(folder_id=top) | Q(folder__root_id=top), sha256=sha256)
        .select_related("folder")
        .order_by("uploaded_at")
        .first()
    )
    if existing is not None:
        raise DuplicateUpload(existing)
