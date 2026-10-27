from typing import Any

from django.db.models import QuerySet
from rest_framework import mixins, status, viewsets
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
    login_member,
    logout_member,
    member_for_key,
    send_share_email,
)


class PickupViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """A pickup is read by anyone with its link; there is no listing, editing or deleting."""

    serializer_class = PickupSerializer
    lookup_field = "id"
    lookup_value_converter = "uuid"

    def get_queryset(self) -> QuerySet[Pickup]:
        return Pickup.objects.filter(is_active=True)

    def get_serializer_context(self) -> dict[str, Any]:
        """Add the session's member to the serializer context."""
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
        """Join a pickup: create folder and member, log this session in as that member."""
        pickup = self.get_object()
        serializer = CreateFolderSerializer(data=request.data, context={"pickup_id": pickup.id})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        member = join_pickup(
            pickup, name=data["name"], user_name=data["user_name"], user_email=data.get("user_email", "")
        )
        login_member(request, member)
        if member.user_email:
            send_share_email(member, request)

        return Response(
            {
                "folder": FolderSerializer(member.folder, context={"member": member}).data,
                # Shown once so the member can come back from another browser.
                "member_url": member.personal_path,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post", "delete"])
    def session(self, request: Request, id: str | None = None) -> Response:
        """POST {access_key}: log this browser in as the member; DELETE: leave."""
        pickup = self.get_object()
        if request.method == "DELETE":
            logout_member(request, pickup)
            return Response(status=status.HTTP_204_NO_CONTENT)

        member = member_for_key(pickup, str(request.data.get("access_key", "")))
        if member is None:
            return Response({"error": "This personal link is not valid."}, status=status.HTTP_403_FORBIDDEN)
        login_member(request, member)
        member.touch()
        return Response(PickupSerializer(pickup, context={"member": member}).data)


class CreatePickupView(APIView):
    """Create a new pickup."""

    def post(self, request: Request) -> Response:
        """Create a new pickup with its creator member and log this session in as creator."""
        pickup, creator = create_pickup(request.data.get("title", ""))
        login_member(request, creator)
        data = PickupSerializer(pickup, context={"member": creator}).data
        # The creator's personal link is only ever returned here.
        data["member_url"] = creator.personal_path
        return Response(data, status=status.HTTP_201_CREATED)
