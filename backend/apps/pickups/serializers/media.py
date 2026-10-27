from rest_framework import serializers

from ..models import Media
from ..models.media import ALLOWED_EXTENSIONS


class MediaSerializer(serializers.ModelSerializer):
    """Serializer for Media model."""

    file_size_display = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    is_image = serializers.SerializerMethodField()
    is_video = serializers.SerializerMethodField()

    class Meta:
        model = Media
        fields = [
            "id",
            "folder",
            "file",
            "original_filename",
            "media_type",
            "file_size",
            "file_size_display",
            "uploaded_at",
            "caption",
            "can_edit",
            "is_image",
            "is_video",
        ]
        read_only_fields = [
            "id",
            "file_size",
            "file_size_display",
            "uploaded_at",
            "can_edit",
            "is_image",
            "is_video",
        ]

    def get_file_size_display(self, obj):
        return obj.get_file_size_display()

    def get_can_edit(self, obj):
        """Check if the current authenticated member owns this media's folder."""
        member = self.context.get("member")
        if member and member.folder:
            return member.folder_id == obj.folder_id
        return False

    def get_is_image(self, obj):
        return obj.is_image

    def get_is_video(self, obj):
        return obj.is_video


class UploadMediaSerializer(serializers.ModelSerializer):
    """Serializer for uploading media files."""

    class Meta:
        model = Media
        fields = ["file", "caption"]
        extra_kwargs = {"caption": {"required": False, "allow_blank": True}}

    def validate_file(self, value):
        """Validate file size and type."""
        extension = value.name.lower().rsplit(".", 1)[-1]
        if extension not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                "File type not supported. Please upload an image or video file."
            )

        return value
