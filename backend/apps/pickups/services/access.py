"""Who may see and change what in a pickup."""

from ..models import Folder, Media, Member, Pickup, Visibility


def can_view(pickup: Pickup, member: Member | None) -> bool:
    """Private pickups (the default) are only visible to participants."""
    return member is not None or pickup.visibility == Visibility.LINK


def can_delete_folder(member: Member | None, folder: Folder) -> bool:
    """Owners and the creator (moderation) delete subfolders; top-level folders go with their member."""
    if member is None or folder.parent_id is None:
        return False
    return member.owns(folder) or member.is_creator


def can_delete_media(member: Member | None, media: Media) -> bool:
    return member is not None and (member.owns(media.folder) or member.is_creator)
