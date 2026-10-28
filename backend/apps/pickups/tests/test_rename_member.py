"""Participants change their own name."""

from typing import Any

import pytest
from django.test import Client

from apps.pickups.models import Folder

from .test_access import join, new_pickup, post, settings_patch

pytestmark = pytest.mark.django_db

JSON = "application/json"


def rename(client: Client, pickup_id: str, user_name: str) -> Any:
    return client.patch(f"/api/pickups/{pickup_id}/session/", {"user_name": user_name}, content_type=JSON)


def test_members_change_their_name_and_their_folders_follow() -> None:
    creator = Client()
    pickup_id = new_pickup(creator, creator_name="Anna")
    root = Folder.objects.get(name="Anna")
    post(creator, f"/api/pickups/{pickup_id}/folders/{root.id}/subfolders/", {"name": "Beach"})

    response = rename(creator, pickup_id, "  Anna  Maria ")
    assert response.status_code == 200
    assert response.json()["member_name"] == "Anna Maria"
    folders = {f.name: f.user_name for f in Folder.objects.filter(pickup_id=pickup_id)}
    # The top-level folder was named after her, so it is renamed with her.
    assert folders == {"Anna Maria": "Anna Maria", "Beach": "Anna Maria"}


def test_a_folder_with_its_own_name_keeps_it() -> None:
    creator = Client()
    pickup_id = new_pickup(creator)
    guest = Client()
    post(guest, f"/api/pickups/{pickup_id}/join/", {"user_name": "Bob", "name": "Bob's photos"})
    assert rename(guest, pickup_id, "Robert").status_code == 200
    folder = Folder.objects.get(pickup_id=pickup_id)
    assert (folder.name, folder.user_name) == ("Bob's photos", "Robert")


def test_names_stay_unique_and_need_a_session() -> None:
    creator = Client()
    pickup_id = new_pickup(creator, creator_name="Anna")
    guest = Client()
    join(guest, pickup_id, "Bob")
    assert rename(guest, pickup_id, "anna").json() == {"error": "This name is already taken in this pickup."}
    assert rename(guest, pickup_id, "   ").status_code == 400
    assert rename(guest, pickup_id, "BOB").status_code == 200  # own name in another spelling is fine
    assert rename(Client(), pickup_id, "Carl").status_code == 403


def test_a_closed_pickup_keeps_the_names_of_participants() -> None:
    creator = Client()
    pickup_id = new_pickup(creator, creator_name="Anna")
    guest = Client()
    join(guest, pickup_id, "Bob")
    settings_patch(creator, pickup_id, visibility="creator")
    assert rename(guest, pickup_id, "Robert").status_code == 403
    assert rename(creator, pickup_id, "Annie").status_code == 200
