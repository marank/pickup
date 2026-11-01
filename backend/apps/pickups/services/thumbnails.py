"""Small JPEG previews of uploaded images and videos, so tiles don't load the full file."""

import io
import logging
import shutil
import subprocess
from collections.abc import Callable
from typing import IO

from django.core.files.base import ContentFile
from django.db.models.fields.files import FieldFile
from pi_heif import register_heif_opener
from PIL import Image, ImageOps

from ..models import Media

logger = logging.getLogger(__name__)

# Pillow reads HEIC/HEIF (iPhone photos) through libheif: decoding only, no GPL encoder.
register_heif_opener()

# Longest side in pixels: sharp in the largest tiles on a phone with a 3x screen.
THUMBNAIL_SIZE = 640
THUMBNAIL_QUALITY = 80
# The viewer's JPEG for files browsers can't show (HEIC): sharp on large screens.
DISPLAY_SIZE = 2560
DISPLAY_QUALITY = 85

# Video stills come from ffmpeg (built small in the Dockerfile, run as its own program).
# Only real video containers: playlists and concat lists could make it read other files.
# The Dockerfile's ffmpeg has exactly these demuxers.
VIDEO_FORMATS = "mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi,asf,flv"
VIDEO_TIMEOUT = 30  # seconds per attempt
# Never enlarged; Pillow does the rest (same size and quality as for images).
VIDEO_SCALE = (
    f"scale=w='min({THUMBNAIL_SIZE},iw)':h='min({THUMBNAIL_SIZE},ih)':force_original_aspect_ratio=decrease"
)


def render_thumbnail(
    source: IO[bytes], size: int = THUMBNAIL_SIZE, quality: int = THUMBNAIL_QUALITY
) -> bytes:
    """
    A JPEG at most `size` pixels wide and high, turned upright (EXIF orientation),
    transparency on white, first frame of animations. Pillow refuses decompression bombs.
    """
    with Image.open(source) as image:
        # JPEGs decode straight at a fraction of their size: fast and light on memory.
        image.draft("RGB", (size, size))
        upright = ImageOps.exif_transpose(image)
        upright.thumbnail((size, size))
        if upright.mode in ("RGBA", "LA", "P", "PA"):
            rgba = upright.convert("RGBA")
            flat = Image.new("RGB", rgba.size, "white")
            flat.paste(rgba, mask=rgba.getchannel("A"))
        else:
            flat = upright.convert("RGB")
        out = io.BytesIO()
        flat.save(out, "JPEG", quality=quality, optimize=True)
        return out.getvalue()


def video_still(path: str) -> bytes:
    """A frame half a second in (or the first one, for very short clips), as a thumbnail."""
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        raise FileNotFoundError("ffmpeg is not installed")
    for seek in ("0.5", "0"):
        # ffmpeg turns the frame upright itself (rotation metadata of phone videos).
        result = subprocess.run(
            [
                ffmpeg,
                "-nostdin",
                "-loglevel", "error",
                "-protocol_whitelist", "file",
                "-format_whitelist", VIDEO_FORMATS,
                "-ss", seek,
                "-i", f"file:{path}",
                "-frames:v", "1",
                "-vf", VIDEO_SCALE,
                "-f", "image2pipe",
                "-c:v", "png",
                "-",
            ],
            capture_output=True,
            timeout=VIDEO_TIMEOUT,
            check=False,
        )  # fmt: skip
        if result.returncode == 0 and result.stdout:
            return render_thumbnail(io.BytesIO(result.stdout))
        if result.returncode != 0:
            break  # an error, or stopped (SIGTERM): no second attempt
        # Success without a frame: the clip is shorter than the seek, try its start.
    raise ValueError(f"ffmpeg found no frame: {result.stderr.decode(errors='replace')[-500:]}")


def create_thumbnail(media: Media) -> bool:
    """
    Store a preview, and for HEIC also the viewer's JPEG; False if there was nothing to do or
    the file can't be read.
    """
    created = False
    if not media.thumbnail:
        created = _store(media, "thumbnail", _thumbnail_of)
    if media.needs_display and not media.display:
        created = _store(media, "display", _display_of) or created
    return created


def _thumbnail_of(media: Media) -> bytes:
    if media.is_video:
        return video_still(media.file.path)
    with media.file.open("rb") as source:
        return render_thumbnail(source)


def _display_of(media: Media) -> bytes | None:
    with media.file.open("rb") as source:
        data = render_thumbnail(source, DISPLAY_SIZE, DISPLAY_QUALITY)
    # Not worth it when it isn't smaller than the original (HEIC needs one anyway).
    heic = (media.file.name or "").lower().endswith((".heic", ".heif"))
    return data if heic or len(data) < media.file_size else None


def _store(media: Media, field: str, render: Callable[[Media], bytes | None]) -> bool:
    try:
        data = render(media)
    except Exception:  # any unreadable or hostile file: the tile falls back to the file itself
        logger.warning("No %s for media %s", field, media.id, exc_info=True)
        return False
    if data is None:
        return False
    preview: FieldFile = getattr(media, field)
    preview.save("preview.jpg", ContentFile(data), save=False)
    # Only if nobody else stored one meanwhile (an upload and the backfill at the same time).
    if not Media.objects.filter(id=media.id, **{field: ""}).update(**{field: preview.name}):
        preview.delete(save=False)
        media.refresh_from_db(fields=[field])
        return False
    return True
