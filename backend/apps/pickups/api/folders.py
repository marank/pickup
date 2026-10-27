from typing import Any

from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import Folder, Media, Pickup
from ..serializers import (
    ErrorSerializer,
    FolderSerializer,
    MediaSerializer,
    MessageSerializer,
    UploadMediaSerializer,
)
from ..services.members import get_member_from_request


class FolderViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet[Folder]):
    """Folders are read by anyone with the pickup link and changed only by their owner."""

    serializer_class = FolderSerializer
    lookup_field = "id"
    lookup_value_converter = "uuid"

    def get_queryset(self) -> QuerySet[Folder]:
        """Get folders for a specific pickup."""
        if getattr(self, "swagger_fake_view", False):  # schema generation has no URL kwargs
            return Folder.objects.none()
        return Folder.objects.filter(pickup_id=self.kwargs["pickup_id"], pickup__is_active=True)

    def get_serializer_context(self) -> dict[str, Any]:
        """Add member to serializer context."""
        context = dict(super().get_serializer_context())
        if getattr(self, "swagger_fake_view", False):
            return context
        pickup = get_object_or_404(Pickup, id=self.kwargs["pickup_id"], is_active=True)
        member = get_member_from_request(self.request, pickup)
        if member:
            member.touch()
        context["member"] = member
        return context

    @extend_schema(methods=["GET"], operation_id="folder_media_list", responses=MediaSerializer(many=True))
    @extend_schema(
        methods=["POST"],
        operation_id="folder_media_upload",
        request={"multipart/form-data": UploadMediaSerializer},
        responses={201: MediaSerializer, 403: ErrorSerializer},
    )
    @action(detail=True, methods=["get", "post"])
    def media(self, request: Request, pickup_id: str | None = None, id: str | None = None) -> Response:
        """Get or upload media for a folder."""
        folder = self.get_object()
        member = get_member_from_request(request, folder.pickup)

        if request.method == "GET":
            serializer = MediaSerializer(folder.media.all(), many=True, context={"member": member})
            return Response(serializer.data)

        if not member or not member.owns(folder.id):
            return Response(
                {"error": "You do not have permission to upload to this folder."},
                status=status.HTTP_403_FORBIDDEN,
            )

        upload = UploadMediaSerializer(data=request.data)
        if not upload.is_valid():
            return Response(upload.errors, status=status.HTTP_400_BAD_REQUEST)
        media = Media.objects.create(folder=folder, **upload.validated_data)
        return Response(
            MediaSerializer(media, context={"member": member}).data, status=status.HTTP_201_CREATED
        )

    @extend_schema(responses={200: MessageSerializer, 403: ErrorSerializer})
    @action(detail=True, methods=["delete"])
    def clear(self, request: Request, pickup_id: str | None = None, id: str | None = None) -> Response:
        """Clear all media from a folder."""
        folder = self.get_object()
        member = get_member_from_request(request, folder.pickup)
        if not member or not member.owns(folder.id):
            return Response(
                {"error": "You do not have permission to clear this folder."},
                status=status.HTTP_403_FORBIDDEN,
            )

        media_count = folder.media.count()
        for media in folder.media.all():
            media.file.delete(save=False)
        folder.media.all().delete()
        return Response({"message": f"Deleted {media_count} media files."})
