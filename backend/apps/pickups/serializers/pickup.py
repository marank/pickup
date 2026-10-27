from rest_framework import serializers

from ..models import Pickup


class PickupSerializer(serializers.ModelSerializer[Pickup]):
    """Serializer for Pickup model."""

    folder_count = serializers.SerializerMethodField()
    media_count = serializers.SerializerMethodField()
    is_creator = serializers.SerializerMethodField()

    class Meta:
        model = Pickup
        fields = [
            "id",
            "title",
            "created_at",
            "is_active",
            "share_url",
            "folder_count",
            "media_count",
            "is_creator",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "share_url",
            "folder_count",
            "media_count",
            "is_creator",
        ]

    def get_folder_count(self, obj: Pickup) -> int:
        return obj.get_folder_count()

    def get_media_count(self, obj: Pickup) -> int:
        return obj.get_media_count()

    def get_is_creator(self, obj: Pickup) -> bool:
        """Check if the current authenticated member is the creator."""
        member = self.context.get("member")
        return bool(member and member.is_creator)


class PickupUpdateSerializer(serializers.ModelSerializer[Pickup]):
    """What the creator may change."""

    class Meta:
        model = Pickup
        fields = ["title"]
