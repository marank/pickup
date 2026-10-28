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

Reason = Literal["created", "joined", "requested", "invited", "confirm"]

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
    "confirm": (
        "Confirm your new address for “{title}”",
        "Hello {name},\n\nplease confirm that this is your new email address for “{title}”:\n\n{link}"
        "\n\nThe link works for 24 hours. If you didn't ask for this, ignore this mail; nothing changes.",
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
        # Text as 8bit, not quoted-printable: that wraps the long personal link with "=" soft
        # breaks, and mail programs that show the undecoded text break the link there.
        for part in msg.walk():
            if part.get_content_maintype() == "text":
                part.set_content(part.get_content(), subtype=part.get_content_subtype(), cte="8bit")
                del part["MIME-Version"]  # set_content adds it; only the message itself has one
        html = msg.get_body(("html",))
        if html is not None:
            html.add_related(LOGO.read_bytes(), "image", "png", cid=f"<{LOGO_CID}>")
        return msg


def _html(body: str, link: str, button: str = "Open your link") -> str:
    """The text body as HTML paragraphs, the link as a button."""
    paragraphs = [
        format_html(
            '<p><a href="{}" style="display:inline-block;padding:10px 18px;border-radius:8px;'
            'background:#e75528;color:#ffffff;text-decoration:none;font-weight:600">{}</a></p>'
            '<p style="font-size:13px;color:#4f6866;word-break:break-all">{}</p>',
            link,
            button,
            link,
        )
        if part == link
        else format_html("<p>{}</p>", part)
        for part in body.split("\n\n")
    ]
    # One element per line: 8bit allows at most 998 characters per line.
    return "\n".join(
        [
            '<!doctype html><html><body style="margin:0;padding:24px;background:#f8f5ef;color:#083230;'
            'font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.5">',
            '<div style="max-width:520px;margin:0 auto">',
            f'<p><img src="cid:{LOGO_CID}" width="162" height="48" alt="pickup"></p>',
            *paragraphs,
            "</div></body></html>",
        ]
    )


def send_personal_link(
    member: Member,
    address: str,
    request: HttpRequest,
    reason: Reason,
    *,
    inviter: Member | None = None,
    link: str = "",
) -> None:
    """Send the member's personal link (or `link`) to `address`. Failures are logged, never raised."""
    pickup = member.pickup
    inviter_name = inviter.user_name if inviter and inviter.user_name != "Creator" else "Someone"
    values = {
        "title": pickup.title or "Untitled pickup",
        "name": member.user_name or "there",
        "greeting": f" {member.user_name}" if member.user_name else "",
        "inviter": inviter_name,
        "link": link or request.build_absolute_uri(member.personal_path),
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
        button = "Confirm address" if reason == "confirm" else "Open your link"
        message.attach_alternative(_html(body, values["link"], button), "text/html")
        message.send()
        member.link_sent_at = timezone.now()
        member.save(update_fields=["link_sent_at"])
    except Exception:
        logger.exception("Could not send the personal link to member %s", member.id)


def send_pickup_list(members: list[Member], address: str, request: HttpRequest) -> None:
    """
    Mail an address the pickups it belongs to, each with that member's personal link (the
    start page's "find my pickups"). Failures are logged, never raised.
    """

    def entry(member: Member) -> tuple[str, str]:
        return member.pickup.title or "Untitled pickup", request.build_absolute_uri(member.personal_path)

    sections = [
        (heading, [entry(m) for m in members if m.is_creator == created])
        for heading, created in (("Pickups you created", True), ("Pickups you participate in", False))
    ]
    sections = [(heading, entries) for heading, entries in sections if entries]
    body = (
        "Hello,\n\nthis address belongs to these pickups. Each link logs you in as yourself."
        + "".join(
            f"\n\n{heading}:\n\n" + "\n\n".join(f"{title}\n{link}" for title, link in entries)
            for heading, entries in sections
        )
        + "\n\nIf you didn't ask for this mail, you can ignore it."
    )
    lists = "\n".join(
        format_html('<h3 style="margin:20px 0 8px;font-size:15px">{}</h3>', heading)
        + '\n<ul style="margin:0;padding-left:18px">\n'
        + "\n".join(
            format_html(
                '<li style="margin:0 0 12px"><a href="{}" style="color:#e75528;font-weight:600">{}</a>'
                '<br><span style="font-size:13px;color:#4f6866;word-break:break-all">{}</span></li>',
                link,
                title,
                link,
            )
            for title, link in entries
        )
        + "\n</ul>"
        for heading, entries in sections
    )
    html = "\n".join(
        [
            '<!doctype html><html><body style="margin:0;padding:24px;background:#f8f5ef;color:#083230;'
            'font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.5">',
            '<div style="max-width:520px;margin:0 auto">',
            f'<p><img src="cid:{LOGO_CID}" width="162" height="48" alt="pickup"></p>',
            "<p>Hello,</p>",
            "<p>this address belongs to these pickups. Each link logs you in as yourself.</p>",
            lists,
            "<p>If you didn&#x27;t ask for this mail, you can ignore it.</p>",
            "</div></body></html>",
        ]
    )
    try:
        message = _LinkMail("Your pickups", body, settings.DEFAULT_FROM_EMAIL, [address])
        message.attach_alternative(html, "text/html")
        message.send()
        Member.objects.filter(id__in=[member.id for member in members]).update(link_sent_at=timezone.now())
    except Exception:
        logger.exception("Could not send the pickup list")
