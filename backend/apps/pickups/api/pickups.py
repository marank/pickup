from typing import Any
from urllib.parse import quote
from uuid import UUID

from django.db.models import QuerySet
from django.http import HttpResponseBase, StreamingHttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import JoinPolicy, Media, Member, Pickup, live
from ..serializers import (
    CreatedPickupSerializer,
    CreatePickupSerializer,
    CreationCodeSerializer,
    CreationSerializer,
    EmailConfirmSerializer,
    EmailSerializer,
    ErrorSerializer,
    FolderSerializer,
    JoinResponseSerializer,
    JoinSerializer,
    LinkPreviewSerializer,
    MediaSerializer,
    MemberDetailsSerializer,
    MessageSerializer,
    PersonalLinkSerializer,
    PickupSerializer,
    PickupUpdateSerializer,
    SessionSerializer,
)
from ..services.access import can_view
from ..services.archive import collect, safe_name, stream
from ..services.creation import creation_mode, creation_refused
from ..services.identity import forget_plain_emails
from ..services.members import (
    MembershipError,
    check_pickup_password,
    confirm_email,
    create_pickup,
    delete_pickup,
    get_member_from_request,
    join_pickup,
    login_member,
    logout_member,
    mark_intro_seen,
    member_for_key,
    request_link,
    request_pickup_list,
    set_email,
    set_pickup_password,
    update_member,
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
        return Pickup.objects.filter(live())

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

    @extend_schema(
        request=CreatePickupSerializer, responses={201: CreatedPickupSerializer, 403: ErrorSerializer}
    )
    def create(self, request: Request) -> Response:
        """Create a new pickup with its creator member and log this session in as creator."""
        body = CreatePickupSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        refused = creation_refused(body.validated_data.get("code", ""))
        if refused:
            return Response({"error": refused}, status=status.HTTP_403_FORBIDDEN)
        pickup, creator = create_pickup(
            request,
            body.validated_data.get("title", ""),
            body.validated_data.get("creator_name", ""),
            body.validated_data.get("creator_email", ""),
            body.validated_data.get("join_policy", JoinPolicy.OPEN),
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
        password = body.validated_data.pop("password", None)
        body.save()
        if password is not None:
            set_pickup_password(request, pickup, member, password)
        if pickup.email_privacy:
            forget_plain_emails(pickup)
        return Response(PickupSerializer(pickup, context={"member": member}).data)

    @extend_schema(responses={204: None, 403: ErrorSerializer})
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Delete the pickup with all folders and files for good (creator only)."""
        pickup = self.get_object()
        member = self._member()
        if not member or not member.is_creator:
            return Response(
                {"error": "Only the creator can delete the pickup."}, status=status.HTTP_403_FORBIDDEN
            )
        delete_pickup(pickup)
        logout_member(request, pickup)
        return Response(status=status.HTTP_204_NO_CONTENT)

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
        operation_id="pickup_download",
        parameters=[
            OpenApiParameter(
                "folders", str, description="Comma-separated folder ids (with everything inside)"
            ),
            OpenApiParameter("media", str, description="Comma-separated file ids"),
        ],
        responses={(200, "application/zip"): OpenApiTypes.BINARY, 400: ErrorSerializer, 403: ErrorSerializer},
    )
    @action(detail=True, methods=["get"])
    def download(self, request: Request, id: str | None = None) -> HttpResponseBase:
        """A ZIP of the selected folders and files; nothing selected: the whole pickup."""
        pickup = self.get_object()
        if not can_view(pickup, self._member()):
            return private()
        try:
            folder_ids = [UUID(v) for v in request.query_params.get("folders", "").split(",") if v]
            media_ids = [UUID(v) for v in request.query_params.get("media", "").split(",") if v]
        except ValueError:
            return Response({"error": "Invalid id."}, status=status.HTTP_400_BAD_REQUEST)
        entries = collect(pickup, folder_ids, media_ids)
        if not entries:
            return Response({"error": "Nothing to download."}, status=status.HTTP_400_BAD_REQUEST)
        top = {entry.path.split("/")[0] for entry in entries}
        name = top.pop() if len(top) == 1 and folder_ids else safe_name(pickup.title or "pickup")
        response = StreamingHttpResponse(stream(entries), content_type="application/zip")
        response["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(name.removesuffix('/'))}.zip"
        response["Cache-Control"] = "private, no-store"
        response["X-Accel-Buffering"] = "no"  # nginx passes the stream on as it comes
        return response

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
        # Before anything else, so a wrong password learns nothing (not even taken names).
        password = str(request.data.get("password", "")) if isinstance(request.data, dict) else ""
        if member is None and not check_pickup_password(pickup, password):
            return Response({"error": "Wrong password."}, status=status.HTTP_403_FORBIDDEN)
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
    @extend_schema(
        methods=["PATCH"],
        operation_id="pickup_session_partial_update",
        request=MemberDetailsSerializer,
        responses={200: PickupSerializer, 400: ErrorSerializer, 403: ErrorSerializer},
    )
    @extend_schema(methods=["DELETE"], operation_id="pickup_session_destroy", responses={204: None})
    @action(detail=True, methods=["post", "patch", "delete"])
    def session(self, request: Request, id: str | None = None) -> Response:
        """POST {access_key}: log this browser in as the member; PATCH {user_name, folder_name}:
        change your name and your folder's; DELETE: leave."""
        pickup = self.get_object()
        if request.method == "DELETE":
            logout_member(request, pickup)
            return Response(status=status.HTTP_204_NO_CONTENT)
        if request.method == "PATCH":
            return self._update_member(request, pickup)

        key = SessionSerializer(data=request.data)
        member = member_for_key(pickup, key.validated_data["access_key"]) if key.is_valid() else None
        if member is None:
            return Response({"error": "This personal link is not valid."}, status=status.HTTP_403_FORBIDDEN)
        current = self._member()
        already = current is not None and current.id == member.id
        if not already and not check_pickup_password(pickup, key.validated_data.get("password", "")):
            return Response({"error": "Wrong password."}, status=status.HTTP_403_FORBIDDEN)
        login_member(request, member)
        member.touch()
        return Response(PickupSerializer(pickup, context={"member": member}).data)

    def _update_member(self, request: Request, pickup: Pickup) -> Response:
        member = self._member()
        if member is None:
            return Response({"error": "Join the pickup first."}, status=status.HTTP_403_FORBIDDEN)
        body = MemberDetailsSerializer(data=request.data)
        if not body.is_valid():
            return Response(body.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            update_member(
                member,
                user_name=body.validated_data.get("user_name"),
                folder_name=body.validated_data.get("folder_name"),
            )
        except MembershipError as exc:
            return Response({"error": str(exc)}, status=exc.status)
        return Response(PickupSerializer(pickup, context={"member": member}).data)

    @extend_schema(request=SessionSerializer, responses={200: LinkPreviewSerializer, 403: ErrorSerializer})
    @action(detail=True, methods=["post"], url_path="session/preview")
    def session_preview(self, request: Request, id: str | None = None) -> Response:
        """Whose personal link this is, without logging in (the SPA asks before it does)."""
        pickup = self.get_object()
        key = SessionSerializer(data=request.data)
        member = member_for_key(pickup, key.validated_data["access_key"]) if key.is_valid() else None
        if member is None:
            return Response({"error": "This personal link is not valid."}, status=status.HTTP_403_FORBIDDEN)
        current = self._member()
        data = {
            "title": pickup.title,
            "user_name": member.user_name,
            "is_creator": member.is_creator,
            "password_required": bool(pickup.password) and not (current and current.id == member.id),
        }
        response = Response(LinkPreviewSerializer(data).data)
        response["Cache-Control"] = "private, no-store"
        return response

    @extend_schema(responses={200: PersonalLinkSerializer, 403: ErrorSerializer})
    @action(detail=True, methods=["get"], url_path="session/link")
    def session_link(self, request: Request, id: str | None = None) -> Response:
        """Your own personal link, to copy it again (only while this browser is signed in as you)."""
        member = self._member()
        if member is None:
            return Response({"error": "Join the pickup first."}, status=status.HTTP_403_FORBIDDEN)
        data = {"member_url": member.personal_path, "has_email": bool(member.email_hash)}
        response = Response(PersonalLinkSerializer(data).data)
        response["Cache-Control"] = "private, no-store"
        return response

    @extend_schema(request=None, responses={204: None, 403: ErrorSerializer})
    @action(detail=True, methods=["post"], url_path="session/intro")
    def session_intro(self, request: Request, id: str | None = None) -> Response:
        """The signed-in member has closed the intro, so it doesn't open by itself again."""
        member = self._member()
        if member is None:
            return Response({"error": "Join the pickup first."}, status=status.HTTP_403_FORBIDDEN)
        mark_intro_seen(member)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        request=EmailSerializer,
        responses={200: MessageSerializer, 403: ErrorSerializer, 429: ErrorSerializer},
    )
    @action(detail=True, methods=["post"], url_path="session/email")
    def session_email(self, request: Request, id: str | None = None) -> Response:
        """
        The signed-in participant adds their address and gets their personal link mailed; a
        different address than the stored one only gets a confirmation link.
        """
        member = self._member()
        if member is None:
            return Response({"error": "Join the pickup first."}, status=status.HTTP_403_FORBIDDEN)
        body = EmailSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        try:
            pending = set_email(request, member, body.validated_data["email"])
        except MembershipError as exc:
            return Response({"error": str(exc)}, status=exc.status)
        if pending:
            return Response({"message": "We sent a confirmation link to the new address."})
        return Response({"message": "We sent you your personal link."})

    @extend_schema(request=EmailConfirmSerializer, responses={200: MessageSerializer, 400: ErrorSerializer})
    @action(detail=True, methods=["post"], url_path="session/email/confirm")
    def session_email_confirm(self, request: Request, id: str | None = None) -> Response:
        """The link from the confirmation mail: store the new address (no session needed)."""
        pickup = self.get_object()
        body = EmailConfirmSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        try:
            confirm_email(pickup, body.validated_data["token"])
        except MembershipError as exc:
            return Response({"error": str(exc)}, status=exc.status)
        return Response({"message": "Your new address is confirmed."})

    @extend_schema(
        methods=["GET"], operation_id="pickup_creation_retrieve", responses={200: CreationSerializer}
    )
    @extend_schema(
        methods=["POST"],
        operation_id="pickup_creation_check",
        request=CreationCodeSerializer,
        responses={200: CreationSerializer, 403: ErrorSerializer},
    )
    @action(detail=False, methods=["get", "post"], url_path="creation")
    def creation(self, request: Request) -> Response:
        """
        GET: who may create pickups; POST {code}: check a code before showing the create page.
        Nothing is remembered: creating sends the code again.
        """
        if request.method == "POST":
            body = CreationCodeSerializer(data=request.data)
            body.is_valid(raise_exception=True)
            refused = creation_refused(body.validated_data["code"])
            if refused:
                return Response({"error": refused}, status=status.HTTP_403_FORBIDDEN)
        return Response(CreationSerializer({"mode": creation_mode()}).data)

    @extend_schema(request=EmailSerializer, responses={202: MessageSerializer})
    @action(detail=False, methods=["post"], url_path="lookup")
    def lookup(self, request: Request) -> Response:
        """Mail an address the pickups it belongs to. Same answer for unknown addresses."""
        body = EmailSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        request_pickup_list(request, body.validated_data["email"])
        return Response(
            {"message": "If this address belongs to any pickups, we sent you a list."},
            status=status.HTTP_202_ACCEPTED,
        )

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
