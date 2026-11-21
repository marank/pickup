"""Membership: who is calling, creating pickups, joining, inviting and removing people."""

from datetime import timedelta
from typing import Any

from django.contrib.auth.hashers import check_password, make_password
from django.core import signing
from django.db import transaction
from django.db.models import F, Q
from django.http import HttpRequest
from django.utils import timezone
from django.utils.translation import gettext as _

from apps.core.errors import UserError

from ..models import Folder, JoinPolicy, Media, Member, Pickup, UploadSession, live
from .access import is_closed_for
from .folders import FolderError, rename_folder, subtree_ids
from .identity import email_hash, forget_plain_emails, normalize_email, normalize_name, remember_email
from .mail import send_personal_link, send_pickup_list

SESSION_KEY = "pickup_members"  # {pickup_id: [member_id, access_version]} of this browser
LINK_MAIL_COOLDOWN = timedelta(minutes=2)
SESSION_RENEWED_KEY = "pickup_session_renewed"  # the day the session was last renewed
EMAIL_CHANGE_SALT = "pickups.email-change"
EMAIL_CHANGE_MAX_AGE = timedelta(days=1)


class MembershipError(UserError):
    """A membership action that is not allowed; the message is shown to the user."""


def get_member_from_request(request: HttpRequest, pickup: Pickup) -> Member | None:
    """The member this browser session is logged in as for the pickup, if any."""
    entry = request.session.get(SESSION_KEY, {}).get(str(pickup.id))
    if not entry:
        return None
    # Logins from before versions were stored count as version 0.
    member_id, version = (entry, 0) if isinstance(entry, str) else entry
    if version != pickup.access_version:
        return None  # the password was set or changed since: log in again
    member = Member.objects.select_related("folder", "pickup").filter(id=member_id, pickup=pickup).first()
    if member is not None:
        keep_session_alive(request)
    return member


def keep_session_alive(request: HttpRequest) -> None:
    """
    Using a pickup restarts the session's SESSION_DAYS; at most once a day, so not every
    request (uploads send many) writes the session.
    """
    today = timezone.localdate().isoformat()
    if request.session.get(SESSION_RENEWED_KEY) != today:
        # Any change saves the session with a fresh expiry, and the cookie is sent again.
        request.session[SESSION_RENEWED_KEY] = today


def login_member(request: HttpRequest, member: Member) -> None:
    """Remember the member in the session (other pickups' memberships are kept)."""
    memberships = dict(request.session.get(SESSION_KEY, {}))
    if not memberships:
        request.session.cycle_key()  # new session id on "login", against session fixation
    memberships[str(member.pickup_id)] = [str(member.id), member.pickup.access_version]
    request.session[SESSION_KEY] = memberships


def logout_member(request: HttpRequest, pickup: Pickup) -> None:
    memberships = dict(request.session.get(SESSION_KEY, {}))
    memberships.pop(str(pickup.id), None)
    request.session[SESSION_KEY] = memberships


def member_for_key(pickup: Pickup, access_key: str) -> Member | None:
    if not access_key:
        return None
    return Member.objects.filter(pickup=pickup, access_key=access_key).first()


def check_pickup_password(pickup: Pickup, password: str) -> bool:
    """No password set, or the right one."""
    return not pickup.password or check_password(password, pickup.password)


def set_pickup_password(request: HttpRequest, pickup: Pickup, creator: Member, password: str) -> None:
    """
    Set, change or (empty) remove the password. Setting or changing it logs everyone else out
    of the pickup (access_version); the creator who does it stays logged in.
    """
    if not password:
        Pickup.objects.filter(id=pickup.id).update(password="")
    else:
        Pickup.objects.filter(id=pickup.id).update(
            password=make_password(password), access_version=F("access_version") + 1
        )
    pickup.refresh_from_db(fields=["password", "access_version"])
    creator.pickup = pickup
    login_member(request, creator)


def update_pickup(request: HttpRequest, pickup: Pickup, creator: Member, data: dict[str, Any]) -> None:
    """
    Apply the creator's changes (validated `PickupUpdateSerializer` data). A new password ends
    other logins; switching e-mail privacy on forgets the plain addresses.
    """
    changes = dict(data)
    password = changes.pop("password", None)
    for field, value in changes.items():
        setattr(pickup, field, value)
    pickup.save()
    if password is not None:
        set_pickup_password(request, pickup, creator, password)
    if pickup.email_privacy:
        forget_plain_emails(pickup)


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


