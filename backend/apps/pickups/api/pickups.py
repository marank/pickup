from typing import Any

from django.db.models import QuerySet
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import Media, Member, Pickup
from ..serializers import (
    CreatedPickupSerializer,
    CreatePickupSerializer,
    EmailSerializer,
    ErrorSerializer,
    FolderSerializer,
    JoinResponseSerializer,
    JoinSerializer,
    MediaSerializer,
    MessageSerializer,
    PickupSerializer,
    PickupUpdateSerializer,
    SessionSerializer,
)
from ..services.access import can_view
from ..services.identity import forget_plain_emails
from ..services.members import (
    MembershipError,
    create_pickup,
    get_member_from_request,
    join_pickup,
    login_member,
    logout_member,
    member_for_key,
    request_link,
    set_email,
)


def private() -> Response:
    return Response(
        {"error": "This pickup is private. Join it or open your personal link."},
        status=status.HTTP_403_FORBIDDEN,
    )


class PickupViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet[Pickup]):
    """Anyone with the link sees a pickup's title and settings; its contents follow its visibility."""

    serializer_class = PickupSerializer
    lookup_field = "id"
    lookup_value_converter = "uuid"

    def get_queryset(self) -> QuerySet[Pickup]:
        return Pickup.objects.filter(is_active=True)

    def _member(self) -> Member | None:
        if not hasattr(self, "_cached_member"):
            self._cached_member = get_member_from_request(self.request, self.get_object())
            if self._cached_member:
                self._cached_member.touch()
        return self._cached_member

    def get_serializer_context(self) -> dict[str, Any]:
        """Add the session's member to the serializer context."""
        context = dict(super().get_serializer_context())
        if "id" in self.kwargs:
            context["member"] = self._member()
        return context

    @extend_schema(request=CreatePickupSerializer, responses={201: CreatedPickupSerializer})
    def create(self, request: Request) -> Response:
        """Create a new pickup with its creator member and log this session in as creator."""
        body = CreatePickupSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        pickup, creator = create_pickup(
            request,
            body.validated_data.get("title", ""),
            body.validated_data.get("creator_name", ""),
            body.validated_data.get("creator_email", ""),
        )
        login_member(request, creator)
        data = CreatedPickupSerializer(pickup, context={"member": creator}).data
        return Response(data, status=status.HTTP_201_CREATED)

    @extend_schema(request=PickupUpdateSerializer, responses={200: PickupSerializer, 403: ErrorSerializer})
    def partial_update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Change title, visibility, join policy or e-mail privacy (creator only)."""
        pickup = self.get_object()
        member = self._member()
        if not member or not member.is_creator:
            return Response(
                {"error": "Only the creator can change the pickup."}, status=status.HTTP_403_FORBIDDEN
            )
        body = PickupUpdateSerializer(pickup, data=request.data, partial=True)
        body.is_valid(raise_exception=True)
        body.save()
        if pickup.email_privacy:
            forget_plain_emails(pickup)
        return Response(PickupSerializer(pickup, context={"member": member}).data)

    @extend_schema(
        operation_id="pickup_folders_list",
        responses={200: FolderSerializer(many=True), 403: ErrorSerializer},
    )
    @action(detail=True, methods=["get"])
    def folders(self, request: Request, id: str | None = None) -> Response:
        """Get all folders in a pickup."""
        pickup = self.get_object()
        if not can_view(pickup, self._member()):
            return private()
        folders = pickup.folders.select_related("pickup").all()
        return Response(FolderSerializer(folders, many=True, context=self.get_serializer_context()).data)

    @extend_schema(
        operation_id="pickup_media_list",
        responses={200: MediaSerializer(many=True), 403: ErrorSerializer},
    )
    @action(detail=True, methods=["get"])
    def media(self, request: Request, id: str | None = None) -> Response:
        """Get all media in a pickup."""
        pickup = self.get_object()
        if not can_view(pickup, self._member()):
            return private()
        media = Media.objects.filter(folder__pickup=pickup).select_related("folder")
        return Response(MediaSerializer(media, many=True, context=self.get_serializer_context()).data)

    @extend_schema(
        request=JoinSerializer,
        responses={201: JoinResponseSerializer, 400: ErrorSerializer, 403: ErrorSerializer},
    )
    @action(detail=True, methods=["post"])
    def join(self, request: Request, id: str | None = None) -> Response:
        """Get a folder: as a new participant, or as the signed-in creator/invited person."""
        pickup = self.get_object()
        member = self._member()
        body = JoinSerializer(data=request.data, context={"pickup": pickup, "member": member})
        if not body.is_valid():
            return Response(body.errors, status=status.HTTP_400_BAD_REQUEST)
        data = body.validated_data
        try:
            member = join_pickup(
                request,
                pickup,
                member,
                name=data["name"],
                user_name=data["user_name"],
                email=data.get("email", ""),
            )
        except MembershipError as exc:
            return Response({"error": str(exc)}, status=exc.status)
        login_member(request, member)
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

    @extend_schema(request=EmailSerializer, responses={200: MessageSerializer, 403: ErrorSerializer})
    @action(detail=True, methods=["post"], url_path="session/email")
    def session_email(self, request: Request, id: str | None = None) -> Response:
        """The signed-in participant adds their address and gets their personal link mailed."""
        member = self._member()
        if member is None:
            return Response({"error": "Join the pickup first."}, status=status.HTTP_403_FORBIDDEN)
        body = EmailSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        set_email(request, member, body.validated_data["email"])
        return Response({"message": "We sent you your personal link."})

    @extend_schema(request=EmailSerializer, responses={202: MessageSerializer})
    @action(detail=True, methods=["post"], url_path="link-request")
    def link_request(self, request: Request, id: str | None = None) -> Response:
        """Mail the personal link to a known address. Same answer for unknown ones."""
        body = EmailSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        request_link(request, self.get_object(), body.validated_data["email"])
        return Response(
            {"message": "If this address belongs to someone in this pickup, their link is on its way."},
            status=status.HTTP_202_ACCEPTED,
        )
