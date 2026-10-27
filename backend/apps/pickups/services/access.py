"""Who may see and change what in a pickup."""

from ..models import Folder, Media, Member, Pickup, Visibility


def can_view(pickup: Pickup, member: Member | None) -> bool:
    """Private pickups (the default) are only visible to participants; closed ones only to the creator."""
    if pickup.visibility == Visibility.CREATOR:
        return member is not None and member.is_creator
    return member is not None or pickup.visibility == Visibility.LINK


def is_closed_for(pickup: Pickup, member: Member | None) -> bool:
    """A closed pickup is frozen for everyone but the creator: no viewing, joining or uploading."""
    return pickup.visibility == Visibility.CREATOR and not (member is not None and member.is_creator)


def can_edit(member: Member | None, folder: Folder) -> bool:
    """Owners change their folders and everything inside — unless the pickup is closed."""
    return member is not None and member.owns(folder) and not is_closed_for(folder.pickup, member)


def can_delete_folder(member: Member | None, folder: Folder) -> bool:
    """Owners and the creator (moderation) delete subfolders; top-level folders go with their member."""
    if member is None or folder.parent_id is None:
        return False
    return can_edit(member, folder) or member.is_creator


def can_delete_media(member: Member | None, media: Media) -> bool:
    return member is not None and (can_edit(member, media.folder) or member.is_creator)
