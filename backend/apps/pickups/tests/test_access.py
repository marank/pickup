"""Privacy, join policies, e-mail identity, invitations and moderation."""

import os
from datetime import timedelta
from typing import Any

import pytest
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.mail import EmailMultiAlternatives
from django.test import Client
from django.utils import timezone
from pytest_django.fixtures import Settings

from apps.pickups.models import Folder, Media, Member, Pickup, UploadSession
from apps.pickups.services.identity import email_hash

pytestmark = pytest.mark.django_db

JSON = "application/json"


def post(client: Client, url: str, data: dict[str, Any] | None = None) -> Any:
    return client.post(url, data or {}, content_type=JSON)


def new_pickup(client: Client, **body: str) -> str:
    response = post(client, "/api/pickups/", body)
    assert response.status_code == 201
    pickup_id: str = response.json()["id"]
    return pickup_id


def join(client: Client, pickup_id: str, name: str, email: str = "") -> Any:
    return post(client, f"/api/pickups/{pickup_id}/join/", {"user_name": name, "name": name, "email": email})


def settings_patch(client: Client, pickup_id: str, **changes: Any) -> Any:
    return client.patch(f"/api/pickups/{pickup_id}/", changes, content_type=JSON)


def personal_link_from(message: Any) -> str:
    lines: list[str] = message.body.splitlines()
    return next(line for line in lines if "/member/" in line).strip()


def sign_in_with(client: Client, link: str) -> None:
    pickup_id, key = link.split("/pickup/")[1].split("/member/")
    response = post(client, f"/api/pickups/{pickup_id}/session/", {"access_key": key})
    assert response.status_code == 200


@pytest.fixture
def creator() -> Client:
    return Client()


# --- visibility ----------------------------------------------------------------


def test_private_by_default_contents_and_files_need_membership(creator: Client) -> None:
    pickup_id = new_pickup(creator, title="Party")
    alice = Client()
    folder_id = join(alice, pickup_id, "Alice").json()["folder"]["id"]
    upload = alice.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/", {"file": SimpleUploadedFile("a.jpg", b"img")}
    )
    file_url = upload.json()["file"]
    assert file_url == f"/api/files/{upload.json()['id']}/"

    stranger = Client()
    detail = stranger.get(f"/api/pickups/{pickup_id}/").json()
    assert detail["title"] == "Party"
    assert (detail["can_view"], detail["is_member"], detail["folder_count"], detail["media_count"]) == (
        False,
        False,
        0,
        0,
    )
    for url in [
        f"/api/pickups/{pickup_id}/folders/",
        f"/api/pickups/{pickup_id}/media/",
        f"/api/pickups/{pickup_id}/folders/{folder_id}/",
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/",
    ]:
        assert stranger.get(url).status_code == 403, url
    private = stranger.get(file_url)
    missing = stranger.get("/api/files/00000000-0000-4000-8000-000000000000/")
    # Nobody learns whether a file exists: missing and private answer exactly alike.
    assert (private.status_code, private.content) == (missing.status_code, missing.content) == (404, b"")
    assert stranger.get("/api/").status_code == 404  # no API root listing the endpoints

    assert b"".join(alice.get(file_url).streaming_content) == b"img"  # type: ignore[attr-defined]
    assert creator.get(file_url).status_code == 200

    assert settings_patch(creator, pickup_id, visibility="link").json()["visibility"] == "link"
    assert stranger.get(f"/api/pickups/{pickup_id}/folders/").status_code == 200
    assert stranger.get(file_url).status_code == 200


def test_files_are_handed_to_nginx_in_production(creator: Client, settings: Settings) -> None:
    settings.MEDIA_ACCEL_REDIRECT = True
    pickup_id = new_pickup(creator)
    alice = Client()
    folder_id = join(alice, pickup_id, "Alice").json()["folder"]["id"]
    media = alice.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/",
        {"file": SimpleUploadedFile("Strand Tag 1.jpg", b"x")},
    ).json()
    response = alice.get(media["file"])
    stored = Media.objects.get().file.name
    assert response["X-Accel-Redirect"] == f"/protected-media/{stored}"
    assert response["Content-Type"] == "image/jpeg"
    assert "Strand%20Tag%201.jpg" in response["Content-Disposition"]
    assert response["Cache-Control"] == "private, max-age=604800"  # a week: files never change


