import uuid

from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.models import UUIDModel


class Visibility(models.TextChoices):
    MEMBERS = "members", "Only participants"
    LINK = "link", "Anyone with the link"
    CREATOR = "creator", "Nobody (closed)"


class JoinPolicy(models.TextChoices):
    OPEN = "open", "Anyone with the link"
    INVITE = "invite", "Only invited people"
    CLOSED = "closed", "Nobody new"


def live(prefix: str = "") -> Q:
    """Pickups that can be opened: active and not expired. `prefix` for lookups across relations."""
    return Q(**{f"{prefix}is_active": True}) & (
        Q(**{f"{prefix}expires_at__isnull": True}) | Q(**{f"{prefix}expires_at__gt": timezone.now()})
    )


class Pickup(UUIDModel):
    """
    Represents a shared space where users can upload and view media.
    Each pickup has a unique share link for access.
    """

    # The id is the share link, i.e. a secret: fully random UUIDv4 instead of the
    # time-ordered UUIDv7 of UUIDModel.
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, blank=True, help_text="Optional title for the pickup")
    created_at = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True, help_text="Whether this pickup is active")
    visibility = models.CharField(
        max_length=10,
        choices=Visibility.choices,
        default=Visibility.MEMBERS,
        help_text="Who can see folders and files",
    )
    email_privacy = models.BooleanField(
        default=True,
        help_text="Store e-mail addresses only as keyed hashes; off: also in plain text (creator sees them)",
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="When the pickup is deleted with all files (empty: never)",
    )
    storage_limit = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="Bytes for all files of the pickup; empty: PICKUP_STORAGE_LIMIT, 0: unlimited",
    )
    member_storage_limit = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="Bytes per participant; empty: MEMBER_STORAGE_LIMIT, 0: unlimited",
    )
    join_policy = models.CharField(
        max_length=10,
        choices=JoinPolicy.choices,
        default=JoinPolicy.OPEN,
        help_text="Who can become a participant",
    )
    password = models.CharField(
        max_length=128,
        blank=True,
        help_text="Hash of the pickup's password (make_password); empty: none",
    )
    access_version = models.PositiveIntegerField(
        default=0,
        help_text="Goes up when the password is set or changed; older logins stop counting",
    )

    class Meta:
        db_table = "pickups"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self) -> str:
        return f"Pickup {self.id} - {self.title or 'Untitled'}"

    @property
    def is_expired(self) -> bool:
        return self.expires_at is not None and self.expires_at <= timezone.now()

    @property
    def share_url(self) -> str:
        """Returns the share URL for this pickup."""
        return f"/pickup/{self.id}/"

    def get_folder_count(self) -> int:
        """Returns the number of folders in this pickup."""
        return self.folders.count()

    def get_media_count(self) -> int:
        """Returns the total number of media files in this pickup."""
        from .media import Media

        return Media.objects.filter(folder__pickup=self).count()
