import io

import pytest
from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.db import models
from django.test import Client
from pytest_django.fixtures import Settings

from apps.core.checks import uuid_primary_keys

User = get_user_model()


def test_health(client: Client) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_csrf_endpoint_sets_cookie(client: Client) -> None:
    response = client.get("/api/csrf")
    assert response.status_code == 204
    assert "csrftoken" in response.cookies


def test_all_own_models_use_uuid_primary_keys() -> None:
    assert uuid_primary_keys() == []


def test_uuid_check_flags_integer_primary_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    class IntPk(models.Model):  # noqa: DJ008
        class Meta:
            app_label = "core"

    class FakeConfig:
        name = "apps.fake"

        def get_models(self) -> list[type[models.Model]]:
            return [IntPk]

    errors = uuid_primary_keys([FakeConfig()])  # type: ignore[list-item]
    assert [e.id for e in errors] == ["core.E001"]


@pytest.mark.django_db
def test_ensure_admin_creates_user_once(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_USERNAME", "boss")
    monkeypatch.setenv("ADMIN_PASSWORD", "a-long-test-password")
    call_command("ensure_admin", stdout=io.StringIO())
    out = io.StringIO()
    call_command("ensure_admin", stdout=out)
    assert "already exists" in out.getvalue()
    assert User.objects.filter(username="boss", is_superuser=True).count() == 1


@pytest.mark.django_db
def test_ensure_admin_skips_without_username(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ADMIN_USERNAME", raising=False)
    out = io.StringIO()
    call_command("ensure_admin", stdout=out)
    assert "skipping" in out.getvalue()
    assert not User.objects.exists()


@pytest.mark.django_db
def test_ensure_admin_refuses_placeholder_password_in_production(
    monkeypatch: pytest.MonkeyPatch, settings: Settings
) -> None:
    settings.DEBUG = False
    monkeypatch.setenv("ADMIN_USERNAME", "boss")
    monkeypatch.setenv("ADMIN_PASSWORD", "change-me")
    with pytest.raises(CommandError):
        call_command("ensure_admin")


@pytest.mark.django_db
def test_set_password_from_stdin(monkeypatch: pytest.MonkeyPatch) -> None:
    user = User.objects.create_user(username="boss", password="old-password-123")
    monkeypatch.setattr("sys.stdin", io.StringIO("a-much-better-password-42\n"))
    call_command("set_password", "boss", "--stdin", stdout=io.StringIO())
    user.refresh_from_db()
    assert user.check_password("a-much-better-password-42")


@pytest.mark.django_db
def test_set_password_rejects_weak_password_and_unknown_user(monkeypatch: pytest.MonkeyPatch) -> None:
    User.objects.create_user(username="boss", password="old-password-123")
    monkeypatch.setattr("sys.stdin", io.StringIO("123\n"))
    with pytest.raises(CommandError):
        call_command("set_password", "boss", "--stdin")
    with pytest.raises(CommandError):
        call_command("set_password", "nobody", "--stdin")
