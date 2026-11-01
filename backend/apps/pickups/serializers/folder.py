from typing import Any

from django.utils.translation import gettext as _
from rest_framework import serializers

from ..models import Folder
from ..models.folder import validate_folder_name
from ..services.access import can_delete_folder, can_edit
from ..services.identity import normalize_name
from ..services.members import folder_name_taken, name_taken


class FolderSerializer(serializers.ModelSerializer[Folder]):
    """Serializer for Folder model."""

    media_count = serializers.SerializerMethodField()
    subfolder_count = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    is_own = serializers.SerializerMethodField(
        help_text="Your folder or one inside it, also while you can't change it (read-only)"
    )
    can_delete = serializers.SerializerMethodField()

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
            "is_own",
            "can_delete",
        ]
        read_only_fields = fields

    def get_media_count(self, obj: Folder) -> int:
        return obj.get_media_count()

    def get_subfolder_count(self, obj: Folder) -> int:
        return obj.get_subfolder_count()

    def get_can_edit(self, obj: Folder) -> bool:
        """Check if the current authenticated member owns this folder."""
        member = self.context.get("member")
        return can_edit(member, obj)

    def get_is_own(self, obj: Folder) -> bool:
        member = self.context.get("member")
        return bool(member and member.owns(obj))

    def get_can_delete(self, obj: Folder) -> bool:
        """Owner or creator (moderation); never a member's top-level folder."""
        return can_delete_folder(self.context.get("member"), obj)


class JoinSerializer(serializers.Serializer[Any]):
    """Joining: the person's name, their top-level folder's name, optionally an address."""

    user_name = serializers.CharField(max_length=100)
    name = serializers.CharField(max_length=100, validators=[validate_folder_name])
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(
        required=False, allow_blank=True, help_text="The pickup's password, if it has one"
    )

    def validate_user_name(self, value: str) -> str:
        """Names identify people in a pickup; a taken name must not hand out its folder."""
        if name_taken(self.context["pickup"], value, exclude=self.context.get("member")):
            raise serializers.ValidationError(
                _("This name is already taken in this pickup. If it is yours, open your personal link.")
            )
        return normalize_name(value)

    def validate_name(self, value: str) -> str:
        if folder_name_taken(self.context["pickup"], value):
            raise serializers.ValidationError(_("A folder with this name already exists in this pickup."))
        return normalize_name(value)


class FolderNameSerializer(serializers.Serializer[Any]):
    """Name for a new or renamed folder."""

    name = serializers.CharField(max_length=100, validators=[validate_folder_name])

    def validate_name(self, value: str) -> str:
        return value.strip()
