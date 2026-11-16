"""Who may create pickups (PICKUP_CREATION)."""

from io import StringIO
from typing import Any

import pytest
from django.core.management import CommandError, call_command
from django.test import Client
from pytest_django.fixtures import Settings

from config.env import parse_app_urls

from .test_access import post

pytestmark = pytest.mark.django_db


def create(client: Client, **body: str) -> Any:
    return post(client, "/api/pickups/", body)


def check(client: Client, code: str) -> Any:
    return post(client, "/api/pickups/creation/", {"code": code})


def test_by_default_everyone_creates_pickups() -> None:
    client = Client()
    assert client.get("/api/pickups/creation/").json() == {"mode": "everyone", "name": ""}
    assert create(client, title="Party").status_code == 201


def test_with_codes_every_creation_needs_one(settings: Settings) -> None:
    settings.PICKUP_CREATION = "code"
    settings.PICKUP_CREATION_CODES = ["1234-5678-9012", "ABCD-EFGH"]
    client = Client()
    assert client.get("/api/pickups/creation/").json() == {"mode": "code", "name": ""}

    assert check(client, "1234-5678-0000").json() == {"error": "This code is not valid."}
    assert check(client, " abcd-efgh ").json() == {"mode": "code", "name": ""}  # spaces and case don't matter

    # Checking a code remembers nothing: creating needs it again.
    assert create(client, title="Party").json() == {"error": "This code is not valid."}
    assert create(client, title="Party", code="wrong").status_code == 403
    assert create(client, title="Party", code="1234-5678-9012").status_code == 201
    assert create(client, title="Again").status_code == 403


def test_creation_can_be_turned_off(settings: Settings) -> None:
    settings.PICKUP_CREATION = "none"
    settings.PICKUP_CREATION_CODES = ["1234"]
    client = Client()
    assert client.get("/api/pickups/creation/").json() == {"mode": "none", "name": ""}
    refused = {"error": "Creating pickups is turned off on this server."}
    assert create(client, title="Party", code="1234").json() == refused
    assert check(client, "1234").json() == refused


def test_the_apps_get_the_servers_name(settings: Settings) -> None:
    settings.SERVER_NAME = "Sailing club"
    assert Client().get("/api/pickups/creation/").json() == {"mode": "everyone", "name": "Sailing club"}


def server_link(*args: str) -> str:
    out = StringIO()
    call_command("server_link", *args, stdout=out, stderr=StringIO())
    return out.getvalue().strip()


def test_server_link_adds_the_server_to_the_apps(settings: Settings) -> None:
    settings.APP_URLS = parse_app_urls(["https://photos.example.com", "http://localhost:8080"])
    assert server_link() == "https://photos.example.com/connect"
    with pytest.raises(CommandError):
        server_link("--code", "1234")


def test_server_link_carries_a_code_after_the_hash(settings: Settings) -> None:
    settings.PICKUP_CREATION = "code"
    settings.PICKUP_CREATION_CODES = ["AB CD/1", "EFGH"]
    origin = settings.APP_URLS[0].origin
    assert server_link() == f"{origin}/connect#code=AB%20CD%2F1"
    assert server_link("--code", "efgh") == f"{origin}/connect#code=efgh"
    assert server_link("--no-code") == f"{origin}/connect"
    with pytest.raises(CommandError):
        server_link("--code", "wrong")


def test_server_link_without_creating(settings: Settings) -> None:
    settings.PICKUP_CREATION = "none"
    assert server_link() == f"{settings.APP_URLS[0].origin}/connect"