def test_a_closed_pickup_is_only_visible_to_the_creator(creator: Client) -> None:
    pickup_id = new_pickup(creator, creator_name="Anna")
    alice = Client()
    folder_id = join(alice, pickup_id, "Alice").json()["folder"]["id"]
    media = alice.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/", {"file": SimpleUploadedFile("a.jpg", b"x")}
    ).json()
    assert settings_patch(creator, pickup_id, visibility="creator").json()["visibility"] == "creator"

    detail = alice.get(f"/api/pickups/{pickup_id}/").json()
    assert (detail["is_member"], detail["can_view"], detail["media_count"]) == (True, False, 0)
    assert alice.get(f"/api/pickups/{pickup_id}/folders/").status_code == 403
    assert alice.get(media["file"]).status_code == 404
    upload = alice.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/", {"file": SimpleUploadedFile("b.jpg", b"y")}
    )
    assert upload.status_code == 403
    assert "closed" in join(Client(), pickup_id, "Bob").json()["error"]

    assert creator.get(f"/api/pickups/{pickup_id}/folders/").status_code == 200
    assert creator.get(media["file"]).status_code == 200
    item = creator.get(f"/api/pickups/{pickup_id}/folders/{folder_id}/media/").json()[0]
    assert (item["can_edit"], item["can_delete"]) == (False, True)


def test_the_creator_deletes_the_pickup_for_good(
    creator: Client, django_capture_on_commit_callbacks: Any
) -> None:
    pickup_id = new_pickup(creator)
    alice = Client()
    folder_id = join(alice, pickup_id, "Alice").json()["folder"]["id"]
    alice.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/", {"file": SimpleUploadedFile("a.jpg", b"x")}
    )
    stored = Media.objects.get().file
    session = post(
        alice,
        f"/api/pickups/{pickup_id}/folders/{folder_id}/upload-sessions/",
        {"file_name": "big.mp4", "file_size": 30, "media_type": "video", "chunk_size": 16},
    ).json()
    chunks_dir = UploadSession.objects.get(id=session["id"]).chunks_dir
    assert os.path.isdir(chunks_dir)

    assert alice.delete(f"/api/pickups/{pickup_id}/").status_code == 403
    with django_capture_on_commit_callbacks(execute=True):
        assert creator.delete(f"/api/pickups/{pickup_id}/").status_code == 204
    assert not Pickup.objects.exists()
    assert not (Member.objects.exists() or Folder.objects.exists() or Media.objects.exists())
    assert not stored.storage.exists(stored.name or "")
    assert not os.path.exists(chunks_dir)
    assert creator.get(f"/api/pickups/{pickup_id}/").status_code == 404


# --- join policies and names ------------------------------------------------------


def test_names_are_compared_without_case_and_extra_spaces(creator: Client) -> None:
    pickup_id = new_pickup(creator)
    assert join(Client(), pickup_id, "Mark").status_code == 201
    for lookalike in ["mark", "  MARK ", "Mark"]:
        response = join(Client(), pickup_id, lookalike)
        assert response.status_code == 400, lookalike
        assert "user_name" in response.json()
    response = post(
        Client(), f"/api/pickups/{pickup_id}/join/", {"user_name": "Lena  Maria ", "name": " Lena  Maria"}
    )
    assert response.json()["folder"]["user_name"] == "Lena Maria"
    assert response.json()["folder"]["name"] == "Lena Maria"


def test_invite_only_and_closed_pickups_reject_strangers(creator: Client) -> None:
    pickup_id = new_pickup(creator)
    settings_patch(creator, pickup_id, join_policy="invite")
    response = join(Client(), pickup_id, "Bob")
    assert response.status_code == 403
    assert "invite-only" in response.json()["error"]
    settings_patch(creator, pickup_id, join_policy="closed")
    assert "doesn't take new participants" in join(Client(), pickup_id, "Bob").json()["error"]
    assert settings_patch(Client(), pickup_id, join_policy="open").status_code == 403


