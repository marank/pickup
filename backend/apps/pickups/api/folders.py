from typing import Any

from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import Folder, Media, Pickup, live
from ..serializers import (
    ErrorSerializer,
    FolderNameSerializer,
    FolderSerializer,
    MediaSerializer,
    MessageSerializer,
    UploadMediaSerializer,
)
from ..services.access import can_delete_folder, can_edit, can_view
from ..services.folders import FolderError, create_subfolder, delete_subfolder, rename_folder
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
        return Folder.objects.filter(live("pickup__"), pickup_id=self.kwargs["pickup_id"]).select_related(
            "pickup"
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

    def _deny_private(self, folder: Folder) -> Response | None:
        if can_view(folder.pickup, get_member_from_request(self.request, folder.pickup)):
            return None
        return Response({"error": "This pickup is private."}, status=status.HTTP_403_FORBIDDEN)

    @extend_schema(responses={200: FolderSerializer, 403: ErrorSerializer})
    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        denied = self._deny_private(self.get_object())
        return denied or super().retrieve(request, *args, **kwargs)

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
            denied = self._deny_private(folder)
            if denied:
                return denied
            items = folder.media.select_related("folder")
            serializer = MediaSerializer(items, many=True, context={"member": member})
            return Response(serializer.data)

        if not member or not can_edit(member, folder):
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
        if not member or not can_edit(member, folder):
            return Response(
                {"error": "You do not have permission to clear this folder."},
                status=status.HTTP_403_FORBIDDEN,
            )

        media_count = folder.media.count()
        for media in folder.media.all():
            media.file.delete(save=False)
        folder.media.all().delete()
        return Response({"message": f"Deleted {media_count} media files."})

    def _owned(self, request: Request) -> tuple[Folder, Response | None]:
        folder = self.get_object()
        member = get_member_from_request(request, folder.pickup)
        if not member or not can_edit(member, folder):
            return folder, Response(
                {"error": "Only the owner can change this folder."}, status=status.HTTP_403_FORBIDDEN
            )
        return folder, None

    @extend_schema(
        request=FolderNameSerializer,
        responses={201: FolderSerializer, 400: ErrorSerializer, 403: ErrorSerializer},
    )
    @action(detail=True, methods=["post"])
    def subfolders(self, request: Request, pickup_id: str | None = None, id: str | None = None) -> Response:
        """Create a subfolder (owner only)."""
        parent, denied = self._owned(request)
        if denied:
            return denied
        body = FolderNameSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        try:
            folder = create_subfolder(parent, body.validated_data["name"])
        except FolderError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(folder).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=FolderNameSerializer,
        responses={200: FolderSerializer, 400: ErrorSerializer, 403: ErrorSerializer},
    )
    def partial_update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Rename a folder (owner only)."""
        folder, denied = self._owned(request)
        if denied:
            return denied
        body = FolderNameSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        try:
            rename_folder(folder, body.validated_data["name"])
        except FolderError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(folder).data)

    @extend_schema(responses={204: None, 400: ErrorSerializer, 403: ErrorSerializer})
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Delete a subfolder and everything in it (owner, or the creator as moderator)."""
        folder = self.get_object()
        member = get_member_from_request(request, folder.pickup)
        if folder.parent_id is not None and not can_delete_folder(member, folder):
            return Response(
                {"error": "Only the owner can change this folder."}, status=status.HTTP_403_FORBIDDEN
            )
        try:
            delete_subfolder(folder)
        except FolderError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)
