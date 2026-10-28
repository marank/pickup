"""Mails with personal links. Addresses come from the request that triggers the mail."""

import email.message
import email.policy
import logging
from email.policy import Policy
from email.utils import formataddr, parseaddr
from pathlib import Path
from typing import Literal

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.http import HttpRequest
from django.utils import timezone
from django.utils.html import format_html

from ..models import Member

logger = logging.getLogger(__name__)

Reason = Literal["created", "joined", "requested", "invited"]

_TEXT: dict[Reason, tuple[str, str]] = {
    "created": (
        "Your new pickup “{title}”",
        "Hello {name},\n\nyour pickup is ready. With this creator link you can log in as the creator "
        "on any device. Keep it safe:\n\n{link}\n\nShare the pickup with others using its share link "
        "inside the pickup.",
    ),
    "joined": (
        "Your link to “{title}”",
        "Hello {name},\n\nthanks for joining! With this personal link you can log in on any device:"
        "\n\n{link}\n\nUse it to add, rename or delete your photos later.",
    ),
    "requested": (
        "Your link to “{title}”",
        "Hello {name},\n\nhere is your personal link again. With it you can log in on any device:"
        "\n\n{link}\n\nIf you didn't ask for this mail, you can ignore it.",
    ),
    "invited": (
        "{inviter} invites you to “{title}”",
        "Hello{greeting},\n\n{inviter} invites you to add your photos and videos to “{title}”. "
        "Open your personal link to join — no account needed:\n\n{link}\n\nThe link is just for you; "
        "please don't forward it.",
    ),
}


# The logo (frontend/src/lib/brand.ts) as PNG at twice its size in the mail, embedded so
# opening the mail loads nothing from the server.
LOGO = Path(__file__).resolve().parent.parent / "assets" / "mail-logo.png"
LOGO_CID = "logo@pickup"


class _LinkMail(EmailMultiAlternatives):
    """Plain text plus an HTML version that shows the embedded logo."""

    def message(self, *, policy: Policy | None = None) -> email.message.EmailMessage:
        msg = super().message(policy=policy or email.policy.default)
        html = msg.get_body(("html",))
        if html is not None:
            html.add_related(LOGO.read_bytes(), "image", "png", cid=f"<{LOGO_CID}>")
        return msg


def _html(body: str, link: str) -> str:
    """The text body as HTML paragraphs, the link as a button."""
    paragraphs = [
        format_html(
            '<p><a href="{}" style="display:inline-block;padding:10px 18px;border-radius:8px;'
            'background:#e75528;color:#ffffff;text-decoration:none;font-weight:600">Open your link</a></p>'
            '<p style="font-size:13px;color:#4f6866;word-break:break-all">{}</p>',
            link,
            link,
        )
        if part == link
        else format_html("<p>{}</p>", part)
        for part in body.split("\n\n")
    ]
    return (
        '<!doctype html><html><body style="margin:0;padding:24px;background:#f8f5ef;color:#083230;'
        'font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.5">'
        '<div style="max-width:520px;margin:0 auto">'
        f'<p><img src="cid:{LOGO_CID}" width="162" height="48" alt="pickup"></p>'
        + "".join(paragraphs)
        + "</div></body></html>"
    )


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
        message = _LinkMail(subject, body, sender, [address], reply_to=reply_to)
        message.attach_alternative(_html(body, values["link"]), "text/html")
        message.send()
        member.link_sent_at = timezone.now()
        member.save(update_fields=["link_sent_at"])
    except Exception:
        logger.exception("Could not send the personal link to member %s", member.id)
