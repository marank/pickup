"""Membership: who is calling, creating pickups and joining them."""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.http import HttpRequest

from ..models import Folder, Member, Pickup

logger = logging.getLogger(__name__)


def get_member_from_request(request: HttpRequest, pickup: Pickup) -> Member | None:
    """The member identified by the `member_id` query/form parameter, if it belongs to the pickup."""
    member_id = request.GET.get("member_id") or request.POST.get("member_id")
    if not member_id:
        return None
    try:
        return Member.objects.select_related("folder").get(id=member_id, pickup=pickup)
    except Member.DoesNotExist, ValueError:
        return None


def create_pickup(title: str) -> tuple[Pickup, Member]:
    """Create a pickup together with its creator member."""
    pickup = Pickup.objects.create(title=title)
    creator = Member.objects.create(pickup=pickup, user_name="Creator", user_email="", is_creator=True)
    return pickup, creator


def join_pickup(pickup: Pickup, *, name: str, user_name: str, user_email: str) -> tuple[Member, bool]:
    """Return the member for user_name in this pickup, creating folder and member if new."""
    existing_folder = Folder.objects.filter(pickup=pickup, user_name=user_name).first()
    if existing_folder:
        member, _ = Member.objects.get_or_create(
            folder=existing_folder,
            defaults={
                "pickup": pickup,
                "user_name": user_name,
                "user_email": user_email,
                "is_creator": False,
            },
        )
        member.touch()
        return member, False

    folder = Folder.objects.create(pickup=pickup, name=name, user_name=user_name, user_email=user_email)
    member = Member.objects.create(
        pickup=pickup, folder=folder, user_name=user_name, user_email=user_email, is_creator=False
    )
    return member, True


def member_path(member: Member) -> str:
    return f"/pickup/{member.pickup_id}/member/{member.id}"


def send_share_email(member: Member, request: HttpRequest) -> None:
    """Send the member their personal link. Failures are logged, never raised."""
    member_url = request.build_absolute_uri(member_path(member) + "/")
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
