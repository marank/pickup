"""Error messages and mails in the language the SPA sends (Accept-Language)."""

import re
from pathlib import Path

import pytest
from django.conf import settings
from django.core import mail
from django.test import Client

from .test_access import JSON, new_pickup

pytestmark = pytest.mark.django_db

GERMAN = {"Accept-Language": "de"}


def test_errors_and_mails_follow_the_language_of_the_request() -> None:
    creator = Client(headers=GERMAN)
    pickup_id = new_pickup(creator, creator_name="Anna")
    url = f"/api/pickups/{pickup_id}/members/"
    english = Client().post(url, {"email": "x@example.com"}, content_type=JSON)
    assert english.json()["error"] == "Only the creator can manage participants."
    german = Client(headers=GERMAN).post(url, {"email": "x@example.com"}, content_type=JSON)
    assert german.json()["error"] == "Nur die Ersteller:in kann Teilnehmende verwalten."

    creator.post(url, {"email": "mark@example.com"}, content_type=JSON)
    [invitation] = mail.outbox
    assert invitation.subject == "Anna lädt dich zu „Pickup ohne Titel“ ein"
    assert "Öffne deinen persönlichen Link" in invitation.body
    assert "Link öffnen" in str(invitation.alternatives[0][0])  # type: ignore[attr-defined]


def test_every_german_text_is_translated() -> None:
    po = (Path(settings.BASE_DIR) / "locale" / "de" / "LC_MESSAGES" / "django.po").read_text()
    entries = po.split("\n\n")[1:]  # without the header
    empty = [entry for entry in entries if re.search(r'^msgstr ""\Z', entry.strip(), re.MULTILINE)]
    assert empty == []
    # Compiled next to it (scripts/check_messages.py checks it is current).
    assert (Path(settings.BASE_DIR) / "locale" / "de" / "LC_MESSAGES" / "django.mo").exists()