@transaction.atomic
def create_pickup(
    request: HttpRequest,
    title: str,
    creator_name: str = "",
    creator_email: str = "",
    join_policy: str = JoinPolicy.OPEN,
) -> tuple[Pickup, Member]:
    """
    Create a pickup with its creator; a creator who gives their name gets a folder named
    after them right away. Mail their personal link if an address was given.
    """
    pickup = Pickup.objects.create(title=title, join_policy=join_policy)
    name = normalize_name(creator_name)
    creator = Member(pickup=pickup, user_name=name or "Creator", is_creator=True)
    if name:
        creator.folder = Folder.objects.create(pickup=pickup, name=name, user_name=name)
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
        raise MembershipError(_("You already have a folder in this pickup."))
    if is_closed_for(pickup, current):
        raise MembershipError(_("This pickup is closed."), status=403)
    if pickup.is_read_only:
        raise MembershipError(_("This pickup is read-only now: nobody adds photos anymore."), status=403)
    if current is None and pickup.join_policy == JoinPolicy.INVITE:
        raise MembershipError(_("This pickup is invite-only. Ask the creator for an invitation."), status=403)
    if current is None and pickup.join_policy == JoinPolicy.CLOSED:
        raise MembershipError(_("This pickup doesn't take new participants anymore."), status=403)

    user_name = normalize_name(user_name)
    if name_taken(pickup, user_name, exclude=current):
        raise MembershipError(
            _("This name is already taken in this pickup. If it is yours, open your personal link.")
        )
    if folder_name_taken(pickup, name):
        raise MembershipError(_("A folder with this name already exists in this pickup."))

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


@transaction.atomic
def update_member(member: Member, *, user_name: str | None = None, folder_name: str | None = None) -> Member:
    """
    A participant changes their own name (unique like when joining; their folders show the new
    owner name) and/or the name of their top-level folder.
    """
    pickup = member.pickup
    if is_closed_for(pickup, member):
        raise MembershipError(_("This pickup is closed."), status=403)
    if user_name is not None:
        user_name = normalize_name(user_name)
        if not user_name:
            raise MembershipError(_("Enter a name."))
        if name_taken(pickup, user_name, exclude=member):
            raise MembershipError(_("This name is already taken in this pickup."))
        member.user_name = user_name
        member.save(update_fields=["user_name"])
        if member.folder_id is not None:
            Folder.objects.filter(Q(id=member.folder_id) | Q(root_id=member.folder_id)).update(
                user_name=user_name
            )
    if folder_name is not None:
        if pickup.is_read_only:
            raise MembershipError(_("This pickup is read-only now."), status=403)
        if member.folder is None:
            raise MembershipError(_("You don't have a folder in this pickup yet."))
        try:
            rename_folder(member.folder, normalize_name(folder_name))
        except FolderError as exc:
            raise MembershipError(str(exc)) from exc
    return member


def set_email(request: HttpRequest, member: Member, email: str) -> bool:
    """
    A participant adds their address and gets their link mailed. An address they already have
    is not replaced right away: the new one gets a confirmation link first (confirm_email).
    Returns whether a confirmation is pending.
    """
    if not member.email_hash or member.email_hash == email_hash(email):
        remember_email(member, email)
        member.save(update_fields=["email", "email_hash"])
        send_personal_link(member, email, request, "requested")
        return False
    if member.link_sent_at and timezone.now() - member.link_sent_at < LINK_MAIL_COOLDOWN:
        raise MembershipError(_("We just sent you a mail. Please wait a few minutes."), status=429)
    # The address travels signed in the link (after the #, so it never reaches the server's
    # logs); nothing is stored until it is confirmed, also not in privacy mode.
    token = signing.dumps(
        {"member": str(member.id), "email": normalize_email(email)}, salt=EMAIL_CHANGE_SALT, compress=True
    )
    link = request.build_absolute_uri(f"/pickup/{member.pickup_id}/confirm-email") + f"#{token}"
    send_personal_link(member, email, request, "confirm", link=link)
    return True


def confirm_email(pickup: Pickup, token: str) -> Member:
    """The link from the confirmation mail: store the new address."""
    try:
        data = signing.loads(token, salt=EMAIL_CHANGE_SALT, max_age=EMAIL_CHANGE_MAX_AGE)
    except signing.BadSignature as exc:  # also expired
        raise MembershipError(_("This confirmation link is not valid or has expired.")) from exc
    member = Member.objects.select_related("pickup").filter(id=data["member"], pickup=pickup).first()
    if member is None:
        raise MembershipError(_("This confirmation link is not valid or has expired."))
    others = Member.objects.filter(pickup=pickup, email_hash=email_hash(data["email"])).exclude(id=member.id)
    if others.exists():
        raise MembershipError(_("Someone else in this pickup already uses this address."))
    remember_email(member, data["email"])
    member.save(update_fields=["email", "email_hash"])
    return member


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


