"""Mails with personal links. Addresses come from the request that triggers the mail."""

import logging
from email.utils import formataddr, parseaddr
from typing import Literal

from django.conf import settings
from django.core.mail import EmailMessage
from django.http import HttpRequest
from django.utils import timezone

from ..models import Member

logger = logging.getLogger(__name__)

Reason = Literal["created", "joined", "requested", "invited"]

_TEXT: dict[Reason, tuple[str, str]] = {
    "created": (
        "Your new pickup “{title}”",
        "Hello {name},\n\nyour pickup is ready. This is your creator link — it signs you in as the creator "
        "on any device, so keep it safe:\n\n{link}\n\nShare the pickup with others using its share link "
        "inside the pickup.",
    ),
    "joined": (
        "Your link to “{title}”",
        "Hello {name},\n\nthanks for joining! This personal link signs you in as yourself on any device:"
        "\n\n{link}\n\nUse it to add, rename or delete your photos later.",
    ),
    "requested": (
        "Your link to “{title}”",
        "Hello {name},\n\nhere is your personal link again. It signs you in as yourself on any device:"
        "\n\n{link}\n\nIf you didn't ask for this mail, you can ignore it.",
    ),
    "invited": (
        "{inviter} invites you to “{title}”",
        "Hello{greeting},\n\n{inviter} invites you to add your photos and videos to “{title}”. "
        "Open your personal link to join — no account needed:\n\n{link}\n\nThe link is just for you; "
        "please don't forward it.",
    ),
}


def send_personal_link(
    member: Member, address: str, request: HttpRequest, reason: Reason, *, inviter: Member | None = None
) -> None:
    """Send the member's personal link to `address`. Failures are logged, never raised."""
    pickup = member.pickup
    inviter_name = inviter.user_name if inviter and inviter.user_name != "Creator" else "Someone"
    values = {
        "title": pickup.title or "Untitled pickup",
        "name": member.user_name or "there",
        "greeting": f" {member.user_name}" if member.user_name else "",
        "inviter": inviter_name,
        "link": request.build_absolute_uri(member.personal_path),
    }
    subject, body = (part.format(**values) for part in _TEXT[reason])
    sender = settings.DEFAULT_FROM_EMAIL
    reply_to: list[str] = []
    if reason == "invited":
        # Sent by Pickup on the inviter's behalf: their address would fail SPF/DKIM as sender.
        sender = formataddr((f"{inviter_name} via Pickup", parseaddr(sender)[1]))
        if inviter and inviter.email:  # only known with the privacy mode off
            reply_to = [inviter.email]
    try:
        EmailMessage(subject, body, sender, [address], reply_to=reply_to).send()
        member.link_sent_at = timezone.now()
        member.save(update_fields=["link_sent_at"])
    except Exception:
        logger.exception("Could not send the personal link to member %s", member.id)
