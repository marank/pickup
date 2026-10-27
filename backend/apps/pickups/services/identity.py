"""How people are identified without accounts: normalised names and hashed e-mail addresses."""

import hashlib
import hmac
import re
import unicodedata
from typing import TYPE_CHECKING

from django.conf import settings

if TYPE_CHECKING:
    from ..models import Member, Pickup


def normalize_name(name: str) -> str:
    """One canonical spelling: Unicode-normalised, trimmed, single spaces."""
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", name)).strip()


def normalize_email(email: str) -> str:
    return unicodedata.normalize("NFKC", email).strip().lower()


def email_hash(email: str) -> str:
    """Keyed hash of an address: matchable when someone types it, useless without the key."""
    key = settings.EMAIL_HASH_KEY.encode()
    return hmac.new(key, normalize_email(email).encode(), hashlib.sha256).hexdigest()


def remember_email(member: Member, email: str) -> None:
    """Store an address the way the pickup's privacy mode says (always the hash)."""
    member.email_hash = email_hash(email)
    member.email = "" if member.pickup.email_privacy else normalize_email(email)


def forget_plain_emails(pickup: Pickup) -> None:
    """Privacy mode switched on: drop every plain address, keep the hashes."""
    pickup.members.exclude(email="").update(email="")