def test_a_named_creator_gets_a_folder_right_away(creator: Client) -> None:
    pickup_id = new_pickup(creator, creator_name="  Oma  Ilse ")
    detail = creator.get(f"/api/pickups/{pickup_id}/").json()
    assert (detail["has_folder"], detail["member_name"]) == (True, "Oma Ilse")
    folder = creator.get(f"/api/pickups/{pickup_id}/folders/").json()[0]
    assert (folder["name"], folder["user_name"], folder["can_edit"]) == ("Oma Ilse", "Oma Ilse", True)
    assert join(Client(), pickup_id, "oma ilse").status_code == 400  # the name is taken


def test_the_creator_can_get_an_own_folder_and_stays_creator(creator: Client) -> None:
    pickup_id = new_pickup(creator)
    settings_patch(creator, pickup_id, join_policy="closed")  # applies to new people, not to the creator
    response = join(creator, pickup_id, "Oma Ilse")
    assert response.status_code == 201
    member = Member.objects.get(is_creator=True)
    assert (member.user_name, member.folder_id is not None) == ("Oma Ilse", True)
    detail = creator.get(f"/api/pickups/{pickup_id}/").json()
    assert (detail["is_creator"], detail["has_folder"], detail["member_name"]) == (True, True, "Oma Ilse")
    assert "already have a folder" in join(creator, pickup_id, "Again").json()["error"]


# --- e-mail identity ------------------------------------------------------------


def test_addresses_are_stored_until_privacy_mode_is_switched_on(creator: Client) -> None:
    pickup_id = new_pickup(creator)
    assert creator.get(f"/api/pickups/{pickup_id}/").json()["email_privacy"] is False  # new: off
    join(Client(), pickup_id, "Bob", email=" Bob@Example.com ")
    bob = Member.objects.get(user_name="Bob")
    assert (bob.email, bob.email_hash) == ("bob@example.com", email_hash("bob@example.com"))
    assert len(bob.email_hash) == 64

    settings_patch(creator, pickup_id, email_privacy=True)  # switching on forgets plain addresses
    assert not Member.objects.exclude(email="").exists()
    assert Member.objects.get(user_name="Bob").email_hash == email_hash("bob@example.com")
    join(Client(), pickup_id, "Alice", email="alice@example.com")
    alice = Member.objects.get(user_name="Alice")
    assert (alice.email, alice.email_hash) == ("", email_hash("alice@example.com"))


def test_creators_personal_link_is_mailed_when_an_address_is_given(creator: Client) -> None:
    pickup_id = new_pickup(creator, title="Hochzeit", creator_name=" Anna ", creator_email="anna@example.com")
    member = Member.objects.get(is_creator=True)
    assert member.user_name == "Anna"
    assert mail.outbox[0].to == ["anna@example.com"]
    assert mail.outbox[0].subject == "Your new pickup “Hochzeit”"
    assert member.access_key in mail.outbox[0].body
    assert member.link_sent_at is not None
    assert creator.get(f"/api/pickups/{pickup_id}/").json()["member_name"] == "Anna"
    new_pickup(Client())  # no address, no mail
    assert len(mail.outbox) == 1


def test_link_mails_have_an_html_version_with_the_embedded_logo(creator: Client) -> None:
    new_pickup(creator, creator_name="Anna & Ben", creator_email="anna@example.com")
    member = Member.objects.get(is_creator=True)
    sent = mail.outbox[0]
    assert isinstance(sent, EmailMultiAlternatives)
    html, _ = sent.alternatives[0]
    assert member.access_key in str(html)
    assert "Hello Anna &amp; Ben," in str(html)  # names are escaped
    message = sent.message()
    logo = next(part for part in message.walk() if part.get_content_type() == "image/png")
    assert logo["Content-ID"] == "<logo@pickup>"
    assert 'src="cid:logo@pickup"' in str(html)
    # The long link stays in one piece in the raw mail (no quoted-printable "=" line breaks).
    raw = message.as_bytes().decode()
    assert raw.count(member.personal_path) == 3  # text, button, link below the button


