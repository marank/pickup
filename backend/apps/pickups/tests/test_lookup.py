"""The start page's "find my pickups": an address gets the list of its pickups by mail."""

from datetime import timedelta
from typing import Any

import pytest
from django.core import mail
from django.core.mail import EmailMultiAlternatives
from django.test import Client
from django.utils import timezone

from apps.pickups.models import Member, Pickup
from apps.pickups.services.identity import email_hash

from .test_access import join, new_pickup, post, settings_patch

pytestmark = pytest.mark.django_db

ANSWER = {"message": "If this address belongs to any pickups, we sent you a list."}


def lookup(email: str) -> Any:
    return post(Client(), "/api/pickups/lookup/", {"email": email})


def allow_next_mail() -> None:
    Member.objects.update(link_sent_at=None)  # past the cooldown


def test_an_address_gets_its_live_pickups_with_personal_links() -> None:
    first = new_pickup(Client(), title="Wedding", creator_name="Anna", creator_email="anna@example.com")
    second = new_pickup(Client(), title="Trip")
    join(Client(), second, "Anna", email="Anna@Example.com ")
    settings_patch(Client(), second, email_privacy=True)  # hash only: still found
    expired = new_pickup(Client(), title="Old", creator_email="anna@example.com")
    Pickup.objects.filter(id=expired).update(expires_at=timezone.now() - timedelta(days=1))
    new_pickup(Client(), title="Someone else's", creator_email="bob@example.com")
    allow_next_mail()

    response = lookup("ANNA@example.com")
    assert (response.status_code, response.json()) == (202, ANSWER)
    message = mail.outbox[-1]
    assert (message.to, message.subject) == (["ANNA@example.com"], "Your pickups")
    anna = Member.objects.filter(pickup_id__in=[first, second], email_hash=email_hash("anna@example.com"))
    links = [m.personal_path for m in anna]
    assert len(links) == 2
    for link in links:
        assert link in message.body
    created, participating = (
        message.body.index("Pickups you created:"),
        message.body.index("Pickups you participate in:"),
    )
    assert created < message.body.index("Wedding") < participating < message.body.index("Trip")
    assert "Old" not in message.body
    assert "Someone else" not in message.body
    assert isinstance(message, EmailMultiAlternatives)
    html = str(message.alternatives[0][0])
    assert all(link in html for link in links)
    assert html.index("Pickups you created") < html.index("Pickups you participate in")
    assert max(len(line) for line in html.splitlines()) < 998  # 8bit line limit


def test_unknown_addresses_get_the_same_answer_and_no_mail() -> None:
    new_pickup(Client(), creator_email="anna@example.com")
    sent = len(mail.outbox)
    response = lookup("nobody@example.com")
    assert (response.status_code, response.json()) == (202, ANSWER)
    assert len(mail.outbox) == sent
    assert lookup("not an address").status_code == 400


def test_the_list_respects_the_mail_cooldown() -> None:
    new_pickup(Client(), creator_email="anna@example.com")  # its creator's personal link just went out
    sent = len(mail.outbox)
    assert lookup("anna@example.com").json() == ANSWER
    assert len(mail.outbox) == sent
    allow_next_mail()
    lookup("anna@example.com")
    assert len(mail.outbox) == sent + 1
    assert lookup("anna@example.com").json() == ANSWER  # right after: no second mail
    assert len(mail.outbox) == sent + 1


def test_sections_without_pickups_are_left_out() -> None:
    pickup_id = new_pickup(Client(), title="Trip")
    join(Client(), pickup_id, "Bob", email="bob@example.com")
    allow_next_mail()
    lookup("bob@example.com")
    body = mail.outbox[-1].body
    assert "Pickups you participate in:" in body
    assert "Pickups you created" not in body
