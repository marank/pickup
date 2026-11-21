"""Deleting media: the rows and their files on disk (original, preview, viewer JPEG)."""

from ..models import Folder, Media


def delete_media(media: Media) -> None:
    media.delete_files()
    media.delete()


def clear_folder(folder: Folder) -> int:
    """Delete every file directly in `folder` (not in its subfolders); returns how many."""
    count = folder.media.count()
    for media in folder.media.all():
        media.delete_files()
    folder.media.all().delete()
    return count