def test_link_requests_answer_the_same_and_only_mail_known_addresses(creator: Client) -> None:
    pickup_id = new_pickup(creator)
    join(Client(), pickup_id, "Alice", email="alice@example.com")
    mail.outbox.clear()
    # The join mail just went out; outside the cooldown again:
    Member.objects.update(link_sent_at=timezone.now() - timedelta(minutes=5))
    url = f"/api/pickups/{pickup_id}/link-request/"

    unknown = post(Client(), url, {"email": "nobody@example.com"})
    known = post(Client(), url, {"email": "ALICE@example.com"})
    assert unknown.status_code == known.status_code == 202
    assert unknown.json() == known.json()
    assert [m.to for m in mail.outbox] == [["ALICE@example.com"]]  # sent to the address just typed

    post(Client(), url, {"email": "alice@example.com"})  # within the cooldown
    assert len(mail.outbox) == 1
    Member.objects.update(link_sent_at=timezone.now() - timedelta(minutes=5))
    post(Client(), url, {"email": "alice@example.com"})
    assert len(mail.outbox) == 2
    link = personal_link_from(mail.outbox[1])
    sign_in_with(Client(), link)
    assert post(Client(), url, {"email": "not an address"}).status_code == 400


def test_participants_can_add_their_address_later(creator: Client) -> None:
    pickup_id = new_pickup(creator)
    alice = Client()
    join(alice, pickup_id, "Alice")
    response = post(alice, f"/api/pickups/{pickup_id}/session/email/", {"email": "alice@example.com"})
    assert response.status_code == 200
    assert Member.objects.get(user_name="Alice").email_hash == email_hash("alice@example.com")
    assert "personal link again" in mail.outbox[0].body
    assert (
        post(Client(), f"/api/pickups/{pickup_id}/session/email/", {"email": "x@example.com"}).status_code
        == 403
    )


