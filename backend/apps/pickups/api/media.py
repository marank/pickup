from typing import Any

from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import Media, Pickup
from ..serializers import MediaSerializer
from ..services.members import get_member_from_request


class MediaViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    """Media is read by anyone with the pickup link; deleting and captions need the folder owner."""

    serializer_class = MediaSerializer
    lookup_field = "id"
    lookup_value_converter = "uuid"

    def get_queryset(self) -> QuerySet[Media]:
        """Get media for a specific folder."""
        return Media.objects.filter(
            folder_id=self.kwargs["folder_id"],
            folder__pickup_id=self.kwargs["pickup_id"],
            folder__pickup__is_active=True,
        )

    def get_serializer_context(self) -> dict[str, Any]:
        """Add member to serializer context."""
        context = super().get_serializer_context()
        pickup = get_object_or_404(Pickup, id=self.kwargs["pickup_id"], is_active=True)
        member = get_member_from_request(self.request, pickup)
        if member:
            member.touch()
        context["member"] = member
        return context

    def _member_can_edit(self, request: Request, media: Media) -> bool:
        """Check if the authenticated member can edit this media's folder."""
        member = get_member_from_request(request, media.folder.pickup)
        return member is not None and member.owns(media.folder_id)

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Delete a media file."""
        media = self.get_object()
        if not self._member_can_edit(request, media):
            return Response(
                {"error": "You do not have permission to delete this media."},
                status=status.HTTP_403_FORBIDDEN,
            )
        media.file.delete(save=False)
        media.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"])
    def caption(
        self,
        request: Request,
        pickup_id: str | None = None,
        folder_id: str | None = None,
        id: str | None = None,
    ) -> Response:
        """Update media caption."""
        media = self.get_object()
        if not self._member_can_edit(request, media):
            return Response(
                {"error": "You do not have permission to edit this media."},
                status=status.HTTP_403_FORBIDDEN,
            )
        media.caption = request.data.get("caption", "")
        media.save(update_fields=["caption"])
        return Response(self.get_serializer(media).data)
