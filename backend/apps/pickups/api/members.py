from typing import Any

from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import Member, Pickup, live
from ..serializers import ErrorSerializer, InviteSerializer, MemberSerializer, MessageSerializer
from ..services.members import MembershipError, get_member_from_request, invite, remove_member, resend_invite

_PICKUP_ID = OpenApiParameter("pickup_id", OpenApiTypes.UUID, OpenApiParameter.PATH)


@extend_schema_view(
    list=extend_schema(
        parameters=[_PICKUP_ID], responses={200: MemberSerializer(many=True), 403: ErrorSerializer}
    )
)
class MemberViewSet(mixins.ListModelMixin, viewsets.GenericViewSet[Member]):
    """The participant list: creator only."""

    serializer_class = MemberSerializer
    lookup_field = "id"
    lookup_value_converter = "uuid"

    def _pickup(self) -> Pickup:
        return get_object_or_404(Pickup.objects.filter(live()), id=self.kwargs["pickup_id"])

    def _creator(self) -> Member | None:
        member = get_member_from_request(self.request, self._pickup())
        return member if member and member.is_creator else None

    def get_queryset(self) -> QuerySet[Member]:
        if getattr(self, "swagger_fake_view", False):
            return Member.objects.none()
        return Member.objects.filter(pickup_id=self.kwargs["pickup_id"]).order_by(
            "-is_creator", "user_name", "created_at"
        )

    def get_serializer_context(self) -> dict[str, Any]:
        context = dict(super().get_serializer_context())
        if not getattr(self, "swagger_fake_view", False):
            context["member"] = self._creator()
        return context

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        if self._creator() is None:
            return _creator_only()
        return super().list(request, *args, **kwargs)

    @extend_schema(
        parameters=[_PICKUP_ID],
        request=InviteSerializer,
        responses={201: MemberSerializer, 400: ErrorSerializer, 403: ErrorSerializer},
    )
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Invite someone by e-mail; an address that is already in the pickup gets its link again."""
        creator = self._creator()
        if creator is None:
            return _creator_only()
        body = InviteSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        try:
            member = invite(
                request,
                self._pickup(),
                creator,
                body.validated_data["email"],
                body.validated_data.get("name", ""),
            )
        except MembershipError as exc:
            return Response({"error": str(exc)}, status=exc.status)
        return Response(
            MemberSerializer(member, context={"member": creator}).data, status=status.HTTP_201_CREATED
        )

    @extend_schema(
        parameters=[_PICKUP_ID],
        request=None,
        responses={200: MessageSerializer, 400: ErrorSerializer, 403: ErrorSerializer},
    )
    @action(detail=True, methods=["post"])
    def resend(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Send the invitation again (only possible while addresses are stored)."""
        creator = self._creator()
        if creator is None:
            return _creator_only()
        try:
            resend_invite(request, self.get_object(), creator)
        except MembershipError as exc:
            return Response({"error": str(exc)}, status=exc.status)
        return Response({"message": "Invitation sent again."})

    @extend_schema(parameters=[_PICKUP_ID], responses={204: None, 400: ErrorSerializer, 403: ErrorSerializer})
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Remove a participant together with their folder and files."""
        if self._creator() is None:
            return _creator_only()
        try:
            remove_member(self.get_object())
        except MembershipError as exc:
            return Response({"error": str(exc)}, status=exc.status)
        return Response(status=status.HTTP_204_NO_CONTENT)


def _creator_only() -> Response:
    return Response({"error": "Only the creator can manage participants."}, status=status.HTTP_403_FORBIDDEN)