def test_mail_failures_do_not_break_joining(
    creator: Client, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    pickup_id = new_pickup(creator)

    def broken(*args: Any, **kwargs: Any) -> int:
        raise ConnectionError("smtp down")

    monkeypatch.setattr("django.core.mail.EmailMessage.send", broken)
    assert join(Client(), pickup_id, "Alice", email="alice@example.com").status_code == 201
    assert "Job apps.pickups.tasks.send_mail failed" in caplog.text
    # The cooldown started when the mail was queued, so a quick retry doesn't send twice.
    assert Member.objects.get(user_name="Alice").link_sent_at is not None


# --- invitations ----------------------------------------------------------------


def test_creator_invites_by_email_and_invited_people_join(creator: Client) -> None:
    pickup_id = new_pickup(creator, creator_name="Anna")
    settings_patch(creator, pickup_id, join_policy="invite", email_privacy=True)
    members_url = f"/api/pickups/{pickup_id}/members/"

    response = post(creator, members_url, {"email": "mark@example.com", "name": "Mark"})
    assert response.status_code == 201
    assert (response.json()["invited"], response.json()["has_folder"], response.json()["email"]) == (
        True,
        False,
        "",
    )
    message = mail.outbox[0]
    assert message.from_email.startswith("Anna via Pickup <")
    assert message.subject == "Anna invites you to “Untitled pickup”"
    assert message.reply_to == []  # privacy mode: the creator's address isn't known

    invited = Client()
    sign_in_with(invited, personal_link_from(message))
    detail = invited.get(f"/api/pickups/{pickup_id}/").json()
    assert (detail["can_view"], detail["is_member"], detail["has_folder"], detail["member_name"]) == (
        True,
        True,
        False,
        "Mark",
    )
    assert join(invited, pickup_id, "Mark").status_code == 201  # their own name is fine
    assert Member.objects.get(user_name="Mark").folder is not None

    # The same address again resends the link instead of creating a second person.
    post(creator, members_url, {"email": "MARK@example.com"})
    assert Member.objects.filter(user_name="Mark").count() == 1
    assert len(mail.outbox) == 2
    taken = post(creator, members_url, {"email": "other@example.com", "name": "mark"})
    assert "already in the pickup" in taken.json()["error"]


def test_without_privacy_mode_invites_can_be_resent_and_reply_to_the_creator(creator: Client) -> None:
    pickup_id = new_pickup(creator, creator_name="Anna", creator_email="anna@example.com")
    settings_patch(creator, pickup_id, email_privacy=True)  # also forgets Anna's address
    members_url = f"/api/pickups/{pickup_id}/members/"
    invited = post(creator, members_url, {"email": "mark@example.com"}).json()
    resend = post(creator, f"{members_url}{invited['id']}/resend/")
    assert resend.status_code == 400
    assert "privacy mode" in resend.json()["error"]

    settings_patch(creator, pickup_id, email_privacy=False)
    post(creator, members_url, {"email": "mark@example.com"})  # stores the address now
    assert post(creator, f"{members_url}{invited['id']}/resend/").json() == {
        "message": "Invitation sent again."
    }
    listed = {m["id"]: m for m in creator.get(members_url).json()}
    assert listed[invited["id"]]["email"] == "mark@example.com"
    assert mail.outbox[-1].to == ["mark@example.com"]
    assert mail.outbox[-1].reply_to == []  # the creator's own address was forgotten in privacy mode


def test_member_management_is_for_the_creator_only(creator: Client) -> None:
    pickup_id = new_pickup(creator)
    alice = Client()
    join(alice, pickup_id, "Alice")
    members_url = f"/api/pickups/{pickup_id}/members/"
    members = creator.get(members_url).json()
    assert [(m["user_name"], m["is_creator"], m["is_you"]) for m in members] == [
        ("Creator", True, True),
        ("Alice", False, False),
    ]
    assert alice.get(members_url).status_code == 403
    assert post(alice, members_url, {"email": "x@example.com"}).status_code == 403
    alice_id = members[1]["id"]
    assert post(alice, f"{members_url}{alice_id}/resend/").status_code == 403
    assert alice.delete(f"{members_url}{alice_id}/").status_code == 403
    assert alice.get(f"{members_url}{alice_id}/link/").status_code == 403
    creator_id = members[0]["id"]
    assert "cannot be removed" in creator.delete(f"{members_url}{creator_id}/").json()["error"]


def test_the_creator_can_copy_a_members_lost_link(creator: Client) -> None:
    pickup_id = new_pickup(creator)
    alice = Client()
    join(alice, pickup_id, "Alice")
    alice_id = Member.objects.get(user_name="Alice").id
    response = creator.get(f"/api/pickups/{pickup_id}/members/{alice_id}/link/")
    assert response["Cache-Control"] == "private, no-store"
    link = response.json()["member_url"]
    assert link == alice.get(f"/api/pickups/{pickup_id}/session/link/").json()["member_url"]
    sign_in_with(Client(), link)  # works on her new phone
    other = new_pickup(creator)
    assert creator.get(f"/api/pickups/{other}/members/{alice_id}/link/").status_code == 404


def test_the_creator_can_add_an_address_for_someone_without_one(creator: Client) -> None:
    pickup_id = new_pickup(creator, creator_name="Anna")
    settings_patch(creator, pickup_id, email_privacy=True)
    alice = Client()
    join(alice, pickup_id, "Alice")
    join(Client(), pickup_id, "Bob", email="bob@example.com")
    alice_id = Member.objects.get(user_name="Alice").id
    url = f"/api/pickups/{pickup_id}/members/{alice_id}/email/"
    assert post(alice, url, {"email": "alice@example.com"}).status_code == 403
    taken = post(creator, url, {"email": "BOB@example.com"})
    assert taken.status_code == 400
    assert taken.json()["error"] == "Someone in the pickup already has this address."

    mail.outbox.clear()
    assert post(creator, url, {"email": "alice@example.com"}).status_code == 200
    stored = Member.objects.get(id=alice_id)
    assert (stored.email, stored.email_hash) == ("", email_hash("alice@example.com"))  # privacy mode
    [message] = mail.outbox
    assert message.to == ["alice@example.com"]
    assert message.from_email.startswith("Anna via Pickup <")
    assert "Anna added this address for you" in message.body
    assert personal_link_from(message).endswith(stored.personal_path)

    # Now she can get her link herself; changing the address stays hers.
    post(Client(), f"/api/pickups/{pickup_id}/link-request/", {"email": "alice@example.com"})
    assert len(mail.outbox) == 1  # cooldown: just sent
    again = post(creator, url, {"email": "new@example.com"})
    assert again.json()["error"] == "They already have an address; only they can change it."


def test_removing_a_member_deletes_their_folder_and_files(creator: Client) -> None:
    pickup_id = new_pickup(creator)
    alice = Client()
    folder_id = join(alice, pickup_id, "Alice").json()["folder"]["id"]
    sub = post(alice, f"/api/pickups/{pickup_id}/folders/{folder_id}/subfolders/", {"name": "Strand"}).json()
    alice.post(
        f"/api/pickups/{pickup_id}/folders/{sub['id']}/media/", {"file": SimpleUploadedFile("a.jpg", b"x")}
    )
    stored = Media.objects.get().file
    alice_id = Member.objects.get(user_name="Alice").id
    invited = post(creator, f"/api/pickups/{pickup_id}/members/", {"email": "x@example.com"}).json()

    assert creator.delete(f"/api/pickups/{pickup_id}/members/{alice_id}/").status_code == 204
    assert not Folder.objects.exists()
    assert not Media.objects.exists()
    assert not stored.storage.exists(stored.name or "")
    assert (
        alice.get(f"/api/pickups/{pickup_id}/folders/").status_code == 403
    )  # signed out with the membership
    assert creator.delete(f"/api/pickups/{pickup_id}/members/{invited['id']}/").status_code == 204
    assert Member.objects.count() == 1


# --- moderation -----------------------------------------------------------------


def test_the_creator_can_delete_other_peoples_files_and_subfolders(creator: Client) -> None:
    pickup_id = new_pickup(creator)
    alice = Client()
    folder_id = join(alice, pickup_id, "Alice").json()["folder"]["id"]
    sub = post(alice, f"/api/pickups/{pickup_id}/folders/{folder_id}/subfolders/", {"name": "Strand"}).json()
    media = alice.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/", {"file": SimpleUploadedFile("a.jpg", b"x")}
    ).json()
    bob = Client()
    join(bob, pickup_id, "Bob")

    as_creator = creator.get(f"/api/pickups/{pickup_id}/folders/{folder_id}/media/").json()[0]
    assert (as_creator["can_edit"], as_creator["can_delete"]) == (False, True)
    as_bob = bob.get(f"/api/pickups/{pickup_id}/folders/{folder_id}/media/").json()[0]
    assert as_bob["can_delete"] is False
    folders = {f["id"]: f for f in creator.get(f"/api/pickups/{pickup_id}/folders/").json()}
    assert (folders[folder_id]["can_delete"], folders[sub["id"]]["can_delete"]) == (False, True)

    media_url = f"/api/pickups/{pickup_id}/folders/{folder_id}/media/{media['id']}/"
    assert bob.delete(media_url).status_code == 403
    assert creator.delete(media_url).status_code == 204
    assert bob.delete(f"/api/pickups/{pickup_id}/folders/{sub['id']}/").status_code == 403
    assert creator.delete(f"/api/pickups/{pickup_id}/folders/{sub['id']}/").status_code == 204
    # A member's top-level folder only goes with the member.
    assert creator.delete(f"/api/pickups/{pickup_id}/folders/{folder_id}/").status_code == 400
    # Moderation is deleting, not editing.
    rename = creator.patch(f"/api/pickups/{pickup_id}/folders/{folder_id}/", {"name": "x"}, content_type=JSON)
    assert rename.status_code == 403


