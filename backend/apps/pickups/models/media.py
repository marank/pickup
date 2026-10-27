import uuid
from pathlib import PurePath

from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel

# No SVG: it can carry script and would run on our origin when opened directly.
IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp", "bmp"}
VIDEO_EXTENSIONS = {"mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"}
ALLOWED_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS


def file_extension(filename: str) -> str:
    return PurePath(filename).suffix.lower().removeprefix(".")


def media_type_for(filename: str) -> str:
    return "video" if file_extension(filename) in VIDEO_EXTENSIONS else "image"


def stored_name(filename: str) -> str:
    """Random file name with the original extension; media URLs must not be guessable."""
    return f"{uuid.uuid4().hex}.{file_extension(filename)}"


def media_upload_to(instance: object, filename: str) -> str:
    return timezone.now().strftime("%Y/%m/%d/") + stored_name(filename)


class Media(UUIDModel):
    """
    Represents a media file (image or video) uploaded to a folder.
    """

    MEDIA_TYPE_CHOICES = [
        ("image", "Image"),
        ("video", "Video"),
    ]

    folder = models.ForeignKey(
        "pickups.Folder",
        on_delete=models.CASCADE,
        related_name="media",
        help_text="The folder this media belongs to",
    )
    file = models.FileField(
        upload_to=media_upload_to,
        max_length=255,
        validators=[FileExtensionValidator(allowed_extensions=sorted(ALLOWED_EXTENSIONS))],
        help_text="The uploaded media file",
    )
    original_filename = models.CharField(max_length=255, help_text="Original filename of the uploaded file")
    media_type = models.CharField(
        max_length=10, choices=MEDIA_TYPE_CHOICES, help_text="Type of media (image or video)"
    )
    file_size = models.BigIntegerField(help_text="File size in bytes")
    uploaded_at = models.DateTimeField(default=timezone.now)

    # Optional metadata
    caption = models.TextField(blank=True, help_text="Optional caption for the media")

    class Meta:
        db_table = "media"
        ordering = ["-uploaded_at"]
        indexes = [
            models.Index(fields=["folder", "uploaded_at"]),
            models.Index(fields=["media_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.original_filename} in {self.folder.name}"

    def save(self, *args, **kwargs) -> None:  # type: ignore[no-untyped-def]
        """Automatically determine media type and file size before saving."""
        if self.file and not self.media_type:
            self.media_type = media_type_for(self.file.name)
        if self.file and not self.file_size:
            self.file_size = self.file.size
        if not self.original_filename:
            self.original_filename = self.file.name
        super().save(*args, **kwargs)

    @property
    def is_image(self) -> bool:
        """Check if this media is an image."""
        return self.media_type == "image"

    @property
    def is_video(self) -> bool:
        """Check if this media is a video."""
        return self.media_type == "video"

    def get_file_size_display(self) -> str:
        """Return human-readable file size."""
        if not self.file_size:
            return "Unknown size"

        size = float(self.file_size)
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
