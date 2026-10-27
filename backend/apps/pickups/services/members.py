"""Membership: who is calling, creating pickups, joining, inviting and removing people."""

from datetime import timedelta

from django.db import transaction
from django.http import HttpRequest
from django.utils import timezone

from ..models import Folder, JoinPolicy, Media, Member, Pickup
from .folders import subtree_ids
from .identity import email_hash, normalize_name, remember_email
from .mail import send_personal_link

SESSION_KEY = "pickup_members"  # {pickup_id: member_id} of the pickups this browser belongs to
LINK_MAIL_COOLDOWN = timedelta(minutes=2)


class MembershipError(Exception):
    """A membership action that is not allowed; the message is shown to the user."""

    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.status = status


def get_member_from_request(request: HttpRequest, pickup: Pickup) -> Member | None:
    """The member this browser session is logged in as for the pickup, if any."""
    member_id = request.session.get(SESSION_KEY, {}).get(str(pickup.id))
    if not member_id:
        return None
    return Member.objects.select_related("folder", "pickup").filter(id=member_id, pickup=pickup).first()


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


def name_taken(pickup: Pickup, user_name: str, exclude: Member | None = None) -> bool:
    """Names identify people: no second "mark" next to "Mark", nor a lookalike with extra spaces."""
    others = Member.objects.filter(pickup=pickup, user_name__iexact=normalize_name(user_name))
    if exclude is not None:
        others = others.exclude(id=exclude.id)
    return others.exists()


def folder_name_taken(pickup: Pickup, name: str) -> bool:
    return Folder.objects.filter(
        pickup=pickup, parent__isnull=True, name__iexact=normalize_name(name)
    ).exists()


def create_pickup(
    request: HttpRequest, title: str, creator_name: str = "", creator_email: str = ""
) -> tuple[Pickup, Member]:
    """Create a pickup with its creator; mail the creator link if an address was given."""
    pickup = Pickup.objects.create(title=title)
    creator = Member(pickup=pickup, user_name=normalize_name(creator_name) or "Creator", is_creator=True)
    if creator_email:
        remember_email(creator, creator_email)
    creator.save()
    if creator_email:
        send_personal_link(creator, creator_email, request, "created")
    return pickup, creator


@transaction.atomic
def join_pickup(
    request: HttpRequest,
    pickup: Pickup,
    current: Member | None,
    *,
    name: str,
    user_name: str,
    email: str = "",
) -> Member:
    """
    Give a participant their folder. Someone already signed in without a folder (the
    creator, or an invited person) gets it on their membership; everyone else becomes a
    new member — if the pickup's join policy allows it.
    """
    if current is not None and current.folder_id is not None:
        raise MembershipError("You already have a folder in this pickup.")
    if current is None and pickup.join_policy == JoinPolicy.INVITE:
        raise MembershipError("This pickup is invite-only. Ask the creator for an invitation.", status=403)
    if current is None and pickup.join_policy == JoinPolicy.CLOSED:
        raise MembershipError("This pickup doesn't take new participants anymore.", status=403)

    user_name = normalize_name(user_name)
    if name_taken(pickup, user_name, exclude=current):
        raise MembershipError(
            "This name is already taken in this pickup. If it is yours, open your personal link."
        )
    if folder_name_taken(pickup, name):
        raise MembershipError("A folder with this name already exists in this pickup.")

    folder = Folder.objects.create(pickup=pickup, name=normalize_name(name), user_name=user_name)
    member = current or Member(pickup=pickup)
    member.folder = folder
    member.user_name = user_name
    if email:
        remember_email(member, email)
    member.save()
    if email:
        send_personal_link(member, email, request, "joined")
    return member


def set_email(request: HttpRequest, member: Member, email: str) -> None:
    """A participant adds (or changes) their address and gets their link mailed."""
    remember_email(member, email)
    member.save(update_fields=["email", "email_hash"])
    send_personal_link(member, email, request, "requested")


def request_link(request: HttpRequest, pickup: Pickup, email: str) -> None:
    """
    Mail the personal link to whoever has this address in the pickup. Callers answer the
    same either way, so nobody learns who participates; a cooldown stops mail bombing.
    """
    member = Member.objects.filter(pickup=pickup, email_hash=email_hash(email)).first()
    if member is None:
        return
    if member.link_sent_at and timezone.now() - member.link_sent_at < LINK_MAIL_COOLDOWN:
        return
    send_personal_link(member, email, request, "requested")


def invite(request: HttpRequest, pickup: Pickup, inviter: Member, email: str, name: str = "") -> Member:
    """Invite by e-mail (creator). Inviting a known address again just resends the link."""
    member = Member.objects.filter(pickup=pickup, email_hash=email_hash(email)).first()
    if member is None:
        name = normalize_name(name)
        if name and name_taken(pickup, name):
            raise MembershipError("Someone with this name is already in the pickup.")
        member = Member(pickup=pickup, user_name=name, invited_at=timezone.now())
        remember_email(member, email)
        member.save()
    elif not pickup.email_privacy and not member.email:
        remember_email(member, email)
        member.save(update_fields=["email", "email_hash"])
    send_personal_link(member, email, request, "invited", inviter=inviter)
    return member


def resend_invite(request: HttpRequest, member: Member, inviter: Member) -> None:
    """Without privacy mode the address is known, so the creator can resend with one click."""
    if not member.email:
        raise MembershipError("The address isn't stored (privacy mode). Enter it again to resend.")
    send_personal_link(member, member.email, request, "invited", inviter=inviter)


@transaction.atomic
def remove_member(member: Member) -> int:
    """Remove a participant with their folder and files; returns the number of deleted files."""
    if member.is_creator:
        raise MembershipError("The creator cannot be removed.")
    deleted = 0
    if member.folder is not None:
        for item in Media.objects.filter(folder_id__in=subtree_ids(member.folder)):
            item.file.delete(save=False)
            deleted += 1
        member.folder.delete()  # cascades to the member (OneToOne) and everything inside
    if Member.objects.filter(id=member.id).exists():
        member.delete()
    return deleted
