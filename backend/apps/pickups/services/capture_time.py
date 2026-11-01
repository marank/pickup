"""When a photo or video was taken, for the timeline: from its own metadata, else the upload."""

import logging
import re
import shutil
import subprocess
from datetime import UTC, datetime, timedelta

from django.utils import timezone
from PIL import Image

from ..models import Media

logger = logging.getLogger(__name__)

# EXIF: DateTimeOriginal and its offset live in the Exif IFD; DateTime (last change) in IFD0.
EXIF_IFD = 0x8769
DATE_TIME_ORIGINAL = 0x9003
OFFSET_TIME_ORIGINAL = 0x9011
DATE_TIME = 0x0132
# Videos: ffmpeg prints the container's creation_time (UTC) among the stream info.
CREATION_TIME = re.compile(r"creation_time\s*:\s*(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z?)")
EARLIEST = datetime(1990, 1, 1, tzinfo=UTC)


def _plausible(moment: datetime | None) -> datetime | None:
    """Cameras with an unset clock say 1970 or 2000-01-01; nothing comes from the future."""
    if moment is None or moment < EARLIEST or moment > timezone.now() + timedelta(days=1):
        return None
    return moment


def image_time(path: str) -> datetime | None:
    with Image.open(path) as image:
        exif = image.getexif()
    sub = exif.get_ifd(EXIF_IFD)
    text = sub.get(DATE_TIME_ORIGINAL) or exif.get(DATE_TIME)
    if not isinstance(text, str):
        return None
    try:
        moment = datetime.strptime(text.strip()[:19], "%Y:%m:%d %H:%M:%S")
    except ValueError:
        return None
    offset = sub.get(OFFSET_TIME_ORIGINAL)
    if isinstance(offset, str) and re.fullmatch(r"[+-]\d\d:\d\d", offset.strip()):
        return datetime.fromisoformat(moment.isoformat() + offset.strip())
    # Without an offset (older cameras) the time is the camera's local time: the server's.
    return timezone.make_aware(moment)


def video_time(path: str) -> datetime | None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        return None
    # Without an output ffmpeg exits with an error, after printing what it found.
    result = subprocess.run(
        [ffmpeg, "-hide_banner", "-nostdin", "-protocol_whitelist", "file", "-i", f"file:{path}"],
        capture_output=True,
        timeout=30,
        check=False,
    )
    match = CREATION_TIME.search(result.stderr.decode(errors="replace"))
    if match is None:
        return None
    return datetime.fromisoformat(match.group(1).replace("Z", "+00:00"))


def store_capture_time(media: Media) -> None:
    """Set `taken_at`: from the file, else the upload time (screenshots, stripped files)."""
    taken: datetime | None = None
    try:
        taken = _plausible(video_time(media.file.path) if media.is_video else image_time(media.file.path))
    except Exception:  # unreadable files keep the upload time
        logger.info("No capture time for media %s", media.id, exc_info=True)
    Media.objects.filter(id=media.id).update(taken_at=taken or media.uploaded_at)
    media.refresh_from_db(fields=["taken_at"])
