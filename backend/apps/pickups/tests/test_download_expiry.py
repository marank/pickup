"""ZIP downloads and expiry dates."""

import io
import zipfile
from datetime import timedelta
from typing import Any
from uuid import UUID

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client
from django.utils import timezone

from apps.pickups.models import Media, Pickup
from apps.pickups.services.archive import safe_name

pytestmark = pytest.mark.django_db

JSON = "application/json"


def new_pickup(client: Client, **body: str) -> str:
    pickup_id: str = client.post("/api/pickups/", body, content_type=JSON).json()["id"]
    return pickup_id


def join(client: Client, pickup_id: str, name: str) -> str:
    response = client.post(
        f"/api/pickups/{pickup_id}/join/", {"user_name": name, "name": name}, content_type=JSON
    )
    folder_id: str = response.json()["folder"]["id"]
    return folder_id


def upload(client: Client, pickup_id: str, folder_id: str, name: str, content: bytes) -> str:
    response = client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/", {"file": SimpleUploadedFile(name, content)}
    )
    media_id: str = response.json()["id"]
    return media_id


def subfolder(client: Client, pickup_id: str, folder_id: str, name: str) -> str:
    response = client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/subfolders/", {"name": name}, content_type=JSON
    )
    sub_id: str = response.json()["id"]
    return sub_id


def unzip(response: Any) -> dict[str, bytes]:
    assert response.status_code == 200
    assert response["Content-Type"] == "application/zip"
    data = b"".join(response.streaming_content)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        return {info.filename: archive.read(info) for info in archive.infolist()}


@pytest.fixture
def pickup() -> tuple[Client, str, str, str]:
    """Alice with a file, a duplicate name and a subfolder; Bob with one file."""
    creator = Client()
    pickup_id = new_pickup(creator, title="Summer / Party")
    alice = Client()
    alice_folder = join(alice, pickup_id, "Alice")
    upload(alice, pickup_id, alice_folder, "beach.jpg", b"one")
    upload(alice, pickup_id, alice_folder, "beach.jpg", b"two")
    beach = subfolder(alice, pickup_id, alice_folder, "Beach")
    upload(alice, pickup_id, beach, "wave.jpg", b"wave")
    subfolder(alice, pickup_id, alice_folder, "Empty")
    bob = Client()
    upload(bob, pickup_id, join(bob, pickup_id, "Bob"), "drone.mp4", b"video")
    return alice, pickup_id, alice_folder, beach


def test_whole_pickup_as_zip(pickup: tuple[Client, str, str, str]) -> None:
    alice, pickup_id, _, _ = pickup
    response = alice.get(f"/api/pickups/{pickup_id}/download/")
    assert response["Content-Disposition"] == "attachment; filename*=UTF-8''Summer%20_%20Party.zip"
    assert unzip(response) == {
        "Alice/": b"",
        "Alice/beach.jpg": b"one",
        "Alice/beach (2).jpg": b"two",
        "Alice/Beach/": b"",
        "Alice/Beach/wave.jpg": b"wave",
        "Alice/Empty/": b"",
        "Bob/": b"",
        "Bob/drone.mp4": b"video",
    }


def test_selected_folders_and_files(pickup: tuple[Client, str, str, str]) -> None:
    alice, pickup_id, alice_folder, beach = pickup
    one = Media.objects.filter(folder_id=alice_folder).order_by("uploaded_at").first()
    assert one is not None
    response = alice.get(f"/api/pickups/{pickup_id}/download/?folders={beach}&media={one.id}")
    assert unzip(response) == {"Beach/": b"", "Beach/wave.jpg": b"wave", "beach.jpg": b"one"}

    single = alice.get(f"/api/pickups/{pickup_id}/download/?folders={beach}")
    assert single["Content-Disposition"] == "attachment; filename*=UTF-8''Beach.zip"


def test_downloads_follow_visibility_and_reject_bad_input(pickup: tuple[Client, str, str, str]) -> None:
    _, pickup_id, _, _ = pickup
    stranger = Client()
    assert stranger.get(f"/api/pickups/{pickup_id}/download/").status_code == 403
    alice = pickup[0]
    assert alice.get(f"/api/pickups/{pickup_id}/download/?folders=nope").status_code == 400
    other = "00000000-0000-4000-8000-000000000000"
    assert alice.get(f"/api/pickups/{pickup_id}/download/?media={other}").status_code == 400


def test_names_inside_the_archive_are_safe() -> None:
    assert [safe_name(n) for n in ["a/b", "..", "  ", "x\\y", "ok.jpg"]] == ["a_b", "_", "_", "x_y", "ok.jpg"]


def test_the_creator_sets_an_expiry_date_in_the_future() -> None:
    creator = Client()
    pickup_id = new_pickup(creator)
    url = f"/api/pickups/{pickup_id}/"
    past = (timezone.now() - timedelta(days=1)).isoformat()
    assert "expires_at" in creator.patch(url, {"expires_at": past}, content_type=JSON).json()
    soon = timezone.now() + timedelta(days=7)
    response = creator.patch(url, {"expires_at": soon.isoformat()}, content_type=JSON)
    assert response.status_code == 200
    assert response.json()["expires_at"] is not None
    assert creator.patch(url, {"expires_at": None}, content_type=JSON).json()["expires_at"] is None


def test_expired_pickups_disappear_and_are_deleted_by_the_job(
    django_capture_on_commit_callbacks: Any,
) -> None:
    creator = Client()
    pickup_id = new_pickup(creator, creator_name="Anna")
    folder_id = creator.get(f"/api/pickups/{pickup_id}/folders/").json()[0]["id"]
    media_id = upload(creator, pickup_id, folder_id, "a.jpg", b"x")
    stored = Media.objects.get().file
    keep = new_pickup(Client())
    Pickup.objects.filter(id=pickup_id).update(expires_at=timezone.now() - timedelta(minutes=1))

    assert creator.get(f"/api/pickups/{pickup_id}/").status_code == 404
    assert creator.get(f"/api/pickups/{pickup_id}/folders/{folder_id}/").status_code == 404
    assert creator.get(f"/api/files/{media_id}/").status_code == 404

    out = io.StringIO()
    with django_capture_on_commit_callbacks(execute=True):
        call_command("delete_expired_pickups", stdout=out)
    assert "1 files" in out.getvalue()
    assert list(Pickup.objects.values_list("id", flat=True)) == [UUID(keep)]
    assert not stored.storage.exists(stored.name or "")
