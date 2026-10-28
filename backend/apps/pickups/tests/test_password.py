"""Pickups protected with a password."""

from io import StringIO
from typing import Any

import pytest
from django.contrib.auth.hashers import check_password
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import CommandError, call_command
from django.test import Client

from apps.pickups.models import Member, Pickup
from apps.pickups.services.members import SESSION_KEY

from .test_access import new_pickup, post, settings_patch

pytestmark = pytest.mark.django_db

PASSWORD = "summer-24"


def join(client: Client, pickup_id: str, name: str, password: str = "") -> Any:
    body = {"user_name": name, "name": name, "password": password}
    return post(client, f"/api/pickups/{pickup_id}/join/", body)


def login(client: Client, pickup_id: str, member: Member, password: str = "") -> Any:
    body = {"access_key": member.access_key, "password": password}
    return post(client, f"/api/pickups/{pickup_id}/session/", body)


def detail(client: Client, pickup_id: str) -> Any:
    return client.get(f"/api/pickups/{pickup_id}/").json()


@pytest.fixture
def protected() -> tuple[str, Client, Client, str]:
    """A pickup with a file in Bob's folder, then protected: (id, creator, bob, file url)."""
    creator = Client()
    pickup_id = new_pickup(creator, title="Party", creator_name="Anna")
    bob = Client()
    folder_id = join(bob, pickup_id, "Bob").json()["folder"]["id"]
    upload = bob.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/", {"file": SimpleUploadedFile("a.jpg", b"img")}
    )
    settings_patch(creator, pickup_id, visibility="link")
    assert settings_patch(creator, pickup_id, password=PASSWORD).status_code == 200
    return pickup_id, creator, bob, upload.json()["file"]


def test_the_share_link_alone_shows_nothing_of_a_protected_pickup(protected: Any) -> None:
    pickup_id, _, _, file_url = protected
    stranger = Client()
    data = detail(stranger, pickup_id)
    assert (data["password_required"], data["title"], data["can_view"]) == (True, "", False)
    assert (data["folder_count"], data["media_count"], data["has_password"]) == (0, 0, False)
    # Not even with "anyone with the link":
    for url in ["folders/", "media/", "download/"]:
        assert stranger.get(f"/api/pickups/{pickup_id}/{url}").status_code == 403, url
    assert stranger.get(file_url).status_code == 404


def test_setting_the_password_logs_everyone_else_out(protected: Any) -> None:
    pickup_id, creator, bob, file_url = protected
    creator_view = detail(creator, pickup_id)
    assert (creator_view["is_member"], creator_view["has_password"], creator_view["title"]) == (
        True,
        True,
        "Party",
    )
    assert creator.get(file_url).status_code == 200
    bob_view = detail(bob, pickup_id)
    assert (bob_view["is_member"], bob_view["password_required"]) == (False, True)
    assert bob.get(file_url).status_code == 404

    bob_member = Member.objects.get(user_name="Bob")
    assert login(bob, pickup_id, bob_member).json() == {"error": "Wrong password."}
    assert login(bob, pickup_id, bob_member, "wrong").status_code == 403
    assert login(bob, pickup_id, bob_member, PASSWORD).status_code == 200
    assert detail(bob, pickup_id)["is_member"] is True
    assert login(bob, pickup_id, bob_member).status_code == 200  # already logged in as Bob

    # Changing it logs out again; removing it keeps everyone in.
    settings_patch(creator, pickup_id, password="autumn-25")
    assert detail(bob, pickup_id)["is_member"] is False
    assert login(bob, pickup_id, bob_member, "autumn-25").status_code == 200
    settings_patch(creator, pickup_id, password="")
    assert detail(bob, pickup_id)["is_member"] is True
    assert detail(Client(), pickup_id)["title"] == "Party"


def test_joining_needs_the_password_first(protected: Any) -> None:
    pickup_id, *_ = protected
    stranger = Client()
    # A taken name with a wrong password is the same answer: nothing is given away.
    assert join(stranger, pickup_id, "Bob").json() == {"error": "Wrong password."}
    assert join(stranger, pickup_id, "Carl", "wrong").status_code == 403
    assert join(stranger, pickup_id, "Carl", PASSWORD).status_code == 201
    assert detail(stranger, pickup_id)["can_view"] is True


def test_the_link_preview_says_a_password_is_needed(protected: Any) -> None:
    pickup_id, creator, _, _ = protected
    anna = Member.objects.get(is_creator=True)
    url = f"/api/pickups/{pickup_id}/session/preview/"
    assert post(Client(), url, {"access_key": anna.access_key}).json()["password_required"] is True
    assert post(creator, url, {"access_key": anna.access_key}).json()["password_required"] is False


def test_passwords_are_hashed_and_need_four_characters(protected: Any) -> None:
    pickup_id, creator, *_ = protected
    stored = Pickup.objects.get(id=pickup_id).password
    assert PASSWORD not in stored and check_password(PASSWORD, stored)  # a hash (Argon2 outside tests)
    assert settings_patch(creator, pickup_id, password="abc").status_code == 400
    assert "password" not in detail(creator, pickup_id)


def test_logins_from_before_versions_still_count() -> None:
    creator = Client()
    pickup_id = new_pickup(creator, creator_name="Anna")
    session = creator.session
    anna = Member.objects.get(is_creator=True)
    session[SESSION_KEY] = {pickup_id: str(anna.id)}  # the old format: just the member id
    session.save()
    assert detail(creator, pickup_id)["is_member"] is True


def test_the_server_operator_can_remove_a_forgotten_password(protected: Any) -> None:
    pickup_id, *_ = protected
    out = StringIO()
    call_command("pickup_password", pickup_id, stdout=out)
    assert out.getvalue() == "“Party” has a password.\n"
    call_command("pickup_password", pickup_id, "--remove", stdout=out)
    assert Pickup.objects.get(id=pickup_id).password == ""
    assert "removed" in out.getvalue()
    with pytest.raises(CommandError):
        call_command("pickup_password", "nope")
