import importlib.util
from pathlib import Path
from types import ModuleType

import pytest

SETTINGS = Path(__file__).resolve().parents[3] / "config" / "settings.py"


def production_settings(monkeypatch: pytest.MonkeyPatch) -> ModuleType:
    """config/settings.py evaluated behind a TLS proxy, as its own module (Django's stay)."""
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("APP_URLS", "https://app.example.com")
    monkeypatch.setenv("SECRET_KEY", "settings-test-not-secret-but-long-and-random-enough-0123456789")
    monkeypatch.setenv("EMAIL_HASH_KEY", "settings-test-email-hash-key-0123456789abcdef")
    spec = importlib.util.spec_from_file_location("config.production_settings", SETTINGS)
    assert spec
    assert spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_no_https_redirect_or_hsts_from_the_app(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = production_settings(monkeypatch)
    # Secure cookies and the proxy header, but redirect and HSTS stay the proxy's job.
    assert settings.SESSION_COOKIE_SECURE
    assert settings.SECURE_PROXY_SSL_HEADER == ("HTTP_X_FORWARDED_PROTO", "https")
    assert not getattr(settings, "SECURE_SSL_REDIRECT", False)
    assert not getattr(settings, "SECURE_HSTS_SECONDS", 0)
    assert not getattr(settings, "SESSION_COOKIE_DOMAIN", None)
