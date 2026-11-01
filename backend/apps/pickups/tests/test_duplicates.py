"""The same file twice in one member's folders is skipped."""

import io
from pathlib import Path
from typing import Any

import pytest
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client

from apps.pickups.models import Media

from .test_access import join, new_pickup, post

pytestmark = pytest.mark.django_db


def upload(client: Client, pickup_id: str, folder_id: str, content: bytes, name: str = "a.mp4") -> Any:
    return client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/", {"file": SimpleUploadedFile(name, content)}
    )


def chunked(client: Client, pickup_id: str, folder_id: str, content: bytes) -> Any:
    session = post(
        client,
        f"/api/pickups/{pickup_id}/folders/{folder_id}/upload-sessions/",
        {"file_name": "big.mp4", "file_size": len(content)},
    ).json()
    base = f"/api/upload-sessions/{session['id']}"
    client.post(f"{base}/chunks/", {"chunk_index": 0, "chunk": SimpleUploadedFile("c", content)})
    return client.post(f"{base}/finalize/")


def files_on_disk() -> list[Path]:
    return [path for path in Path(settings.MEDIA_ROOT).rglob("*") if path.is_file()]


def test_the_same_file_twice_is_skipped_in_all_of_ones_folders() -> None:
    pickup_id = new_pickup(Client())
    alice = Client()
    folder_id = join(alice, pickup_id, "Alice").json()["folder"]["id"]
    sub = post(alice, f"/api/pickups/{pickup_id}/folders/{folder_id}/subfolders/", {"name": "Strand"}).json()
    assert upload(alice, pickup_id, folder_id, b"same", "first.mp4").status_code == 201
    stored = files_on_disk()

    again = upload(alice, pickup_id, sub["id"], b"same", "copy.mp4")
    assert again.status_code == 409
    assert again.json() == {"error": "Already uploaded: “first.mp4” in “Alice”."}
    assert chunked(alice, pickup_id, sub["id"], b"same").status_code == 409
    assert files_on_disk() == stored  # nothing new kept
    assert upload(alice, pickup_id, folder_id, b"different").status_code == 201

    bob = Client()
    bob_folder = join(bob, pickup_id, "Bob").json()["folder"]["id"]
    assert upload(bob, pickup_id, bob_folder, b"same").status_code == 201  # someone else's copy
    assert Media.objects.count() == 3


def test_older_files_get_a_fingerprint_at_startup() -> None:
    pickup_id = new_pickup(Client())
    alice = Client()
    folder_id = join(alice, pickup_id, "Alice").json()["folder"]["id"]
    upload(alice, pickup_id, folder_id, b"old")
    Media.objects.update(sha256="")  # from before fingerprints existed
    out = io.StringIO()
    call_command("create_thumbnails", stdout=out)
    assert out.getvalue() == "Created 0 thumbnails, fingerprinted 1 files\n"
    assert chunked(alice, pickup_id, folder_id, b"old").status_code == 409
