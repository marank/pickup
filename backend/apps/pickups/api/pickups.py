from typing import Any

from django.db.models import QuerySet
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import Media, Pickup
from ..serializers import (
    CreatedPickupSerializer,
    CreateFolderSerializer,
    ErrorSerializer,
    FolderSerializer,
    JoinResponseSerializer,
    MediaSerializer,
    PickupSerializer,
    SessionSerializer,
)
from ..services.members import (
    create_pickup,
    get_member_from_request,
    join_pickup,
    login_member,
    logout_member,
    member_for_key,
    send_share_email,
)


class PickupViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet[Pickup]):
    """Anyone can create a pickup and read one with its link; no listing, editing or deleting."""

    serializer_class = PickupSerializer
    lookup_field = "id"
    lookup_value_converter = "uuid"

    def get_queryset(self) -> QuerySet[Pickup]:
        return Pickup.objects.filter(is_active=True)

    def get_serializer_context(self) -> dict[str, Any]:
        """Add the session's member to the serializer context."""
        context = dict(super().get_serializer_context())
        if "id" in self.kwargs:
            member = get_member_from_request(self.request, self.get_object())
            if member:
                member.touch()
            context["member"] = member
        return context

    @extend_schema(request=None, responses={201: CreatedPickupSerializer})
    def create(self, request: Request) -> Response:
        """Create a new pickup with its creator member and log this session in as creator."""
        title = request.data.get("title", "") if isinstance(request.data, dict) else ""
        pickup, creator = create_pickup(str(title))
        login_member(request, creator)
        data = CreatedPickupSerializer(pickup, context={"member": creator}).data
        return Response(data, status=status.HTTP_201_CREATED)

    @extend_schema(operation_id="pickup_folders_list", responses=FolderSerializer(many=True))
    @action(detail=True, methods=["get"])
    def folders(self, request: Request, id: str | None = None) -> Response:
        """Get all folders in a pickup."""
        pickup = self.get_object()
        context = self.get_serializer_context()
        return Response(FolderSerializer(pickup.folders.all(), many=True, context=context).data)

    @extend_schema(operation_id="pickup_media_list", responses=MediaSerializer(many=True))
    @action(detail=True, methods=["get"])
    def media(self, request: Request, id: str | None = None) -> Response:
        """Get all media in a pickup."""
        pickup = self.get_object()
        context = self.get_serializer_context()
        media = Media.objects.filter(folder__pickup=pickup)
        return Response(MediaSerializer(media, many=True, context=context).data)

    @extend_schema(request=CreateFolderSerializer, responses={201: JoinResponseSerializer})
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

        # The personal link is shown once so the member can come back from another browser.
        response = JoinResponseSerializer(
            {"folder": member.folder, "member_url": member.personal_path}, context={"member": member}
        )
        return Response(response.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        methods=["POST"],
        operation_id="pickup_session_create",
        request=SessionSerializer,
        responses={200: PickupSerializer, 403: ErrorSerializer},
    )
    @extend_schema(methods=["DELETE"], operation_id="pickup_session_destroy", responses={204: None})
    @action(detail=True, methods=["post", "delete"])
    def session(self, request: Request, id: str | None = None) -> Response:
        """POST {access_key}: log this browser in as the member; DELETE: leave."""
        pickup = self.get_object()
        if request.method == "DELETE":
            logout_member(request, pickup)
            return Response(status=status.HTTP_204_NO_CONTENT)

        key = SessionSerializer(data=request.data)
        member = member_for_key(pickup, key.validated_data["access_key"]) if key.is_valid() else None
        if member is None:
            return Response({"error": "This personal link is not valid."}, status=status.HTTP_403_FORBIDDEN)
        login_member(request, member)
        member.touch()
        return Response(PickupSerializer(pickup, context={"member": member}).data)
