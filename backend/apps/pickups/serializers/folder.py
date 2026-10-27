from rest_framework import serializers

from ..models import Folder


class FolderSerializer(serializers.ModelSerializer):
    """Serializer for Folder model."""

    media_count = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    member_id = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = [
            "id",
            "pickup",
            "name",
            "user_name",
            "user_email",
            "created_at",
            "media_count",
            "can_edit",
            "member_id",
        ]
        read_only_fields = ["id", "created_at", "media_count", "can_edit", "member_id"]
        extra_kwargs = {"user_email": {"required": False, "allow_blank": True}}

    def get_media_count(self, obj):
        return obj.get_media_count()

    def get_can_edit(self, obj):
        """Check if the current authenticated member owns this folder."""
        member = self.context.get("member")
        if member and member.folder:
            return member.folder_id == obj.id
        return False

    def get_member_id(self, obj):
        """Return the member ID for this folder if it exists."""
        if hasattr(obj, "member") and obj.member:
            return str(obj.member.id)
        return None


class CreateFolderSerializer(serializers.ModelSerializer):
    """Serializer for creating a new folder."""

    class Meta:
        model = Folder
        fields = ["name", "user_name", "user_email"]
        extra_kwargs = {"user_email": {"required": False, "allow_blank": True}}

    def validate_name(self, value):
        """Validate that folder name is unique within the pickup."""
        pickup_id = self.context.get("pickup_id")
        if pickup_id and Folder.objects.filter(pickup_id=pickup_id, name=value).exists():
            raise serializers.ValidationError("A folder with this name already exists in this pickup.")
        return value
