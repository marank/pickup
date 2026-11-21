"""Errors while finishing an upload reach the browser only as a general message."""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client

from apps.pickups.api import uploads
from apps.pickups.models import UploadSession

pytestmark = pytest.mark.django_db

JSON = "application/json"


def test_a_failing_finalize_hides_its_details(monkeypatch: pytest.MonkeyPatch) -> None:
    creator = Client()
    pickup_id = creator.post("/api/pickups/", {}, content_type=JSON).json()["id"]
    alice = Client()
    folder_id = alice.post(
        f"/api/pickups/{pickup_id}/join/", {"user_name": "Alice", "name": "Alice"}, content_type=JSON
    ).json()["folder"]["id"]
    body = {"file_name": "clip.mp4", "file_size": 4, "media_type": "video", "chunk_size": 8}
    session = alice.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/upload-sessions/", body, content_type=JSON
    ).json()
    alice.post(
        f"/api/upload-sessions/{session['id']}/chunks/",
        {"chunk_index": 0, "chunk": SimpleUploadedFile("c", b"abcd")},
    )

    def broken(_: UploadSession) -> None:
        raise OSError(28, "No space left on device", "/data/media/secret/clip.mp4")

    monkeypatch.setattr(uploads, "finalize_upload", broken)
    response = alice.post(f"/api/upload-sessions/{session['id']}/finalize/")

    assert response.status_code == 500
    assert "/data" not in response.json()["error"]
    stored = alice.get(f"/api/upload-sessions/{session['id']}/").json()
    assert stored["status"] == "error"
    assert "/data" not in stored["error_message"]
