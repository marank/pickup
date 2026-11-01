from typing import Any

from django.utils.translation import gettext as _
from rest_framework import serializers

from ..models import MediaChunk, UploadSession
from ..models.media import ALLOWED_EXTENSIONS, file_extension


class UploadSessionSerializer(serializers.ModelSerializer[UploadSession]):
    """Serializer for upload session."""

    progress_percentage = serializers.ReadOnlyField()
    missing_chunks = serializers.SerializerMethodField()

    class Meta:
        model = UploadSession
        fields = [
            "id",
            "folder",
            "file_name",
            "file_size",
            "chunk_size",
            "total_chunks",
            "uploaded_chunks",
            "progress_percentage",
            "media_type",
            "caption",
            "status",
            "error_message",
            "created_at",
            "completed_at",
            "missing_chunks",
        ]
        read_only_fields = [
            "id",
            "uploaded_chunks",
            "progress_percentage",
            "status",
            "error_message",
            "created_at",
            "completed_at",
            "missing_chunks",
        ]

    def get_missing_chunks(self, obj: UploadSession) -> list[int]:
        """Return list of chunk indices that have not been uploaded."""
        existing = set(MediaChunk.objects.filter(upload_session=obj).values_list("chunk_index", flat=True))
        return [i for i in range(obj.total_chunks) if i not in existing]


class CreateUploadSessionSerializer(serializers.Serializer[Any]):
    """Serializer for creating an upload session."""

    file_name = serializers.CharField(max_length=255)
    file_size = serializers.IntegerField(min_value=1)
    media_type = serializers.CharField(max_length=10, required=False)  # ignored, derived from file_name
    chunk_size = serializers.IntegerField(required=False, default=5 * 1024 * 1024)
    caption = serializers.CharField(required=False, allow_blank=True)

    def validate_file_name(self, value: str) -> str:
        """Same file types as direct uploads; the extension ends up in the stored file name."""
        if file_extension(value) not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                _("Only photos and videos can be uploaded; “{extension}” files aren't supported.").format(
                    extension=file_extension(value)
                )
            )
        return value


class UploadChunkSerializer(serializers.Serializer[Any]):
    """Serializer for uploading a chunk."""

    chunk_index = serializers.IntegerField(min_value=0)
    chunk_size = serializers.IntegerField(required=False)
    chunk = serializers.FileField()
