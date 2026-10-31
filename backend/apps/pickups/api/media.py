from typing import Any

from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import Media, Pickup, live
from ..serializers import CaptionSerializer, ErrorSerializer, MediaSerializer
from ..services.access import can_delete_media, can_edit, can_view
from ..services.members import get_member_from_request

_PICKUP_ID = OpenApiParameter("pickup_id", OpenApiTypes.UUID, OpenApiParameter.PATH)


@extend_schema_view(
    retrieve=extend_schema(parameters=[_PICKUP_ID], responses={200: MediaSerializer, 403: ErrorSerializer})
)
class MediaViewSet(mixins.RetrieveModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet[Media]):
    """Media is read by anyone with the pickup link; deleting and captions need the folder owner."""

    serializer_class = MediaSerializer
    lookup_field = "id"
    lookup_value_converter = "uuid"

    def get_queryset(self) -> QuerySet[Media]:
        """Get media for a specific folder."""
        if getattr(self, "swagger_fake_view", False):  # schema generation has no URL kwargs
            return Media.objects.none()
        return Media.objects.select_related("folder").filter(
            live("folder__pickup__"),
            folder_id=self.kwargs["folder_id"],
            folder__pickup_id=self.kwargs["pickup_id"],
        )

    def get_serializer_context(self) -> dict[str, Any]:
        """Add member to serializer context."""
        context = dict(super().get_serializer_context())
        if getattr(self, "swagger_fake_view", False):
            return context
        pickup = get_object_or_404(Pickup.objects.filter(live()), id=self.kwargs["pickup_id"])
        member = get_member_from_request(self.request, pickup)
        if member:
            member.touch()
        context["member"] = member
        return context

    def _member_can_edit(self, request: Request, media: Media) -> bool:
        """Check if the authenticated member can edit this media's folder."""
        member = get_member_from_request(request, media.folder.pickup)
        return can_edit(member, media.folder)

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        media = self.get_object()
        if not can_view(media.folder.pickup, get_member_from_request(request, media.folder.pickup)):
            return Response({"error": "This pickup is private."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(parameters=[_PICKUP_ID], responses={204: None, 403: ErrorSerializer})
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Delete a media file (owner, or the creator as moderator)."""
        media = self.get_object()
        if not can_delete_media(get_member_from_request(request, media.folder.pickup), media):
            return Response(
                {"error": "You do not have permission to delete this media."},
                status=status.HTTP_403_FORBIDDEN,
            )
        media.delete_files()
        media.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        parameters=[_PICKUP_ID],
        request=CaptionSerializer,
        responses={200: MediaSerializer, 403: ErrorSerializer},
    )
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
        caption = CaptionSerializer(data=request.data)
        caption.is_valid(raise_exception=True)
        media.caption = caption.validated_data["caption"]
        media.save(update_fields=["caption"])
        return Response(self.get_serializer(media).data)
