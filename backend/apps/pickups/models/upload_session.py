import os
import shutil

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel


class UploadSession(UUIDModel):
    """
    Represents an upload session for chunked file uploads.
    Used for uploading very large media files in chunks.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("complete", "Complete"),
        ("error", "Error"),
        ("cancelled", "Cancelled"),
    ]

    folder = models.ForeignKey(
        "pickups.Folder",
        on_delete=models.CASCADE,
        related_name="upload_sessions",
        help_text="The folder this upload belongs to",
    )
    file_name = models.CharField(max_length=255, help_text="Original filename")
    file_size = models.BigIntegerField(help_text="Total file size in bytes")
    chunk_size = models.IntegerField(help_text="Size of each chunk in bytes", default=5 * 1024 * 1024)
    total_chunks = models.IntegerField(help_text="Total number of chunks")
    uploaded_chunks = models.IntegerField(default=0, help_text="Number of successfully uploaded chunks")
    media_type = models.CharField(max_length=10, help_text="Type of media (image or video)")
    caption = models.TextField(blank=True, help_text="Optional caption for the media")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    error_message = models.TextField(blank=True, help_text="Error message if upload failed")
    created_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "upload_sessions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["folder", "status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"Upload {self.file_name} ({self.uploaded_chunks}/{self.total_chunks})"

    @property
    def progress_percentage(self) -> int:
        if self.total_chunks == 0:
            return 0
        return int((self.uploaded_chunks / self.total_chunks) * 100)

    @property
    def chunks_dir(self) -> str:
        return os.path.join(settings.MEDIA_ROOT, "upload_chunks", str(self.id))

    def get_chunk_path(self, chunk_index: int) -> str:
        return os.path.join(self.chunks_dir, f"chunk_{chunk_index}")

    def chunk_exists(self, chunk_index: int) -> bool:
        return os.path.exists(self.get_chunk_path(chunk_index))

    def cleanup_chunks(self) -> None:
        """Remove temporary chunk files."""
        shutil.rmtree(self.chunks_dir, ignore_errors=True)
