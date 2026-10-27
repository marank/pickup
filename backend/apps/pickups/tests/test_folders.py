from typing import Any

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client

from apps.pickups.models import Folder, Media, Pickup

pytestmark = pytest.mark.django_db


def create_pickup(client: Client) -> str:
    pickup_id: str = client.post("/api/pickups/").json()["id"]
    return pickup_id


def join(client: Client, pickup_id: str, name: str) -> str:
    response = client.post(
        f"/api/pickups/{pickup_id}/join/",
        {"name": f"{name}'s Fotos", "user_name": name},
        content_type="application/json",
    )
    folder_id: str = response.json()["folder"]["id"]
    return folder_id


def folder_url(pickup_id: str, folder_id: str, suffix: str = "") -> str:
    return f"/api/pickups/{pickup_id}/folders/{folder_id}/{suffix}"


def new_subfolder(client: Client, pickup_id: str, parent_id: str, name: str) -> Any:
    return client.post(
        folder_url(pickup_id, parent_id, "subfolders/"), {"name": name}, content_type="application/json"
    )


@pytest.fixture
def alice() -> tuple[Client, str, str]:
    """Alice joined a pickup; returns her client, the pickup id and her folder id."""
    client = Client()
    pickup_id = create_pickup(Client())
    return client, pickup_id, join(client, pickup_id, "Alice")


def test_owner_builds_a_folder_tree(alice: tuple[Client, str, str]) -> None:
    client, pickup_id, root_id = alice
    response = new_subfolder(client, pickup_id, root_id, "  Urlaub März  ")
    assert response.status_code == 201
    urlaub = response.json()
    assert urlaub["name"] == "Urlaub März"
    assert urlaub["parent"] == root_id
    assert urlaub["root"] == root_id
    assert urlaub["can_edit"] is True
    assert urlaub["user_name"] == "Alice"

    deeper = new_subfolder(client, pickup_id, urlaub["id"], "Strand").json()
    assert deeper["parent"] == urlaub["id"]
    assert deeper["root"] == root_id

    folders = client.get(f"/api/pickups/{pickup_id}/folders/").json()
    by_id = {f["id"]: f for f in folders}
    assert by_id[root_id]["subfolder_count"] == 1
    assert by_id[urlaub["id"]]["subfolder_count"] == 1
    assert by_id[root_id]["parent"] is None


def test_names_must_be_unique_per_folder_and_valid(alice: tuple[Client, str, str]) -> None:
    client, pickup_id, root_id = alice
    assert new_subfolder(client, pickup_id, root_id, "Strand").status_code == 201
    duplicate = new_subfolder(client, pickup_id, root_id, "strand")
    assert duplicate.status_code == 400
    assert "already exists" in duplicate.json()["error"]
    assert new_subfolder(client, pickup_id, root_id, "a/b").status_code == 400
    assert new_subfolder(client, pickup_id, root_id, "..").status_code == 400
    assert new_subfolder(client, pickup_id, root_id, "   ").status_code == 400


def test_subfolders_belong_to_the_owner_only(alice: tuple[Client, str, str]) -> None:
    client, pickup_id, root_id = alice
    sub_id = new_subfolder(client, pickup_id, root_id, "Strand").json()["id"]
    bob = Client()
    join(bob, pickup_id, "Bob")

    assert new_subfolder(bob, pickup_id, sub_id, "Mine").status_code == 403
    rename = bob.patch(folder_url(pickup_id, sub_id), {"name": "x"}, content_type="application/json")
    assert rename.status_code == 403
    assert bob.delete(folder_url(pickup_id, sub_id)).status_code == 403
    upload = bob.post(folder_url(pickup_id, sub_id, "media/"), {"file": SimpleUploadedFile("a.jpg", b"x")})
    assert upload.status_code == 403
    # ... but everyone may look.
    assert bob.get(folder_url(pickup_id, sub_id, "media/")).status_code == 200
    assert bob.get(folder_url(pickup_id, sub_id)).json()["can_edit"] is False


def test_owner_uploads_into_subfolders(alice: tuple[Client, str, str]) -> None:
    client, pickup_id, root_id = alice
    sub_id = new_subfolder(client, pickup_id, root_id, "Strand").json()["id"]
    response = client.post(
        folder_url(pickup_id, sub_id, "media/"), {"file": SimpleUploadedFile("a.jpg", b"x")}
    )
    assert response.status_code == 201
    assert response.json()["owner_name"] == "Alice"
    assert response.json()["can_edit"] is True
    all_media = client.get(f"/api/pickups/{pickup_id}/media/").json()
    assert [m["folder"] for m in all_media] == [sub_id]


def test_rename_folders(alice: tuple[Client, str, str]) -> None:
    client, pickup_id, root_id = alice
    sub_id = new_subfolder(client, pickup_id, root_id, "Strand").json()["id"]
    new_subfolder(client, pickup_id, root_id, "Berge")

    def rename(folder_id: str, name: str) -> Any:
        return client.patch(folder_url(pickup_id, folder_id), {"name": name}, content_type="application/json")

    assert rename(sub_id, "Meer").json()["name"] == "Meer"
    assert rename(sub_id, "Meer").status_code == 200  # same name again is fine
    assert rename(sub_id, "berge").status_code == 400
    assert rename(root_id, "Alice 2026").json()["name"] == "Alice 2026"
    join(Client(), pickup_id, "Bob")
    assert rename(root_id, "Bob's Fotos").status_code == 400


def test_delete_subfolder_removes_everything_below(alice: tuple[Client, str, str], settings: Any) -> None:
    client, pickup_id, root_id = alice
    sub_id = new_subfolder(client, pickup_id, root_id, "Strand").json()["id"]
    deeper_id = new_subfolder(client, pickup_id, sub_id, "Tag 1").json()["id"]
    client.post(folder_url(pickup_id, deeper_id, "media/"), {"file": SimpleUploadedFile("a.jpg", b"x")})
    stored = Media.objects.get().file

    assert client.delete(folder_url(pickup_id, root_id)).status_code == 400
    assert client.delete(folder_url(pickup_id, sub_id)).status_code == 204
    assert list(Folder.objects.values_list("id", flat=True)) == [Folder.objects.get(id=root_id).id]
    assert not Media.objects.exists()
    assert not stored.storage.exists(stored.name or "")


def test_creator_renames_the_pickup() -> None:
    creator = Client()
    pickup_id = create_pickup(creator)
    url = f"/api/pickups/{pickup_id}/"
    response = creator.patch(url, {"title": "Sommerfest"}, content_type="application/json")
    assert response.json()["title"] == "Sommerfest"

    member = Client()
    join(member, pickup_id, "Bob")
    assert member.patch(url, {"title": "Mine"}, content_type="application/json").status_code == 403
    assert Client().patch(url, {"title": "Mine"}, content_type="application/json").status_code == 403
    assert Pickup.objects.get().title == "Sommerfest"
