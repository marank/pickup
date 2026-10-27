from datetime import datetime
from typing import Any

from django.utils import timezone
from rest_framework import serializers

from ..models import Pickup
from ..services.access import can_view


class PickupSerializer(serializers.ModelSerializer[Pickup]):
    """Serializer for Pickup model."""

    folder_count = serializers.SerializerMethodField()
    media_count = serializers.SerializerMethodField()
    is_creator = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    has_folder = serializers.SerializerMethodField()
    member_name = serializers.SerializerMethodField()
    can_view = serializers.SerializerMethodField()

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
            "is_member",
            "has_folder",
            "member_name",
            "can_view",
            "visibility",
            "join_policy",
            "email_privacy",
            "expires_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "share_url",
            "folder_count",
            "media_count",
            "is_creator",
            "is_member",
            "has_folder",
            "member_name",
            "can_view",
            "visibility",
            "join_policy",
            "email_privacy",
            "expires_at",
        ]

    def _member(self) -> Any:
        return self.context.get("member")

    def get_can_view(self, obj: Pickup) -> bool:
        return can_view(obj, self._member())

    def get_is_member(self, obj: Pickup) -> bool:
        return self._member() is not None

    def get_has_folder(self, obj: Pickup) -> bool:
        member = self._member()
        return bool(member and member.folder_id)

    def get_member_name(self, obj: Pickup) -> str:
        member = self._member()
        return member.user_name if member else ""

    def get_folder_count(self, obj: Pickup) -> int:
        """Private pickups don't tell outsiders how busy they are."""
        return obj.get_folder_count() if can_view(obj, self._member()) else 0

    def get_media_count(self, obj: Pickup) -> int:
        return obj.get_media_count() if can_view(obj, self._member()) else 0

    def get_is_creator(self, obj: Pickup) -> bool:
        """Check if the current authenticated member is the creator."""
        member = self.context.get("member")
        return bool(member and member.is_creator)


class PickupUpdateSerializer(serializers.ModelSerializer[Pickup]):
    """What the creator may change."""

    class Meta:
        model = Pickup
        fields = ["title", "visibility", "join_policy", "email_privacy", "expires_at"]

    def validate_expires_at(self, value: datetime | None) -> datetime | None:
        if value is not None and value <= timezone.now():
            raise serializers.ValidationError("Choose a date in the future.")
        return value


class CreatePickupSerializer(serializers.Serializer[Any]):
    """A new pickup; the creator may give a name and an address for their creator link."""

    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    creator_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    creator_email = serializers.EmailField(required=False, allow_blank=True)
