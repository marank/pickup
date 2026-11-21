"""Storage limits per pickup and per participant, so nobody fills up the server's disk."""

from dataclasses import dataclass
from uuid import UUID

from django.conf import settings
from django.db.models import Q, Sum
from django.utils.translation import gettext as _

from apps.core.errors import UserError

from ..models import Folder, Media, Pickup, UploadSession


class StorageError(UserError):
    """An upload would go over a limit; the message is shown to the user."""

    status = 413


@dataclass(frozen=True)
class Usage:
    used: int
    limit: int  # 0: unlimited

    @property
    def free(self) -> int | None:
        return None if not self.limit else max(self.limit - self.used, 0)


def pickup_limit(pickup: Pickup) -> int:
    return pickup.storage_limit if pickup.storage_limit is not None else settings.PICKUP_STORAGE_LIMIT


def member_limit(pickup: Pickup) -> int:
    if pickup.member_storage_limit is not None:
        return pickup.member_storage_limit
    return int(settings.MEMBER_STORAGE_LIMIT)


def _sum(query: Q, exclude_session: UUID | None = None) -> int:
    """Stored files plus uploads in progress (their full size is reserved)."""
    stored = Media.objects.filter(query).aggregate(total=Sum("file_size"))["total"] or 0
    pending = UploadSession.objects.filter(query, status="pending")
    if exclude_session is not None:
        pending = pending.exclude(id=exclude_session)
    return int(stored + (pending.aggregate(total=Sum("file_size"))["total"] or 0))


def _in_tree(top_level_id: UUID) -> Q:
    return Q(folder_id=top_level_id) | Q(folder__root_id=top_level_id)


def pickup_usage(pickup: Pickup, exclude_session: UUID | None = None) -> Usage:
    return Usage(_sum(Q(folder__pickup=pickup), exclude_session), pickup_limit(pickup))


def member_usage(folder: Folder, exclude_session: UUID | None = None) -> Usage:
    """Everything in the participant's folder tree that `folder` belongs to."""
    return Usage(_sum(_in_tree(folder.top_level_id), exclude_session), member_limit(folder.pickup))


def format_size(size: int) -> str:
    value = float(size)
    for unit in ["B", "KB", "MB", "GB"]:
        if value < 1024:
            return f"{value:.0f} {unit}" if unit == "B" else f"{value:.1f} {unit}"
        value /= 1024
    return f"{value:.1f} TB"


def check_room(folder: Folder, size: int, exclude_session: UUID | None = None) -> None:
    """Raise StorageError if `size` more bytes in `folder` would exceed a limit."""
    for usage, message in [
        (
            member_usage(folder, exclude_session),
            _("Not enough space: {free} of {limit} left for your folders, the file has {size}."),
        ),
        (
            pickup_usage(folder.pickup, exclude_session),
            _("Not enough space: {free} of {limit} left for this pickup, the file has {size}."),
        ),
    ]:
        if usage.free is not None and size > usage.free:
            raise StorageError(
                message.format(
                    free=format_size(usage.free), limit=format_size(usage.limit), size=format_size(size)
                )
            )
