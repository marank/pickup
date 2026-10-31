"""Request/response shapes that are not a model, for validation and the OpenAPI schema."""

from typing import Any

from rest_framework import serializers

from ..models import Pickup
from .folder import FolderSerializer
from .pickup import PickupSerializer


class CreatedPickupSerializer(PickupSerializer):
    """A new pickup plus the creator's personal link (only ever returned here)."""

    member_url = serializers.SerializerMethodField()

    class Meta(PickupSerializer.Meta):
        fields = [*PickupSerializer.Meta.fields, "member_url"]

    def get_member_url(self, obj: Pickup) -> str:
        return str(self.context["member"].personal_path)


class JoinResponseSerializer(serializers.Serializer[Any]):
    folder = FolderSerializer()
    member_url = serializers.CharField(help_text="Personal link with the secret access key")


class LinkPreviewSerializer(serializers.Serializer[Any]):
    """Whose personal link this is, shown before the browser is logged in with it."""

    title = serializers.CharField()
    user_name = serializers.CharField()
    is_creator = serializers.BooleanField()
    password_required = serializers.BooleanField(help_text="Logging in needs the pickup's password")


class PersonalLinkSerializer(serializers.Serializer[Any]):
    """A personal link: only for the member themselves and the pickup's creator."""

    member_url = serializers.CharField()
    has_email = serializers.BooleanField(help_text="An address is stored, so the link can be mailed again")


class SessionSerializer(serializers.Serializer[Any]):
    access_key = serializers.CharField()
    password = serializers.CharField(
        required=False, allow_blank=True, help_text="The pickup's password, if it has one"
    )


class CaptionSerializer(serializers.Serializer[Any]):
    caption = serializers.CharField(allow_blank=True)


class CreationSerializer(serializers.Serializer[Any]):
    """Who may create pickups on this server (PICKUP_CREATION)."""

    mode = serializers.ChoiceField(
        choices=["everyone", "code", "none"], help_text="code: every creation needs one of the codes"
    )


class CreationCodeSerializer(serializers.Serializer[Any]):
    code = serializers.CharField(max_length=100)


class MessageSerializer(serializers.Serializer[Any]):
    message = serializers.CharField()


class ErrorSerializer(serializers.Serializer[Any]):
    error = serializers.CharField()
