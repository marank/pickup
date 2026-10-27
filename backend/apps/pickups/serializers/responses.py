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


class SessionRequestSerializer(serializers.Serializer[Any]):
    access_key = serializers.CharField()


class CaptionRequestSerializer(serializers.Serializer[Any]):
    caption = serializers.CharField(allow_blank=True)


class MessageSerializer(serializers.Serializer[Any]):
    message = serializers.CharField()


class ErrorSerializer(serializers.Serializer[Any]):
    error = serializers.CharField()
