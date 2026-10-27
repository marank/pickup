"""Membership: who is calling, creating pickups and joining them."""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.http import HttpRequest

from ..models import Folder, Member, Pickup

logger = logging.getLogger(__name__)


SESSION_KEY = "pickup_members"  # {pickup_id: member_id} of the pickups this browser belongs to


def get_member_from_request(request: HttpRequest, pickup: Pickup) -> Member | None:
    """The member this browser session is logged in as for the pickup, if any."""
    member_id = request.session.get(SESSION_KEY, {}).get(str(pickup.id))
    if not member_id:
        return None
    return Member.objects.select_related("folder").filter(id=member_id, pickup=pickup).first()


def login_member(request: HttpRequest, member: Member) -> None:
    """Remember the member in the session (other pickups' memberships are kept)."""
    memberships = dict(request.session.get(SESSION_KEY, {}))
    if not memberships:
        request.session.cycle_key()  # new session id on "login", against session fixation
    memberships[str(member.pickup_id)] = str(member.id)
    request.session[SESSION_KEY] = memberships


def logout_member(request: HttpRequest, pickup: Pickup) -> None:
    memberships = dict(request.session.get(SESSION_KEY, {}))
    memberships.pop(str(pickup.id), None)
    request.session[SESSION_KEY] = memberships


def member_for_key(pickup: Pickup, access_key: str) -> Member | None:
    if not access_key:
        return None
    return Member.objects.filter(pickup=pickup, access_key=access_key).first()


def create_pickup(title: str) -> tuple[Pickup, Member]:
    """Create a pickup together with its creator member."""
    pickup = Pickup.objects.create(title=title)
    creator = Member.objects.create(pickup=pickup, user_name="Creator", user_email="", is_creator=True)
    return pickup, creator


def join_pickup(pickup: Pickup, *, name: str, user_name: str, user_email: str) -> Member:
    """Create a folder and a member for a new participant."""
    folder = Folder.objects.create(pickup=pickup, name=name, user_name=user_name, user_email=user_email)
    return Member.objects.create(
        pickup=pickup, folder=folder, user_name=user_name, user_email=user_email, is_creator=False
    )


def send_share_email(member: Member, request: HttpRequest) -> None:
    """Send the member their personal link. Failures are logged, never raised."""
    member_url = request.build_absolute_uri(member.personal_path)
    subject = f"Your Pickup Share Link - {member.pickup.title or 'Untitled'}"
    message = f"""
Hello {member.user_name},

Thank you for joining the pickup! Here is your personal link:

{member_url}

You can use this link to access your pickup and upload media files.

Best regards,
Pickup Team
"""
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [member.user_email])
    except Exception:
        logger.exception("Could not send share link to member %s", member.id)
