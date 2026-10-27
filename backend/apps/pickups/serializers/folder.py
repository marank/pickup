from typing import Any

from rest_framework import serializers

from ..models import Folder
from ..models.folder import validate_folder_name


class FolderSerializer(serializers.ModelSerializer[Folder]):
    """Serializer for Folder model."""

    media_count = serializers.SerializerMethodField()
    subfolder_count = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = [
            "id",
            "pickup",
            "parent",
            "root",
            "name",
            "user_name",
            "created_at",
            "media_count",
            "subfolder_count",
            "can_edit",
        ]
        read_only_fields = fields

    def get_media_count(self, obj: Folder) -> int:
        return obj.get_media_count()

    def get_subfolder_count(self, obj: Folder) -> int:
        return obj.get_subfolder_count()

    def get_can_edit(self, obj: Folder) -> bool:
        """Check if the current authenticated member owns this folder."""
        member = self.context.get("member")
        return bool(member and member.owns(obj))


class CreateFolderSerializer(serializers.ModelSerializer[Folder]):
    """Serializer for creating a new folder."""

    class Meta:
        model = Folder
        fields = ["name", "user_name", "user_email"]
        extra_kwargs = {"user_email": {"required": False, "allow_blank": True}}

    def validate_name(self, value: str) -> str:
        """Validate that folder name is unique within the pickup."""
        pickup_id = self.context.get("pickup_id")
        if pickup_id and Folder.objects.filter(pickup_id=pickup_id, parent__isnull=True, name=value).exists():
            raise serializers.ValidationError("A folder with this name already exists in this pickup.")
        return value

    def validate_user_name(self, value: str) -> str:
        """Names identify people in a pickup; a taken name must not hand out its folder."""
        pickup_id = self.context.get("pickup_id")
        if (
            pickup_id
            and Folder.objects.filter(pickup_id=pickup_id, parent__isnull=True, user_name=value).exists()
        ):
            raise serializers.ValidationError(
                "This name is already taken in this pickup. If it is yours, open your personal link."
            )
        return value


class FolderNameSerializer(serializers.Serializer[Any]):
    """Name for a new or renamed folder."""

    name = serializers.CharField(max_length=100, validators=[validate_folder_name])

    def validate_name(self, value: str) -> str:
        return value.strip()
