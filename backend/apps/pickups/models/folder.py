from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel


class Folder(UUIDModel):
    """
    Represents a user's folder within a pickup.
    Each folder belongs to one user and contains their media files.
    """

    pickup = models.ForeignKey(
        "pickups.Pickup",
        on_delete=models.CASCADE,
        related_name="folders",
        help_text="The pickup this folder belongs to",
    )
    name = models.CharField(
        max_length=100,
        validators=[
            RegexValidator(
                regex=r"^[a-zA-Z0-9\s\-_]+$",
                message="Folder name can only contain letters, numbers, spaces, hyphens, and underscores.",
            )
        ],
        help_text="Name of the folder",
    )
    user_name = models.CharField(max_length=100, help_text="Name of the user who created this folder")
    user_email = models.EmailField(blank=True, help_text="Optional email of the user who created this folder")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "folders"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["pickup", "name"], name="folders_unique_name_per_pickup"),
        ]
        indexes = [
            models.Index(fields=["pickup", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} by {self.user_name} ({self.pickup_id})"

    def get_media_count(self) -> int:
        """Returns the number of media files in this folder."""
        return self.media.count()
