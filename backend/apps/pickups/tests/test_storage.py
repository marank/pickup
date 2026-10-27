"""Storage limits from .env, per pickup and per participant, and the admin command."""

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import CommandError, call_command
from django.test import Client
from pytest_django.fixtures import Settings

from apps.pickups.models import Pickup
from config.env import parse_size

pytestmark = pytest.mark.django_db

JSON = "application/json"


@pytest.fixture
def limits(settings: Settings) -> Settings:
    settings.PICKUP_STORAGE_LIMIT = 30
    settings.MEMBER_STORAGE_LIMIT = 20
    return settings


def setup_pickup() -> tuple[Client, str, Client, str]:
    creator = Client()
    pickup_id: str = creator.post("/api/pickups/", {}, content_type=JSON).json()["id"]
    alice = Client()
    response = alice.post(
        f"/api/pickups/{pickup_id}/join/", {"user_name": "Alice", "name": "Alice"}, content_type=JSON
    )
    return creator, pickup_id, alice, response.json()["folder"]["id"]


def upload(client: Client, pickup_id: str, folder_id: str, size: int) -> object:
    return client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/",
        {"file": SimpleUploadedFile("a.jpg", b"x" * size)},
    )


def test_sizes_from_env() -> None:
    assert parse_size("20GB") == 20 * 1024**3
    assert parse_size(" 1.5 mb ") == int(1.5 * 1024**2)
    assert parse_size("0") == 0
    assert parse_size("512K") == 512 * 1024
    with pytest.raises(ValueError, match="not a size"):
        parse_size("lots")


def test_uploads_stop_at_the_participant_and_the_pickup_limit(limits: Settings) -> None:
    creator, pickup_id, alice, folder_id = setup_pickup()
    sub = alice.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/subfolders/", {"name": "Beach"}, content_type=JSON
    ).json()["id"]
    assert upload(alice, pickup_id, folder_id, 12).status_code == 201  # type: ignore[attr-defined]
    response = upload(alice, pickup_id, sub, 9)  # subfolders count for their owner
    assert response.status_code == 413  # type: ignore[attr-defined]
    assert "8 B of 20 B left for your folders" in response.json()["error"]  # type: ignore[attr-defined]
    assert upload(alice, pickup_id, sub, 8).status_code == 201  # type: ignore[attr-defined]

    bob = Client()
    bob_folder = bob.post(
        f"/api/pickups/{pickup_id}/join/", {"user_name": "Bob", "name": "Bob"}, content_type=JSON
    ).json()["folder"]["id"]
    response = upload(bob, pickup_id, bob_folder, 11)
    assert "left for this pickup" in response.json()["error"]  # type: ignore[attr-defined]

    storage = alice.get(f"/api/pickups/{pickup_id}/").json()["storage"]
    assert storage == {"used": 20, "limit": 30, "own_used": 20, "own_limit": 20}
    assert creator.get(f"/api/pickups/{pickup_id}/").json()["storage"]["own_used"] is None
    assert Client().get(f"/api/pickups/{pickup_id}/").json()["storage"]["used"] == 0  # private


def test_chunked_uploads_reserve_their_size(limits: Settings) -> None:
    _, pickup_id, alice, folder_id = setup_pickup()
    url = f"/api/pickups/{pickup_id}/folders/{folder_id}/upload-sessions/"
    body = {"file_name": "clip.mp4", "file_size": 15, "media_type": "video", "chunk_size": 16}
    session = alice.post(url, body, content_type=JSON).json()
    second = alice.post(url, body, content_type=JSON)  # 15 + 15 > 20 while the first is pending
    assert second.status_code == 413
    assert alice.get(f"/api/pickups/{pickup_id}/").json()["storage"]["own_used"] == 15

    alice.post(
        f"/api/upload-sessions/{session['id']}/chunks/",
        {"chunk_index": 0, "chunk": SimpleUploadedFile("c", b"x" * 15)},
    )
    Pickup.objects.filter(id=pickup_id).update(member_storage_limit=10)  # lowered meanwhile
    response = alice.post(f"/api/upload-sessions/{session['id']}/finalize/")
    assert response.status_code == 413
    assert alice.get(f"/api/upload-sessions/{session['id']}/").json()["status"] == "error"


def test_admin_changes_limits_per_pickup(limits: Settings) -> None:
    _, pickup_id, alice, folder_id = setup_pickup()
    upload(alice, pickup_id, folder_id, 10)

    out = io.StringIO()
    call_command("storage_limits", pickup_id, stdout=out)
    assert "All files:        10 B of 30 B (default)" in out.getvalue()
    assert "Alice: 10 B of 20 B" in out.getvalue()

    out = io.StringIO()
    call_command("storage_limits", pickup_id, "--pickup", "unlimited", "--member", "1KB", stdout=out)
    assert "Limits changed." in out.getvalue()
    pickup = Pickup.objects.get(id=pickup_id)
    assert (pickup.storage_limit, pickup.member_storage_limit) == (0, 1024)
    assert "of unlimited (set for this pickup)" in out.getvalue()
    assert upload(alice, pickup_id, folder_id, 500).status_code == 201  # type: ignore[attr-defined]

    call_command(
        "storage_limits", pickup_id, "--pickup", "default", "--member", "default", stdout=io.StringIO()
    )
    pickup.refresh_from_db()
    assert (pickup.storage_limit, pickup.member_storage_limit) == (None, None)

    with pytest.raises(CommandError, match="not a size"):
        call_command("storage_limits", pickup_id, "--member", "huge")
    with pytest.raises(CommandError, match="No pickup"):
        call_command("storage_limits", "00000000-0000-4000-8000-000000000000")


def test_the_command_shows_the_default_without_participants(limits: Settings) -> None:
    pickup_id = Client().post("/api/pickups/", {}, content_type=JSON).json()["id"]
    out = io.StringIO()
    call_command("storage_limits", pickup_id, stdout=out)
    assert "Per participant:  20 B (default)" in out.getvalue()
