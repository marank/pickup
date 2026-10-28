from datetime import datetime
from typing import Any

from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from ..models import JoinPolicy, Pickup
from ..services.access import can_view, password_required
from ..services.storage import member_usage, pickup_usage


class StorageSerializer(serializers.Serializer[Any]):
    used = serializers.IntegerField(help_text="Bytes of all files (and uploads in progress)")
    limit = serializers.IntegerField(allow_null=True, help_text="Limit for the pickup; null: unlimited")
    own_used = serializers.IntegerField(allow_null=True, help_text="Bytes in your folders (members)")
    own_limit = serializers.IntegerField(allow_null=True, help_text="Your limit; null: unlimited")


class PickupSerializer(serializers.ModelSerializer[Pickup]):
    """Serializer for Pickup model."""

    folder_count = serializers.SerializerMethodField()
    media_count = serializers.SerializerMethodField()
    is_creator = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    has_folder = serializers.SerializerMethodField()
    member_name = serializers.SerializerMethodField()
    can_view = serializers.SerializerMethodField()
    storage = serializers.SerializerMethodField()
    password_required = serializers.SerializerMethodField(
        help_text="The pickup has a password and this browser isn't logged in: nothing else is shown"
    )
    has_password = serializers.SerializerMethodField(help_text="A password is set (only for the creator)")

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
            "storage",
            "password_required",
            "has_password",
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

    def to_representation(self, instance: Pickup) -> dict[str, Any]:
        data: dict[str, Any] = super().to_representation(instance)
        if data["password_required"]:
            data["title"] = ""  # the share link alone tells nothing about a protected pickup
        return data

    def get_password_required(self, obj: Pickup) -> bool:
        return password_required(obj, self._member())

    def get_has_password(self, obj: Pickup) -> bool:
        member = self._member()
        return bool(member and member.is_creator and obj.password)

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

    @extend_schema_field(StorageSerializer)
    def get_storage(self, obj: Pickup) -> dict[str, int | None]:
        """Bytes used and limits (null: unlimited); only for those who may see the pickup."""
        member = self._member()
        empty: dict[str, int | None] = {"used": 0, "limit": None, "own_used": None, "own_limit": None}
        if not can_view(obj, member):
            return empty
        usage = pickup_usage(obj)
        own = member_usage(member.folder) if member is not None and member.folder is not None else None
        return {
            "used": usage.used,
            "limit": usage.limit or None,
            "own_used": own.used if own else None,
            "own_limit": (own.limit or None) if own else None,
        }

    def get_is_creator(self, obj: Pickup) -> bool:
        """Check if the current authenticated member is the creator."""
        member = self.context.get("member")
        return bool(member and member.is_creator)


class PickupUpdateSerializer(serializers.ModelSerializer[Pickup]):
    """What the creator may change."""

    class Meta:
        model = Pickup
        fields = ["title", "visibility", "join_policy", "email_privacy", "expires_at", "password"]
        extra_kwargs = {
            "password": {
                "write_only": True,
                "required": False,
                "allow_blank": True,
                "help_text": "New password; empty removes it",
            }
        }

    def validate_password(self, value: str) -> str:
        if value and len(value) < 4:
            raise serializers.ValidationError("Use at least 4 characters.")
        return value

    def validate_expires_at(self, value: datetime | None) -> datetime | None:
        if value is not None and value <= timezone.now():
            raise serializers.ValidationError("Choose a date in the future.")
        return value


class CreatePickupSerializer(serializers.Serializer[Any]):
    """A new pickup; the creator may give a name and an address for their creator link."""

    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    creator_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    creator_email = serializers.EmailField(required=False, allow_blank=True)
    join_policy = serializers.ChoiceField(choices=JoinPolicy.choices, default=JoinPolicy.OPEN, required=False)
    code = serializers.CharField(
        max_length=100, required=False, allow_blank=True, help_text="Creation code (PICKUP_CREATION=code)"
    )

    def validate_join_policy(self, value: str) -> str:
        if value == JoinPolicy.CLOSED:
            raise serializers.ValidationError("A new pickup can't start closed.")
        return value
