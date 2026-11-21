import io
from pathlib import Path

import pytest
from django.core.management import CommandError, call_command
from PIL import Image
from pytest_django.fixtures import Settings

from apps.pickups.models import Folder, Media, Member, Pickup
from apps.pickups.services.demo import CREATOR, PARTICIPANTS, SUBFOLDER

pytestmark = pytest.mark.django_db


def run(*args: str) -> str:
    out = io.StringIO()
    call_command("seed_demo", *args, stdout=out)
    return out.getvalue()


def test_creates_a_pickup_with_people_folders_and_photos(settings: Settings) -> None:
    settings.DEBUG = True
    output = run()

    pickup = Pickup.objects.get()
    creator = Member.objects.get(is_creator=True)
    assert creator.user_name == CREATOR
    assert f"/pickup/{pickup.id}/member/{creator.access_key}" in output
    assert sorted(Member.objects.values_list("user_name", flat=True)) == sorted([CREATOR, *PARTICIPANTS])
    assert Folder.objects.filter(name=SUBFOLDER, parent=creator.folder).exists()
    assert pickup.read_only_at is not None
    assert pickup.expires_at is not None

    media = list(Media.objects.all())
    assert len(media) == 24
    assert all(m.thumbnail for m in media)
    # Two days of capture times from the EXIF data, not the upload time.
    assert len({m.taken_at.date() for m in media if m.taken_at}) == 2


def test_takes_photos_from_a_folder_without_their_metadata(settings: Settings, tmp_path: Path) -> None:
    settings.DEBUG = True
    for name in ("b.jpg", "a.JPG"):
        image = Image.new("RGB", (3000, 2000), "teal")
        exif = Image.Exif()
        exif[0x010F] = "Camera maker"
        image.save(tmp_path / name, "JPEG", exif=exif)
    (tmp_path / "notes.txt").write_text("not a photo")

    output = run("--photos", str(tmp_path))

    assert "with 2 photos" in output
    for media in Media.objects.all():
        with Image.open(media.file.path) as stored:
            assert max(stored.size) == 1600
            assert 0x010F not in stored.getexif()


def test_refuses_without_debug(settings: Settings) -> None:
    settings.DEBUG = False
    with pytest.raises(CommandError, match="DEBUG"):
        run()
    assert not Pickup.objects.exists()


@pytest.mark.parametrize("photos", ["missing", "empty"])
def test_refuses_a_photos_folder_without_photos(settings: Settings, tmp_path: Path, photos: str) -> None:
    settings.DEBUG = True
    folder = tmp_path / photos
    if photos == "empty":
        folder.mkdir()
    with pytest.raises(CommandError):
        run("--photos", str(folder))
