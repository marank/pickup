from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel


class Member(UUIDModel):
    """
    Represents a user (creator or member) of a pickup.
    The member ID in the URL serves as the authentication token.
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
    user_email = models.EmailField(blank=True, help_text="Optional email of the member")
    is_creator = models.BooleanField(default=False, help_text="Whether this member is the pickup creator")
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

    def owns(self, folder_id: object) -> bool:
        """Whether this member may change the folder with the given id."""
        return self.folder_id is not None and self.folder_id == folder_id
