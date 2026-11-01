"""Files still missing something: a preview, the viewer's JPEG, a fingerprint, a capture time.

Uploads make all of it at once; this covers files from before a feature existed and ones where
making it failed. The worker's catch_up job runs it every few minutes (tasks.py), the
create_thumbnails command by hand.
"""

from dataclasses import dataclass

from django.db.models import Q, QuerySet

from ..models import Media, live
from ..models.media import DISPLAY_FROM_BYTES, LARGE_STILLS, NEEDS_DISPLAY
from .capture_time import store_capture_time
from .duplicates import fingerprint
from .thumbnails import create_thumbnail


def _ending(extensions: set[str]) -> Q:
    query = Q()
    for extension in sorted(extensions):
        query |= Q(file__iendswith=f".{extension}")
    return query


def needing_work() -> QuerySet[Media]:
    """Live files missing something, oldest first. Large photos whose JPEG wouldn't be
    smaller keep none and come back here: one cheap attempt per run."""
    display_due = _ending(NEEDS_DISPLAY) | (_ending(LARGE_STILLS) & Q(file_size__gt=DISPLAY_FROM_BYTES))
    missing = Q(thumbnail="") | (Q(display="") & display_due) | Q(sha256="") | Q(taken_at=None)
    return Media.objects.filter(missing, live("folder__pickup__")).order_by("uploaded_at")


@dataclass
class Done:
    previews: bool = False
    fingerprint: bool = False


def complete(media: Media) -> Done:
    """Make whatever this file is missing; unreadable files are left as they are."""
    done = Done(previews=create_thumbnail(media))
    if not media.sha256:
        try:
            with media.file.open("rb") as source:
                sha256 = fingerprint(source.chunks())
        except OSError:
            pass  # the file is missing on disk: nothing to compare with
        else:
            done.fingerprint = bool(Media.objects.filter(id=media.id, sha256="").update(sha256=sha256))
    if media.taken_at is None:
        store_capture_time(media)
    return done
