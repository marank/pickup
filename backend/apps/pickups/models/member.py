import secrets
from typing import TYPE_CHECKING

from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel

if TYPE_CHECKING:
    from .folder import Folder


def generate_access_key() -> str:
    return secrets.token_urlsafe(32)


class Member(UUIDModel):
    """
    Represents a user (creator or member) of a pickup.

    Members have no account: their personal link carries `access_key`, which the SPA
    exchanges for a session (see api/pickups.py). The key is shown only to the member
    themselves; the id is never a credential.
    """

    pickup = models.ForeignKey(
        "pickups.Pickup",
        on_delete=models.CASCADE,
        related_name="members",
        help_text="The pickup this member belongs to",
    )
    folder = models.OneToOneField(
        "pickups.Folder",
        on_delete=models.CASCADE,
        related_name="member",
        null=True,
        blank=True,
        help_text="The member's folder (optional, e.g. for creator without folder)",
    )
    user_name = models.CharField(max_length=100, help_text="Display name of the member")
    email = models.EmailField(
        blank=True,
        help_text="Plain address; only kept while the pickup's e-mail privacy mode is off",
    )
    email_hash = models.CharField(
        max_length=64,
        blank=True,
        db_index=True,
        help_text="Keyed hash (HMAC) of the member's e-mail address, see services/identity.py",
    )
    invited_at = models.DateTimeField(
        null=True, blank=True, help_text="Set when the creator invited by e-mail"
    )
    intro_seen_at = models.DateTimeField(
        null=True, blank=True, help_text="When the member closed the intro shown after joining"
    )
    link_sent_at = models.DateTimeField(
        null=True, blank=True, help_text="Last personal-link mail, to throttle repeated requests"
    )
    is_creator = models.BooleanField(default=False, help_text="Whether this member is the pickup creator")
    access_key = models.CharField(max_length=64, unique=True, default=generate_access_key, editable=False)
    created_at = models.DateTimeField(default=timezone.now)
    last_active_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "members"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["pickup", "is_creator"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_name} in {self.pickup_id}"

    def touch(self) -> None:
        """Update last active timestamp."""
        self.last_active_at = timezone.now()
        self.save(update_fields=["last_active_at"])

    @property
    def personal_path(self) -> str:
        """SPA path of the member's personal link; contains the secret access key."""
        return f"/pickup/{self.pickup_id}/member/{self.access_key}"

    def owns(self, folder: Folder) -> bool:
        """Whether this member may change the folder: their own folder or a subfolder of it."""
        return self.folder_id is not None and self.folder_id == folder.top_level_id
