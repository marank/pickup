from rest_framework import serializers

from ..models import Pickup


class PickupSerializer(serializers.ModelSerializer):
    """Serializer for Pickup model."""

    folder_count = serializers.SerializerMethodField()
    media_count = serializers.SerializerMethodField()
    is_creator = serializers.SerializerMethodField()
    creator_member_id = serializers.SerializerMethodField()
    creator_member_url = serializers.SerializerMethodField()

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
            "creator_member_id",
            "creator_member_url",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "share_url",
            "folder_count",
            "media_count",
            "is_creator",
            "creator_member_id",
            "creator_member_url",
        ]

    def get_folder_count(self, obj):
        return obj.get_folder_count()

    def get_media_count(self, obj):
        return obj.get_media_count()

    def get_is_creator(self, obj):
        """Check if the current authenticated member is the creator."""
        member = self.context.get("member")
        if member:
            return member.is_creator
        return False

    def get_creator_member_id(self, obj):
        """Return the creator member ID for this pickup."""
        member = self.context.get("member")
        if member:
            return str(member.id)
        creator = obj.members.filter(is_creator=True).first()
        if creator:
            return str(creator.id)
        return None

    def get_creator_member_url(self, obj):
        """Return the creator member URL for this pickup."""
        creator_member_id = self.get_creator_member_id(obj)
        if creator_member_id:
            return f"/pickup/{obj.id}/member/{creator_member_id}"
        return None
