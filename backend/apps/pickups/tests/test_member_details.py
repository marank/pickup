"""Participants change their own name, their folder's name and their address."""

import time
from datetime import timedelta
from typing import Any

import pytest
from django.contrib.sessions.models import Session
from django.core import mail
from django.core.mail import EmailMultiAlternatives
from django.test import Client
from django.utils import timezone

from apps.pickups.models import Folder, Member
from apps.pickups.services.identity import email_hash

from .test_access import join, new_pickup, post, settings_patch

pytestmark = pytest.mark.django_db

JSON = "application/json"


def update(client: Client, pickup_id: str, **details: str) -> Any:
    return client.patch(f"/api/pickups/{pickup_id}/session/", details, content_type=JSON)


def change_email(client: Client, pickup_id: str, email: str) -> Any:
    return post(client, f"/api/pickups/{pickup_id}/session/email/", {"email": email})


def confirm(pickup_id: str, token: str) -> Any:
    return post(Client(), f"/api/pickups/{pickup_id}/session/email/confirm/", {"token": token})


def token_from(message: Any) -> str:
    line = next(line for line in message.body.splitlines() if "/confirm-email#" in line)
    return str(line.split("#", 1)[1].strip())


def allow_next_mail() -> None:
    Member.objects.update(link_sent_at=None)  # past the cooldown


# --- name and folder ------------------------------------------------------------


def test_members_change_their_name_and_folder_name() -> None:
    creator = Client()
    pickup_id = new_pickup(creator, creator_name="Anna")
    root = Folder.objects.get(name="Anna")
    post(creator, f"/api/pickups/{pickup_id}/folders/{root.id}/subfolders/", {"name": "Beach"})

    response = update(creator, pickup_id, user_name="  Anna  Maria ")
    assert response.status_code == 200
    assert response.json()["member_name"] == "Anna Maria"
    folders = {f.name: f.user_name for f in Folder.objects.filter(pickup_id=pickup_id)}
    assert folders == {"Anna": "Anna Maria", "Beach": "Anna Maria"}  # the folder keeps its name

    assert update(creator, pickup_id, folder_name="Anna's photos").status_code == 200
    assert Folder.objects.get(id=root.id).name == "Anna's photos"


def test_names_stay_unique_and_need_a_session() -> None:
    creator = Client()
    pickup_id = new_pickup(creator, creator_name="Anna")
    guest = Client()
    join(guest, pickup_id, "Bob")
    assert update(guest, pickup_id, user_name="anna").json() == {
        "error": "This name is already taken in this pickup."
    }
    assert update(guest, pickup_id, folder_name="ANNA").json() == {"error": "“ANNA” already exists here."}
    assert update(guest, pickup_id, folder_name="a/b").status_code == 400
    assert update(guest, pickup_id, user_name="   ").status_code == 400
    assert update(guest, pickup_id, user_name="BOB").status_code == 200  # own name in another spelling
    assert update(Client(), pickup_id, user_name="Carl").status_code == 403


def test_a_folder_name_needs_a_folder_and_an_open_pickup() -> None:
    creator = Client()
    pickup_id = new_pickup(creator)
    assert "don't have a folder" in update(creator, pickup_id, folder_name="Mine").json()["error"]
    guest = Client()
    join(guest, pickup_id, "Bob")
    settings_patch(creator, pickup_id, visibility="creator")
    assert update(guest, pickup_id, user_name="Robert").status_code == 403
    assert update(creator, pickup_id, user_name="Annie").status_code == 200


# --- address --------------------------------------------------------------------


def test_a_first_address_is_stored_and_gets_the_link() -> None:
    creator = Client()
    pickup_id = new_pickup(creator, creator_name="Anna")
    response = change_email(creator, pickup_id, "anna@example.com")
    assert response.json() == {"message": "We sent you your personal link."}
    assert Member.objects.get(is_creator=True).email_hash == email_hash("anna@example.com")
    assert "/member/" in mail.outbox[0].body


