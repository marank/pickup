from pathlib import Path

import pytest
from django.core.exceptions import ImproperlyConfigured

from config import env


def test_load_dotenv_keeps_existing_values(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    dotenv = tmp_path / ".env"
    dotenv.write_text('# comment\nexport A_KEY="quoted"\nB_KEY=from-file\nnot a pair\n\n')
    monkeypatch.delenv("A_KEY", raising=False)
    monkeypatch.setenv("B_KEY", "from-env")
    env.load_dotenv(tmp_path / "missing", dotenv)
    assert env.env_str("A_KEY") == "quoted"
    assert env.env_str("B_KEY") == "from-env"


def test_env_str_required_and_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("NOPE", raising=False)
    assert env.env_str("NOPE", "fallback") == "fallback"
    with pytest.raises(ImproperlyConfigured):
        env.env_str("NOPE")


@pytest.mark.parametrize(("raw", "expected"), [("true", True), ("ON", True), ("0", False), ("", False)])
def test_env_bool(monkeypatch: pytest.MonkeyPatch, raw: str, expected: bool) -> None:
    monkeypatch.setenv("FLAG", raw)
    assert env.env_bool("FLAG") is expected


def test_env_bool_and_int_reject_garbage(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FLAG", "maybe")
    with pytest.raises(ImproperlyConfigured):
        env.env_bool("FLAG")
    monkeypatch.setenv("NUM", "ten")
    with pytest.raises(ImproperlyConfigured):
        env.env_int("NUM", 1)


def test_env_int_and_list(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("NUM", raising=False)
    assert env.env_int("NUM", 7) == 7
    monkeypatch.setenv("NUM", "42")
    assert env.env_int("NUM", 7) == 42
    monkeypatch.setenv("ITEMS", " a, ,b ")
    assert env.env_list("ITEMS") == ["a", "b"]
    monkeypatch.delenv("ITEMS")
    assert env.env_list("ITEMS", ["x"]) == ["x"]


def test_parse_app_urls() -> None:
    urls = env.parse_app_urls(["https://pickup.example.com", "http://localhost:8080", "https://h:443"])
    assert [u.origin for u in urls] == ["https://pickup.example.com", "http://localhost:8080", "https://h"]
    assert urls[0].hostname == "pickup.example.com"
    for bad in (["ftp://x"], ["no-scheme"], []):
        with pytest.raises(ImproperlyConfigured):
            env.parse_app_urls(bad)


def test_secret_key_guard(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SECRET_KEY", "change-me")
    assert env.secret_key(debug=True).startswith("django-insecure-dev-only-")
    with pytest.raises(ImproperlyConfigured):
        env.secret_key(debug=False)
    monkeypatch.setenv("SECRET_KEY", "k" * 50)
    assert env.secret_key(debug=False) == "k" * 50