def test_settings_are_for_the_creator(creator: Client) -> None:
    pickup_id = new_pickup(creator)
    alice = Client()
    join(alice, pickup_id, "Alice")
    assert settings_patch(alice, pickup_id, visibility="link").status_code == 403
    assert settings_patch(creator, pickup_id, visibility="public").status_code == 400
    response = settings_patch(
        creator, pickup_id, title="Fest", visibility="link", join_policy="invite", email_privacy=False
    )
    assert {k: response.json()[k] for k in ["title", "visibility", "join_policy", "email_privacy"]} == {
        "title": "Fest",
        "visibility": "link",
        "join_policy": "invite",
        "email_privacy": False,
    }
    assert Pickup.objects.get().join_policy == "invite"


def test_members_can_get_their_own_link_again(creator: Client) -> None:
    pickup_id = new_pickup(creator, creator_email="anna@example.com", join_policy="invite")
    assert Pickup.objects.get(id=pickup_id).join_policy == "invite"
    response = creator.get(f"/api/pickups/{pickup_id}/session/link/")
    assert response.status_code == 200
    assert response["Cache-Control"] == "private, no-store"
    creator_member = Member.objects.get(is_creator=True)
    assert response.json() == {"member_url": creator_member.personal_path, "has_email": True}
    assert Client().get(f"/api/pickups/{pickup_id}/session/link/").status_code == 403
    rejected = post(Client(), "/api/pickups/", {"join_policy": "closed"})
    assert rejected.status_code == 400
