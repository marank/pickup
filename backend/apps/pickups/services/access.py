"""Who may see and change what in a pickup."""

from ..models import Folder, Media, Member, Pickup, Visibility


def can_view(pickup: Pickup, member: Member | None) -> bool:
    """
    Private pickups (the default) are only visible to participants; closed ones only to the
    creator. With a password, "anyone with the link" also means participants only.
    """
    if pickup.is_expired:
        return False
    if pickup.visibility == Visibility.CREATOR:
        return member is not None and member.is_creator
    return member is not None or (pickup.visibility == Visibility.LINK and not pickup.password)


def password_required(pickup: Pickup, member: Member | None) -> bool:
    """This browser needs the pickup's password: it has one and the browser isn't logged in."""
    return bool(pickup.password) and member is None


def is_closed_for(pickup: Pickup, member: Member | None) -> bool:
    """A closed pickup is frozen for everyone but the creator: no viewing, joining or uploading."""
    if pickup.is_expired:
        return True
    return pickup.visibility == Visibility.CREATOR and not (member is not None and member.is_creator)


def can_edit(member: Member | None, folder: Folder) -> bool:
    """
    Owners change their folders and everything inside — unless the pickup is closed, or
    read-only (`read_only_at` passed; for the creator too, who still moderates).
    """
    return (
        member is not None
        and member.owns(folder)
        and not folder.pickup.is_read_only
        and not is_closed_for(folder.pickup, member)
    )


def can_delete_folder(member: Member | None, folder: Folder) -> bool:
    """Owners and the creator (moderation) delete subfolders; top-level folders go with their member."""
    if member is None or folder.parent_id is None:
        return False
    return can_edit(member, folder) or member.is_creator


def can_delete_media(member: Member | None, media: Media) -> bool:
    return member is not None and (can_edit(member, media.folder) or member.is_creator)
