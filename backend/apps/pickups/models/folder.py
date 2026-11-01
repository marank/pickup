import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.translation import gettext as _

from apps.core.models import UUIDModel


def validate_folder_name(value: str) -> None:
    """Any characters except path separators: the address bar uses "/" between folders."""
    if "/" in value or "\\" in value:
        raise ValidationError(_("Folder names cannot contain / or \\."))
    if value.strip() in {"", ".", ".."}:
        raise ValidationError(_("Please enter a folder name."))


class Folder(UUIDModel):
    """
    A folder in a pickup. Top-level folders belong to one member each (their personal
    folder); members can nest subfolders inside their own folder to any depth.
    """

    pickup = models.ForeignKey(
        "pickups.Pickup",
        on_delete=models.CASCADE,
        related_name="folders",
        help_text="The pickup this folder belongs to",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="children",
        null=True,
        blank=True,
        help_text="Containing folder; empty for a member's top-level folder",
    )
    root = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="descendants",
        null=True,
        blank=True,
        help_text="The member's top-level folder this subfolder lives in; empty for top-level folders",
    )
    name = models.CharField(max_length=100, validators=[validate_folder_name], help_text="Name of the folder")
    user_name = models.CharField(max_length=100, help_text="Name of the member who owns this folder")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "folders"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["pickup", "name"],
                condition=Q(parent__isnull=True),
                name="folders_unique_top_level_name_per_pickup",
            ),
            models.UniqueConstraint(fields=["parent", "name"], name="folders_unique_name_per_parent"),
        ]
        indexes = [
            models.Index(fields=["pickup", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} by {self.user_name} ({self.pickup_id})"

    @property
    def top_level_id(self) -> uuid.UUID:
        """Id of the member's top-level folder this folder belongs to (itself if top-level)."""
        return self.root_id or self.id

    def get_media_count(self) -> int:
        """Returns the number of media files directly in this folder."""
        return self.media.count()

    def get_subfolder_count(self) -> int:
        return self.children.count()
