from rest_framework import serializers

from ..models import MediaChunk, UploadSession


class UploadSessionSerializer(serializers.ModelSerializer):
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

    def get_missing_chunks(self, obj):
        """Return list of chunk indices that have not been uploaded."""
        existing = set(MediaChunk.objects.filter(upload_session=obj).values_list("chunk_index", flat=True))
        return [i for i in range(obj.total_chunks) if i not in existing]


class CreateUploadSessionSerializer(serializers.Serializer):
    """Serializer for creating an upload session."""

    file_name = serializers.CharField(max_length=255)
    file_size = serializers.IntegerField(min_value=1)
    media_type = serializers.CharField(max_length=10)
    chunk_size = serializers.IntegerField(required=False, default=5 * 1024 * 1024)
    caption = serializers.CharField(required=False, allow_blank=True)


class UploadChunkSerializer(serializers.Serializer):
    """Serializer for uploading a chunk."""

    chunk_index = serializers.IntegerField(min_value=0)
    chunk_size = serializers.IntegerField(required=False)
    chunk = serializers.FileField()
