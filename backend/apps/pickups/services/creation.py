"""Who may create pickups (PICKUP_CREATION): everyone, only with a code, or nobody."""

import hmac
import re

from django.conf import settings


def _normalize(code: str) -> str:
    """Codes are compared without spaces and case: "1234-5678 abcd" == "1234-5678ABCD"."""
    return re.sub(r"\s+", "", code).upper()


def creation_mode() -> str:
    return str(settings.PICKUP_CREATION)


def valid_code(code: str) -> bool:
    """One of PICKUP_CREATION_CODES. Nothing is remembered: each creation sends its code."""
    given = _normalize(code).encode()
    # Every code is compared, in constant time, so the answer doesn't hint at how close a guess was.
    valid = False
    for known in settings.PICKUP_CREATION_CODES:
        valid |= hmac.compare_digest(given, _normalize(known).encode())
    return valid


def creation_refused(code: str) -> str | None:
    """Why a pickup can't be created with this code; None: it can."""
    mode = creation_mode()
    if mode == "none":
        return "Creating pickups is turned off on this server."
    if mode == "code" and not valid_code(code):
        return "This code is not valid."
    return None