def request_pickup_list(request: HttpRequest, email: str) -> None:
    """
    Mail an address the live pickups it belongs to, with its personal links. Found by the hash,
    which is always stored (also in privacy mode). Callers answer the same either way; the
    cooldown of the members involved stops mail bombing.
    """
    members = list(
        Member.objects.filter(live("pickup__"), email_hash=email_hash(email))
        .select_related("pickup")
        .order_by("-pickup__created_at")
    )
    now = timezone.now()
    if not members or any(m.link_sent_at and now - m.link_sent_at < LINK_MAIL_COOLDOWN for m in members):
        return
    send_pickup_list(members, email, request)


def invite(request: HttpRequest, pickup: Pickup, inviter: Member, email: str, name: str = "") -> Member:
    """Invite by e-mail (creator). Inviting a known address again just resends the link."""
    member = Member.objects.filter(pickup=pickup, email_hash=email_hash(email)).first()
    if member is None:
        name = normalize_name(name)
        if name and name_taken(pickup, name):
            raise MembershipError(_("Someone with this name is already in the pickup."))
        member = Member(pickup=pickup, user_name=name, invited_at=timezone.now())
        remember_email(member, email)
        member.save()
    elif not pickup.email_privacy and not member.email:
        remember_email(member, email)
        member.save(update_fields=["email", "email_hash"])
    send_personal_link(member, email, request, "invited", inviter=inviter)
    return member


def mark_intro_seen(member: Member) -> None:
    """The intro after joining is closed; it doesn't open by itself again, on any device."""
    if member.intro_seen_at is None:
        member.intro_seen_at = timezone.now()
        member.save(update_fields=["intro_seen_at"])


def add_email(request: HttpRequest, member: Member, creator: Member, email: str) -> None:
    """
    The creator stores the address of a participant who has none yet, so they can have their
    link mailed later on their own. It goes to them right away, so a wrong address shows.
    An address a participant already has only they can change (set_email).
    """
    if member.email_hash:
        raise MembershipError(_("They already have an address; only they can change it."))
    if Member.objects.filter(pickup=member.pickup, email_hash=email_hash(email)).exists():
        raise MembershipError(_("Someone in the pickup already has this address."))
    remember_email(member, email)
    member.save(update_fields=["email", "email_hash"])
    send_personal_link(member, email, request, "added", inviter=creator)


def resend_invite(request: HttpRequest, member: Member, inviter: Member) -> None:
    """Without privacy mode the address is known, so the creator can resend with one click."""
    if not member.email:
        raise MembershipError(_("The address isn't stored (privacy mode). Enter it again to resend."))
    send_personal_link(member, member.email, request, "invited", inviter=inviter)


@transaction.atomic
def remove_member(member: Member) -> int:
    """Remove a participant with their folder and files; returns the number of deleted files."""
    if member.is_creator:
        raise MembershipError(_("The creator cannot be removed."))
    deleted = 0
    if member.folder is not None:
        for item in Media.objects.filter(folder_id__in=subtree_ids(member.folder)):
            item.delete_files()
            deleted += 1
        member.folder.delete()  # cascades to the member (OneToOne) and everything inside
    if Member.objects.filter(id=member.id).exists():
        member.delete()
    return deleted


@transaction.atomic
def delete_pickup(pickup: Pickup) -> int:
    """Delete a pickup for good: files on disk, unfinished uploads and every row; returns deleted files."""
    media = list(Media.objects.filter(folder__pickup=pickup))
    for session in UploadSession.objects.filter(folder__pickup=pickup):
        session.cleanup_chunks()
    pickup.delete()  # cascades to members, folders, media and upload sessions

    def delete_files() -> None:
        for item in media:
            item.delete_files()

    transaction.on_commit(delete_files)  # only once the rows are really gone
    return len(media)


def delete_expired_pickups() -> list[tuple[str, int]]:
    """Pickups whose expiry date has passed, with all their files: (id, files) of each."""
    expired = Pickup.objects.filter(expires_at__lte=timezone.now()).order_by("expires_at")
    return [(str(pickup.id), delete_pickup(pickup)) for pickup in expired]