def test_a_new_address_is_only_stored_once_it_is_confirmed() -> None:
    creator = Client()
    pickup_id = new_pickup(creator, creator_name="Anna", creator_email="anna@example.com")
    settings_patch(creator, pickup_id, email_privacy=False)
    allow_next_mail()

    response = change_email(creator, pickup_id, "Anna@New.example")
    assert response.json() == {"message": "We sent a confirmation link to the new address."}
    message = mail.outbox[-1]
    assert message.to == ["Anna@New.example"]
    assert message.subject == "Confirm your new address for “Untitled pickup”"
    assert isinstance(message, EmailMultiAlternatives)
    assert "Confirm address" in str(message.alternatives[0][0])
    member = Member.objects.get(is_creator=True)
    assert member.email_hash == email_hash("anna@example.com")  # unchanged until confirmed

    assert confirm(pickup_id, token_from(message)).json() == {"message": "Your new address is confirmed."}
    member.refresh_from_db()
    assert (member.email, member.email_hash) == ("anna@new.example", email_hash("anna@new.example"))


def test_privacy_mode_keeps_only_the_hash_of_a_confirmed_address() -> None:
    creator = Client()
    pickup_id = new_pickup(creator, creator_name="Anna", creator_email="anna@example.com")
    settings_patch(creator, pickup_id, email_privacy=True)
    allow_next_mail()
    change_email(creator, pickup_id, "anna@new.example")
    confirm(pickup_id, token_from(mail.outbox[-1]))
    member = Member.objects.get(is_creator=True)
    assert (member.email, member.email_hash) == ("", email_hash("anna@new.example"))


def test_confirmation_links_expire_and_cannot_take_others_addresses(monkeypatch: pytest.MonkeyPatch) -> None:
    creator = Client()
    pickup_id = new_pickup(creator, creator_name="Anna", creator_email="anna@example.com")
    guest = Client()
    join(guest, pickup_id, "Bob", email="bob@example.com")
    allow_next_mail()

    assert change_email(creator, pickup_id, "bob@example.com").status_code == 200
    taken = confirm(pickup_id, token_from(mail.outbox[-1]))
    assert taken.json() == {"error": "Someone else in this pickup already uses this address."}

    allow_next_mail()
    change_email(creator, pickup_id, "anna@new.example")
    token = token_from(mail.outbox[-1])
    later = time.time() + 2 * 24 * 3600
    with monkeypatch.context() as clock:
        clock.setattr("django.core.signing.time.time", lambda: later)
        assert confirm(pickup_id, token).status_code == 400
    assert confirm(pickup_id, token[:-2] + "xx").status_code == 400
    assert confirm(new_pickup(Client()), token).status_code == 400  # another pickup


def test_address_changes_respect_the_mail_cooldown() -> None:
    creator = Client()
    pickup_id = new_pickup(creator, creator_name="Anna", creator_email="anna@example.com")
    response = change_email(creator, pickup_id, "anna@new.example")
    assert response.status_code == 429


# --- personal link preview ------------------------------------------------------


def test_a_personal_link_shows_whose_it_is_without_logging_in() -> None:
    creator = Client()
    pickup_id = new_pickup(creator, title="Wedding", creator_name="Anna")
    key = Member.objects.get(is_creator=True).access_key
    browser = Client()
    url = f"/api/pickups/{pickup_id}/session/preview/"
    response = post(browser, url, {"access_key": key})
    assert response.json() == {
        "title": "Wedding",
        "user_name": "Anna",
        "is_creator": True,
        "password_required": False,
    }
    assert response["Cache-Control"] == "private, no-store"
    assert browser.get(f"/api/pickups/{pickup_id}/").json()["is_member"] is False  # not logged in
    assert post(browser, url, {"access_key": "wrong"}).status_code == 403
    assert post(browser, url, {}).status_code == 403


# --- staying logged in ----------------------------------------------------------


def test_using_a_pickup_restarts_the_session_at_most_once_a_day() -> None:
    creator = Client()
    pickup_id = new_pickup(creator, creator_name="Anna")
    key = creator.session.session_key

    def expires_in(days: int, renewed: str) -> None:
        session = creator.session
        session["pickup_session_renewed"] = renewed
        session.save()
        Session.objects.filter(pk=key).update(expire_date=timezone.now() + timedelta(days=days))

    def days_left() -> int:
        return (Session.objects.get(pk=key).expire_date - timezone.now()).days

    expires_in(3, renewed=timezone.localdate().isoformat())
    creator.get(f"/api/pickups/{pickup_id}/")
    assert days_left() == 2  # renewed today already: not written again

    expires_in(3, renewed=(timezone.localdate() - timedelta(days=1)).isoformat())
    response = creator.get(f"/api/pickups/{pickup_id}/")
    assert days_left() == 27  # 28 days from now (minus the seconds this test takes)
    assert "sessionid" in response.cookies  # the browser gets the longer cookie too
