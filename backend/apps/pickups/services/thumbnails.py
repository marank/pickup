"""Small JPEG previews of uploaded images and videos, so tiles don't load the full file."""

import io
import logging
import shutil
import subprocess
from typing import IO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

from ..models import Media

logger = logging.getLogger(__name__)

# Longest side in pixels: sharp in the largest tiles on a phone with a 3x screen.
THUMBNAIL_SIZE = 640
THUMBNAIL_QUALITY = 80

# Video stills come from ffmpeg (built small in the Dockerfile, run as its own program).
# Only real video containers: playlists and concat lists could make it read other files.
# The Dockerfile's ffmpeg has exactly these demuxers.
VIDEO_FORMATS = "mov,mp4,m4a,3gp,3g2,mj2,matroska,webm,avi,asf,flv"
VIDEO_TIMEOUT = 30  # seconds per attempt
# Never enlarged; Pillow does the rest (same size and quality as for images).
VIDEO_SCALE = (
    f"scale=w='min({THUMBNAIL_SIZE},iw)':h='min({THUMBNAIL_SIZE},ih)':force_original_aspect_ratio=decrease"
)


def render_thumbnail(source: IO[bytes]) -> bytes:
    """
    A JPEG at most THUMBNAIL_SIZE pixels wide and high, turned upright (EXIF orientation),
    transparency on white, first frame of animations. Pillow refuses decompression bombs.
    """
    with Image.open(source) as image:
        # JPEGs decode straight at a fraction of their size: fast and light on memory.
        image.draft("RGB", (THUMBNAIL_SIZE, THUMBNAIL_SIZE))
        upright = ImageOps.exif_transpose(image)
        upright.thumbnail((THUMBNAIL_SIZE, THUMBNAIL_SIZE))
        if upright.mode in ("RGBA", "LA", "P", "PA"):
            rgba = upright.convert("RGBA")
            flat = Image.new("RGB", rgba.size, "white")
            flat.paste(rgba, mask=rgba.getchannel("A"))
        else:
            flat = upright.convert("RGB")
        out = io.BytesIO()
        flat.save(out, "JPEG", quality=THUMBNAIL_QUALITY, optimize=True)
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
    """Store a preview; False if there already is one or the file can't be read."""
    if media.thumbnail:
        return False
    try:
        if media.is_video:
            data = video_still(media.file.path)
        else:
            with media.file.open("rb") as source:
                data = render_thumbnail(source)
    except Exception:  # any unreadable or hostile file: the tile falls back to the file itself
        logger.warning("No thumbnail for media %s", media.id, exc_info=True)
        return False
    media.thumbnail.save("thumbnail.jpg", ContentFile(data), save=False)
    # Only if nobody else stored one meanwhile (an upload and the backfill at the same time).
    if not Media.objects.filter(id=media.id, thumbnail="").update(thumbnail=media.thumbnail.name):
        media.thumbnail.delete(save=False)
        media.refresh_from_db(fields=["thumbnail"])
        return False
    return True
