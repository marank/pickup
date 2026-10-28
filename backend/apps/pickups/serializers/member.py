from typing import Any

from rest_framework import serializers

from ..models import Member
from ..models.folder import validate_folder_name


class MemberSerializer(serializers.ModelSerializer[Member]):
    """A participant as the creator sees them (addresses only without privacy mode)."""

    has_folder = serializers.SerializerMethodField()
    invited = serializers.SerializerMethodField()
    has_email = serializers.SerializerMethodField()
    is_you = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = [
            "id",
            "user_name",
            "is_creator",
            "has_folder",
            "folder",
            "invited",
            "has_email",
            "email",
            "created_at",
            "last_active_at",
            "is_you",
        ]
        read_only_fields = fields

    def get_has_folder(self, obj: Member) -> bool:
        return obj.folder_id is not None

    def get_invited(self, obj: Member) -> bool:
        return obj.invited_at is not None

    def get_has_email(self, obj: Member) -> bool:
        return bool(obj.email_hash)

    def get_is_you(self, obj: Member) -> bool:
        current = self.context.get("member")
        return bool(current and current.id == obj.id)


class EmailSerializer(serializers.Serializer[Any]):
    email = serializers.EmailField()


class MemberDetailsSerializer(serializers.Serializer[Any]):
    """A participant's own name and the name of their top-level folder; both optional."""

    user_name = serializers.CharField(max_length=100, required=False)
    folder_name = serializers.CharField(max_length=100, required=False, validators=[validate_folder_name])


class EmailConfirmSerializer(serializers.Serializer[Any]):
    token = serializers.CharField()


class InviteSerializer(serializers.Serializer[Any]):
    email = serializers.EmailField()
    name = serializers.CharField(max_length=100, required=False, allow_blank=True)
