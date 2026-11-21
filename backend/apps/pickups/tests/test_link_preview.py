from datetime import timedelta
from pathlib import Path

import pytest
from django.conf import settings as django_settings
from django.test import Client
from django.utils import timezone
from pytest_django.fixtures import Settings

from apps.pickups.models import Pickup

pytestmark = pytest.mark.django_db

JSON = "application/json"


@pytest.fixture(autouse=True)
def spa_index(settings: Settings) -> None:
    settings.SPA_INDEX = Path(django_settings.BASE_DIR).parent / "frontend" / "index.html"


def new_pickup(**body: str) -> str:
    response = Client().post("/api/pickups/", body, content_type=JSON)
    assert response.status_code == 201
    pickup_id: str = response.json()["id"]
    return pickup_id


def meta(page: str, key: str) -> str:
    marker = f'{key}" content="'
    start = page.index(marker) + len(marker)
    return page[start : page.index('"', start)]


def page_of(path: str) -> str:
    response = Client().get(path)
    assert response.status_code == 200
    assert response["Content-Type"] == "text/html; charset=utf-8"
    assert response["Cache-Control"] == "no-cache"
    return response.content.decode()


def test_a_shared_link_shows_the_title_and_who_created_it() -> None:
    pickup_id = new_pickup(title="Sommerfest <2026>", creator_name="Anna")
    page = page_of(f"/pickup/{pickup_id}")
    assert meta(page, "og:title") == "Sommerfest &lt;2026&gt;"  # escaped
    assert meta(page, "og:description").startswith("Anna invites you to add your photos and videos.")
    assert meta(page, 'name="description') == meta(page, "og:description")
    assert meta(page, "og:image") == "http://testserver/apple-touch-icon.png"
    assert '<div id="app"></div>' in page  # still the SPA
    # Every page of the pickup, also personal links (not logged in by this).
    for rest in ("/", "/f/x", "/people", "/member/some-key"):
        assert meta(page_of(f"/pickup/{pickup_id}{rest}"), "og:title") == "Sommerfest &lt;2026&gt;"


def test_without_a_creator_name_the_preview_names_nobody() -> None:
    page = page_of(f"/pickup/{new_pickup()}")
    assert (meta(page, "og:title"), meta(page, "og:description")) == (
        "Untitled pickup",
        "Add your photos and videos. One link, no accounts.",
    )


@pytest.mark.parametrize("change", ["password", "expired", "missing"])
def test_protected_or_gone_pickups_get_the_generic_preview(change: str) -> None:
    pickup_id = new_pickup(title="Secret party", creator_name="Anna")
    if change == "password":
        Pickup.objects.update(password="pbkdf2_sha256$x")
    elif change == "expired":
        Pickup.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
    else:
        Pickup.objects.all().delete()
    page = page_of(f"/pickup/{pickup_id}")
    assert meta(page, "og:title") == "Pickup"
    assert "Secret party" not in page
    assert "Anna" not in page
