"""What WhatsApp, Signal & co. show for a shared pickup link (Open Graph tags)."""

import html
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from uuid import UUID

from django.utils.translation import gettext as _

from ..models import Member, Pickup, live


@dataclass(frozen=True)
class LinkPreview:
    title: str
    description: str


def generic() -> LinkPreview:
    return LinkPreview(
        "Pickup", _("Everyone’s photos and videos from one event in one place. One link, no accounts.")
    )


def link_preview(pickup_id: UUID) -> LinkPreview:
    """
    The pickup's title and who created it. Outsiders see the title anyway (how to join), but
    with a password nothing at all, like the API; gone or expired pickups look generic.
    """
    pickup = Pickup.objects.filter(live(), id=pickup_id).first()
    if pickup is None or pickup.password:
        return generic()
    creator = Member.objects.filter(pickup=pickup, is_creator=True).order_by("created_at").first()
    name = creator.user_name if creator and creator.user_name != "Creator" else ""
    if name:
        description = _("{name} invites you to add your photos and videos. One link, no accounts.")
    else:
        description = _("Add your photos and videos. One link, no accounts.")
    return LinkPreview(pickup.title or _("Untitled pickup"), description.format(name=name))


_META = re.compile(r'(<meta (?:property="og:(?:title|description)"|name="description") content=")[^"]*(")')


@lru_cache(maxsize=4)
def _index(path: Path, mtime: float) -> str:
    return path.read_text(encoding="utf-8")


def render_index(path: Path, preview: LinkPreview, image_url: str) -> str:
    """The SPA's index.html with the preview in its meta tags (the build ships generic ones)."""
    page = _index(path, path.stat().st_mtime)

    def fill(match: re.Match[str]) -> str:
        value = preview.title if "og:title" in match.group(1) else preview.description
        return f"{match.group(1)}{html.escape(value)}{match.group(2)}"

    page = _META.sub(fill, page)
    image = f'<meta property="og:image" content="{html.escape(image_url)}" />'
    return page.replace("</head>", f"    {image}\n  </head>", 1)
