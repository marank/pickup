"""A read-only date (uploads and changes stop) before the optional deletion date."""

from datetime import timedelta
from typing import Any

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from django.utils import timezone

from apps.pickups.models import Pickup

from .test_access import join, new_pickup, post, settings_patch

pytestmark = pytest.mark.django_db


def in_days(days: int) -> str:
    return (timezone.now() + timedelta(days=days)).isoformat()


def upload(client: Client, pickup_id: str, folder_id: str) -> Any:
    return client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/", {"file": SimpleUploadedFile("a.jpg", b"x")}
    )


def test_both_dates_are_optional_and_read_only_comes_first() -> None:
    creator = Client()
    pickup_id = new_pickup(creator)
    response = settings_patch(creator, pickup_id, read_only_at=in_days(3), expires_at=in_days(10))
    assert response.status_code == 200
    assert response.json()["read_only_at"] and response.json()["is_read_only"] is False
    late = settings_patch(creator, pickup_id, read_only_at=in_days(11))  # after the stored deletion
    assert late.json() == {"read_only_at": ["Choose a day before the pickup is deleted."]}
    assert settings_patch(creator, pickup_id, read_only_at=in_days(-1)).status_code == 400
    assert settings_patch(creator, pickup_id, expires_at=None).status_code == 200
    assert settings_patch(creator, pickup_id, read_only_at=in_days(30)).status_code == 200
    assert settings_patch(creator, pickup_id, read_only_at=None).json()["read_only_at"] is None


def test_a_read_only_pickup_can_be_seen_but_not_changed() -> None:
    creator = Client()
    pickup_id = new_pickup(creator)
    alice = Client()
    folder_id = join(alice, pickup_id, "Alice").json()["folder"]["id"]
    media = upload(alice, pickup_id, folder_id).json()
    Pickup.objects.update(read_only_at=timezone.now() - timedelta(minutes=1))

    assert alice.get(f"/api/pickups/{pickup_id}/").json()["is_read_only"] is True
    [folder] = alice.get(f"/api/pickups/{pickup_id}/folders/").json()
    assert (folder["is_own"], folder["can_edit"]) == (True, False)
    assert alice.get(f"/api/files/{media['id']}/").status_code == 200  # still downloadable

    assert upload(alice, pickup_id, folder_id).status_code == 403
    sub = post(alice, f"/api/pickups/{pickup_id}/folders/{folder_id}/subfolders/", {"name": "Strand"})
    assert sub.status_code == 403
    session = post(
        alice,
        f"/api/pickups/{pickup_id}/folders/{folder_id}/upload-sessions/",
        {"file_name": "big.mp4", "file_size": 30_000_000},
    )
    assert session.status_code == 403
    media_url = f"/api/pickups/{pickup_id}/folders/{folder_id}/media/{media['id']}/"
    assert alice.delete(media_url).status_code == 403
    rename = alice.patch(
        f"/api/pickups/{pickup_id}/session/", {"folder_name": "Neu"}, content_type="application/json"
    )
    assert rename.status_code == 403
    assert "read-only" in join(Client(), pickup_id, "Bob").json()["error"]

    assert creator.delete(media_url).status_code == 204  # the creator still moderates
