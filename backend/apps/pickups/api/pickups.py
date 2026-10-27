from typing import Any

from django.db.models import QuerySet
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Media, Pickup
from ..serializers import CreateFolderSerializer, FolderSerializer, MediaSerializer, PickupSerializer
from ..services.members import (
    create_pickup,
    get_member_from_request,
    join_pickup,
    member_path,
    send_share_email,
)


class PickupViewSet(viewsets.ModelViewSet):
    """ViewSet for Pickup operations."""

    serializer_class = PickupSerializer
    lookup_field = "id"

    def get_queryset(self) -> QuerySet[Pickup]:
        """Filter active pickups by default."""
        return Pickup.objects.filter(is_active=True)

    def get_serializer_context(self) -> dict[str, Any]:
        """Add member to serializer context."""
        context = super().get_serializer_context()
        if "id" in self.kwargs:
            member = get_member_from_request(self.request, self.get_object())
            if member:
                member.touch()
            context["member"] = member
        return context

    @action(detail=True, methods=["get"])
    def folders(self, request: Request, id: str | None = None) -> Response:
        """Get all folders in a pickup."""
        pickup = self.get_object()
        context = self.get_serializer_context()
        return Response(FolderSerializer(pickup.folders.all(), many=True, context=context).data)

    @action(detail=True, methods=["get"])
    def media(self, request: Request, id: str | None = None) -> Response:
        """Get all media in a pickup."""
        pickup = self.get_object()
        context = self.get_serializer_context()
        media = Media.objects.filter(folder__pickup=pickup)
        return Response(MediaSerializer(media, many=True, context=context).data)

    @action(detail=True, methods=["post"])
    def join(self, request: Request, id: str | None = None) -> Response:
        """Join a pickup and create/access user folder and member."""
        pickup = self.get_object()
        serializer = CreateFolderSerializer(data=request.data, context={"pickup_id": pickup.id})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        member, created = join_pickup(
            pickup, name=data["name"], user_name=data["user_name"], user_email=data.get("user_email", "")
        )
        if created and member.user_email:
            send_share_email(member, request)

        return Response(
            {
                "folder": FolderSerializer(member.folder, context={"member": member}).data,
                "member_id": str(member.id),
                "member_url": member_path(member),
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CreatePickupView(APIView):
    """Create a new pickup."""

    def post(self, request: Request) -> Response:
        """Create a new pickup and a creator member."""
        pickup, creator = create_pickup(request.data.get("title", ""))
        serializer = PickupSerializer(pickup, context={"member": creator})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
