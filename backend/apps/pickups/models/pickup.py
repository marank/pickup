import uuid

from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel


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
