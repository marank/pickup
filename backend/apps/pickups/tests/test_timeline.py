"""The timeline: every file of a pickup in the order it was taken."""

import io
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client
from PIL import Image
from pytest_django.fixtures import Settings

from apps.pickups.models import Media, Pickup

from .test_access import join, new_pickup

pytestmark = pytest.mark.django_db


def photo(taken: str | None = None, offset: str | None = None, width: int = 20) -> bytes:
    exif = Image.Exif()
    if taken:
        exif.get_ifd(0x8769)[0x9003] = taken
    if offset:
        exif.get_ifd(0x8769)[0x9011] = offset
    out = io.BytesIO()
    Image.new("RGB", (width, 20), "red").save(out, "JPEG", exif=exif)
    return out.getvalue()


def at(text: str) -> datetime:
    return datetime.fromisoformat(text)


def upload(client: Client, pickup_id: str, folder_id: str, name: str, content: bytes) -> dict[str, Any]:
    response = client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/", {"file": SimpleUploadedFile(name, content)}
    )
    assert response.status_code == 201, response.content
    data: dict[str, Any] = response.json()
    return data


@pytest.fixture
def two_people() -> tuple[str, Client, str, Client, str]:
    pickup_id = new_pickup(Client())
    alice, bob = Client(), Client()
    alice_folder = join(alice, pickup_id, "Alice").json()["folder"]["id"]
    bob_folder = join(bob, pickup_id, "Bob").json()["folder"]["id"]
    return pickup_id, alice, alice_folder, bob, bob_folder


def test_photos_tell_when_they_were_taken(
    two_people: tuple[str, Client, str, Client, str], settings: Settings
) -> None:
    settings.TIME_ZONE = "Europe/Berlin"
    pickup_id, alice, folder, _, _ = two_people
    with_offset = upload(alice, pickup_id, folder, "a.jpg", photo("2026:06:13 18:30:00", "+02:00", 20))
    local = upload(alice, pickup_id, folder, "b.jpg", photo("2026:06:13 18:30:00", width=21))
    nothing = upload(alice, pickup_id, folder, "c.jpg", photo(width=22))
    unset_clock = upload(alice, pickup_id, folder, "d.jpg", photo("1970:01:01 00:00:00", width=23))
    assert at(with_offset["taken_at"]) == datetime(2026, 6, 13, 16, 30, tzinfo=UTC)
    # Without an offset: the server's zone, Berlin in summer time.
    assert at(local["taken_at"]) == datetime(2026, 6, 13, 16, 30, tzinfo=UTC)
    assert nothing["taken_at"] == nothing["uploaded_at"]
    assert unset_clock["taken_at"] == unset_clock["uploaded_at"]


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
def test_videos_tell_when_they_were_taken(
    two_people: tuple[str, Client, str, Client, str], tmp_path: Path
) -> None:
    pickup_id, alice, folder, _, _ = two_people
    path = tmp_path / "clip.mp4"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc=duration=0.3:size=64x48:rate=10"]
        + ["-metadata", "creation_time=2026-06-13T15:00:00.000000Z", "-c:v", "mpeg4", str(path)],
        check=True,
    )
    media = upload(alice, pickup_id, folder, "clip.mp4", path.read_bytes())
    assert at(media["taken_at"]) == datetime(2026, 6, 13, 15, 0, tzinfo=UTC)


def test_the_timeline_mixes_everyones_files_by_time(two_people: tuple[str, Client, str, Client, str]) -> None:
    pickup_id, alice, alice_folder, bob, bob_folder = two_people
    upload(alice, pickup_id, alice_folder, "late.jpg", photo("2026:06:13 22:00:00", "+00:00", 20))
    upload(bob, pickup_id, bob_folder, "early.jpg", photo("2026:06:13 10:00:00", "+00:00", 21))
    upload(alice, pickup_id, alice_folder, "noon.jpg", photo("2026:06:13 12:00:00", "+00:00", 22))
    timeline = alice.get(f"/api/pickups/{pickup_id}/media/").json()
    assert [(m["original_filename"], m["owner_name"]) for m in timeline] == [
        ("early.jpg", "Bob"),
        ("noon.jpg", "Alice"),
        ("late.jpg", "Alice"),
    ]
    assert [m["can_edit"] for m in timeline] == [False, True, True]
    assert Client().get(f"/api/pickups/{pickup_id}/media/").status_code == 403
    Pickup.objects.update(visibility="link")
    assert len(Client().get(f"/api/pickups/{pickup_id}/media/").json()) == 3


def test_older_files_get_their_time_at_startup(two_people: tuple[str, Client, str, Client, str]) -> None:
    pickup_id, alice, folder, _, _ = two_people
    upload(alice, pickup_id, folder, "a.jpg", photo("2026:06:13 18:30:00", "+02:00"))
    Media.objects.update(taken_at=None)  # from before the timeline
    call_command("create_thumbnails", stdout=io.StringIO())
    assert Media.objects.get().taken_at == datetime(2026, 6, 13, 16, 30, tzinfo=UTC)
