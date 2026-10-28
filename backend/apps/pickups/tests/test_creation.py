"""Who may create pickups (PICKUP_CREATION)."""

from typing import Any

import pytest
from django.test import Client
from pytest_django.fixtures import Settings

from .test_access import post

pytestmark = pytest.mark.django_db


def create(client: Client, **body: str) -> Any:
    return post(client, "/api/pickups/", body)


def check(client: Client, code: str) -> Any:
    return post(client, "/api/pickups/creation/", {"code": code})


def test_by_default_everyone_creates_pickups() -> None:
    client = Client()
    assert client.get("/api/pickups/creation/").json() == {"mode": "everyone"}
    assert create(client, title="Party").status_code == 201


def test_with_codes_every_creation_needs_one(settings: Settings) -> None:
    settings.PICKUP_CREATION = "code"
    settings.PICKUP_CREATION_CODES = ["1234-5678-9012", "ABCD-EFGH"]
    client = Client()
    assert client.get("/api/pickups/creation/").json() == {"mode": "code"}

    assert check(client, "1234-5678-0000").json() == {"error": "This code is not valid."}
    assert check(client, " abcd-efgh ").json() == {"mode": "code"}  # spaces and case don't matter

    # Checking a code remembers nothing: creating needs it again.
    assert create(client, title="Party").json() == {"error": "This code is not valid."}
    assert create(client, title="Party", code="wrong").status_code == 403
    assert create(client, title="Party", code="1234-5678-9012").status_code == 201
    assert create(client, title="Again").status_code == 403


def test_creation_can_be_turned_off(settings: Settings) -> None:
    settings.PICKUP_CREATION = "none"
    settings.PICKUP_CREATION_CODES = ["1234"]
    client = Client()
    assert client.get("/api/pickups/creation/").json() == {"mode": "none"}
    refused = {"error": "Creating pickups is turned off on this server."}
    assert create(client, title="Party", code="1234").json() == refused
    assert check(client, "1234").json() == refused
