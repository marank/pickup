from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel


class MediaChunk(UUIDModel):
    """
    Represents a single uploaded chunk for an upload session.
    """

    upload_session = models.ForeignKey(
        "pickups.UploadSession",
        on_delete=models.CASCADE,
        related_name="chunks",
        help_text="The upload session this chunk belongs to",
    )
    chunk_index = models.IntegerField(help_text="Index of this chunk")
    chunk_size = models.BigIntegerField(help_text="Size of this chunk in bytes")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "media_chunks"
        constraints = [
            models.UniqueConstraint(
                fields=["upload_session", "chunk_index"], name="media_chunks_unique_index_per_session"
            ),
        ]

    def __str__(self) -> str:
        return f"Chunk {self.chunk_index} of {self.upload_session.file_name}"
