import uuid
from pathlib import PurePath
from typing import Any

from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import UUIDModel

# No SVG: it can carry script and would run on our origin when opened directly.
IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "heif"}
# iPhone photos (HEIC) show only in Safari: they get a JPEG to view (Media.display).
NEEDS_DISPLAY = {"heic", "heif"}
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


def thumbnail_upload_to(instance: object, filename: str) -> str:
    """Previews and display copies: random JPEG names next to the files."""
    return timezone.now().strftime("%Y/%m/%d/") + stored_name("preview.jpg")


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
        validators=[
            FileExtensionValidator(
                allowed_extensions=sorted(ALLOWED_EXTENSIONS),
                message=_("Only photos and videos can be uploaded; “%(extension)s” files aren't supported."),
            )
        ],
        help_text="The uploaded media file",
    )
    original_filename = models.CharField(max_length=255, help_text="Original filename of the uploaded file")
    media_type = models.CharField(
        max_length=10, choices=MEDIA_TYPE_CHOICES, help_text="Type of media (image or video)"
    )
    file_size = models.BigIntegerField(help_text="File size in bytes")
    thumbnail = models.FileField(
        upload_to=thumbnail_upload_to,
        max_length=255,
        blank=True,
        help_text="Small JPEG preview (services/thumbnails.py); tiles load it instead of the file",
    )
    display = models.FileField(
        upload_to=thumbnail_upload_to,
        max_length=255,
        blank=True,
        help_text="Large JPEG for the viewer, for formats browsers can't show (HEIC)",
    )
    sha256 = models.CharField(
        max_length=64,
        blank=True,
        db_index=True,
        help_text="Fingerprint of the file, to skip the same file twice (services/duplicates.py)",
    )
    uploaded_at = models.DateTimeField(default=timezone.now)
    taken_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="When it was taken (EXIF, video metadata), else the upload; empty until read",
    )

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

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Automatically determine media type and file size before saving."""
        name = self.file.name or ""
        if self.file and not self.media_type:
            self.media_type = media_type_for(name)
        if self.file and not self.file_size:
            self.file_size = self.file.size
        if not self.original_filename:
            self.original_filename = name
        super().save(*args, **kwargs)

    def delete_files(self) -> None:
        """Remove the file and its preview from disk (the row stays)."""
        self.file.delete(save=False)
        for preview in (self.thumbnail, self.display):
            if preview:
                preview.delete(save=False)

    @property
    def needs_display(self) -> bool:
        """Browsers (except Safari) can't show the file itself: the viewer gets a JPEG."""
        return file_extension(self.file.name or "") in NEEDS_DISPLAY

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
