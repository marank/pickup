import pytest
from django.core.management import call_command

from apps.core.checks import uuid_primary_keys


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_all_own_models_use_uuid_primary_keys():
    assert uuid_primary_keys() == []


@pytest.mark.django_db
def test_ensure_admin_creates_user_once(monkeypatch, django_user_model):
    monkeypatch.setenv("ADMIN_USERNAME", "boss")
    monkeypatch.setenv("ADMIN_PASSWORD", "a-long-test-password")
    call_command("ensure_admin")
    call_command("ensure_admin")
    assert django_user_model.objects.filter(username="boss", is_superuser=True).count() == 1
