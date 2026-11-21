"""
A demo pickup for screenshots and trying things out: a weekend at a lake with four people,
their folders and photos taken over two days (`manage.py seed_demo`).

Photos come from a folder of JPEGs if one is given, otherwise simple generated pictures.
Every photo is written anew with a capture time in its EXIF data, so the timeline groups
them into days and moments; anything else the originals carried (GPS, camera) is dropped.
It goes through the same services as an upload, so previews and capture times are real.
"""

import io
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.http import HttpRequest
from django.utils import timezone
from PIL import Image, ImageDraw

from ..models import Folder, Member, Pickup
from .capture_time import DATE_TIME_ORIGINAL, EXIF_IFD, OFFSET_TIME_ORIGINAL
from .folders import create_subfolder
from .members import create_pickup, join_pickup
from .uploads import upload_media

TITLE = "Summer weekend at the lake"
CREATOR = "Anna"
PARTICIPANTS = ("Ben", "Chloé", "David")
SUBFOLDER = "Boat trip"
LONG_EDGE = 1600

# When the photos were taken: (day, hour, minute) of each moment, in the server's zone.
MOMENTS = (
    (0, 10, 12),
    (0, 13, 40),
    (0, 15, 5),
    (0, 18, 30),
    (0, 20, 55),
    (1, 9, 45),
    (1, 12, 20),
    (1, 16, 10),
)


@dataclass(frozen=True)
class DemoPickup:
    pickup: Pickup
    creator: Member
    photos: int


def _photo_sources(photos_dir: Path | None, count: int) -> list[bytes]:
    """The originals: the JPEGs of photos_dir (sorted by name), or generated pictures."""
    if photos_dir is not None:
        files = sorted(p for p in photos_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg"})
        if not files:
            msg = f"No JPEG files in {photos_dir}."
            raise ValueError(msg)
        return [p.read_bytes() for p in files]
    return [_generated(index) for index in range(count)]


def _generated(index: int) -> bytes:
    """A simple landscape (sky, sun, hill, water) in colours that differ per index."""
    width, height = 960, 640
    hue = (index * 47) % 360
    image = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(image)
    sky = Image.new("HSV", (1, 1), (hue * 255 // 360, 90, 230)).convert("RGB").getpixel((0, 0))
    draw.rectangle((0, 0, width, height), fill=sky)
    draw.ellipse((width * 0.6, 80, width * 0.6 + 120, 200), fill=(250, 230, 170))
    draw.polygon(
        [(0, 400), (width * 0.4, 300), (width, 420), (width, height), (0, height)], fill=(70, 110, 80)
    )
    draw.rectangle((0, 470, width, height), fill=(60, 110, 150))
    return _jpeg(image)


def _jpeg(image: Image.Image, exif: Image.Exif | None = None) -> bytes:
    out = io.BytesIO()
    image.save(out, "JPEG", quality=85, exif=exif or Image.Exif())
    return out.getvalue()


def _with_capture_time(original: bytes, taken: datetime) -> bytes:
    """The photo upright, at most LONG_EDGE px, with only its capture time as metadata."""
    with Image.open(io.BytesIO(original)) as source:
        image = source.convert("RGB")
    image.thumbnail((LONG_EDGE, LONG_EDGE))
    offset = taken.strftime("%z")
    exif = Image.Exif()
    # Assigned as a whole: an IFD only fetched with get_ifd() is not written.
    exif[EXIF_IFD] = {
        DATE_TIME_ORIGINAL: taken.strftime("%Y:%m:%d %H:%M:%S"),
        OFFSET_TIME_ORIGINAL: f"{offset[:3]}:{offset[3:]}",
    }
    return _jpeg(image, exif)


def _capture_times(count: int, first_day: datetime) -> Iterator[datetime]:
    """count times spread over the moments, a few minutes apart within each."""
    for index in range(count):
        day, hour, minute = MOMENTS[index % len(MOMENTS)]
        within = index // len(MOMENTS)
        yield first_day + timedelta(
            days=day, hours=hour, minutes=minute + 3 * within, seconds=17 * index % 60
        )


def _folder_of(member: Member) -> Folder:
    """The member's top-level folder; creating or joining with a name always gives one."""
    if member.folder is None:
        msg = f"{member.user_name} has no folder."
        raise RuntimeError(msg)
    return member.folder


def seed_demo(photos_dir: Path | None = None, count: int = 24) -> DemoPickup:
    """
    Create the demo pickup: Anna (creator, with a subfolder) and three participants, the
    photos dealt out between their folders. Uploads end in a week, the pickup is deleted
    in ten weeks, so both dates show.
    """
    request = HttpRequest()
    pickup, creator = create_pickup(request, TITLE, creator_name=CREATOR)
    now = timezone.now()
    Pickup.objects.filter(pk=pickup.pk).update(
        read_only_at=now + timedelta(days=8), expires_at=now + timedelta(days=71)
    )
    pickup.refresh_from_db()
    creator_folder = _folder_of(creator)
    folders = [
        creator_folder,
        create_subfolder(creator_folder, SUBFOLDER),
        *(_folder_of(join_pickup(request, pickup, None, name=name, user_name=name)) for name in PARTICIPANTS),
    ]

    originals = _photo_sources(photos_dir, count)
    first_day = timezone.localtime(now - timedelta(days=160)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    for index, taken in enumerate(_capture_times(len(originals), first_day)):
        folder = folders[index % len(folders)]
        upload = SimpleUploadedFile(
            f"IMG_{4120 + index * 3}.jpg",
            _with_capture_time(originals[index], taken),
            content_type="image/jpeg",
        )
        upload_media(folder, {"file": upload})
    return DemoPickup(pickup, creator, len(originals))
