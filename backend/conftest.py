import pytest


@pytest.fixture(autouse=True)
def _fast_passwords_and_tmp_media(settings, tmp_path):
    # Argon2 is deliberately slow; uploads must not land in the real data directory.
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    settings.MEDIA_ROOT = tmp_path / "media"
