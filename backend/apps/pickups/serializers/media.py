from django.core.files.uploadedfile import UploadedFile
from rest_framework import serializers

from ..models import Media
from ..models.media import ALLOWED_EXTENSIONS, file_extension


class MediaSerializer(serializers.ModelSerializer[Media]):
    """Serializer for Media model."""

    file_size_display = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    owner_name = serializers.CharField(source="folder.user_name", read_only=True)
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
            "owner_name",
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

    def get_file_size_display(self, obj: Media) -> str:
        return obj.get_file_size_display()

    def get_can_edit(self, obj: Media) -> bool:
        """Check if the current authenticated member owns this media's folder."""
        member = self.context.get("member")
        return bool(member and member.owns(obj.folder))

    def get_is_image(self, obj: Media) -> bool:
        return obj.is_image

    def get_is_video(self, obj: Media) -> bool:
        return obj.is_video


class UploadMediaSerializer(serializers.ModelSerializer[Media]):
    """Serializer for uploading media files."""

    class Meta:
        model = Media
        fields = ["file", "caption"]
        extra_kwargs = {"caption": {"required": False, "allow_blank": True}}

    def validate_file(self, value: UploadedFile[bytes]) -> UploadedFile[bytes]:
        """Validate file size and type."""
        if file_extension(value.name or "") not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                "File type not supported. Please upload an image or video file."
            )

        return value
