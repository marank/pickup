import logging

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Folder, MediaChunk, Member, UploadSession, live
from ..serializers import (
    CreateUploadSessionSerializer,
    ErrorSerializer,
    MediaSerializer,
    UploadChunkSerializer,
    UploadSessionSerializer,
)
from ..services.access import can_edit
from ..services.duplicates import DuplicateUpload
from ..services.members import get_member_from_request
from ..services.storage import StorageError, check_room
from ..services.uploads import create_upload_session, finalize_upload, store_chunk

logger = logging.getLogger(__name__)


def _owner(request: Request, folder: Folder) -> Member | None:
    member = get_member_from_request(request, folder.pickup)
    return member if can_edit(member, folder) else None


def _forbidden() -> Response:
    return Response(
        {"error": "You do not have permission to upload to this folder."}, status=status.HTTP_403_FORBIDDEN
    )


def _not_pending(session: UploadSession) -> Response:
    return Response({"error": f"Upload session is {session.status}"}, status=status.HTTP_400_BAD_REQUEST)


def _too_large(exc: StorageError) -> Response:
    return Response({"error": str(exc)}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)


class UploadSessionCreateView(APIView):
    """Create a new chunked upload session."""

    @extend_schema(
        request=CreateUploadSessionSerializer,
        responses={
            201: UploadSessionSerializer,
            400: ErrorSerializer,
            403: ErrorSerializer,
            413: ErrorSerializer,
        },
    )
    def post(self, request: Request, pickup_id: str, folder_id: str) -> Response:
        """Create an upload session for a large file."""
        folder = get_object_or_404(Folder.objects.filter(live("pickup__")), id=folder_id, pickup_id=pickup_id)
        if not _owner(request, folder):
            return _forbidden()

        serializer = CreateUploadSessionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            check_room(folder, serializer.validated_data["file_size"])
        except StorageError as exc:
            return _too_large(exc)
        session = create_upload_session(folder, serializer.validated_data)
        return Response(UploadSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class UploadSessionDetailView(APIView):
    """Get upload session details."""

    @extend_schema(responses={200: UploadSessionSerializer, 403: ErrorSerializer})
    def get(self, request: Request, session_id: str) -> Response:
        """Return upload session with missing chunks."""
        session = get_object_or_404(UploadSession.objects.select_related("folder__pickup"), id=session_id)
        if not _owner(request, session.folder):
            return _forbidden()
        return Response(UploadSessionSerializer(session).data)


class UploadChunkView(APIView):
    """Upload a single chunk for an upload session."""

    @extend_schema(
        request={"multipart/form-data": UploadChunkSerializer},
        responses={200: UploadSessionSerializer, 400: ErrorSerializer, 403: ErrorSerializer},
    )
    def post(self, request: Request, session_id: str) -> Response:
        """Store an uploaded chunk."""
        session = get_object_or_404(UploadSession.objects.select_related("folder__pickup"), id=session_id)
        if not _owner(request, session.folder):
            return _forbidden()
        if session.status != "pending":
            return _not_pending(session)

        serializer = UploadChunkSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        chunk_index = serializer.validated_data["chunk_index"]
        if chunk_index >= session.total_chunks:
            return Response({"error": "Chunk index out of range"}, status=status.HTTP_400_BAD_REQUEST)

        store_chunk(session, chunk_index, serializer.validated_data["chunk"])
        return Response(UploadSessionSerializer(session).data)


class UploadSessionFinalizeView(APIView):
    """Finalize an upload session by combining chunks into a media file."""

    @extend_schema(
        request=None,
        responses={
            201: MediaSerializer,
            400: ErrorSerializer,
            403: ErrorSerializer,
            409: ErrorSerializer,  # already in the member's folders
            413: ErrorSerializer,
        },
    )
    def post(self, request: Request, session_id: str) -> Response:
        """Combine all chunks and create the Media object."""
        session = get_object_or_404(UploadSession.objects.select_related("folder__pickup"), id=session_id)
        member = _owner(request, session.folder)
        if not member:
            return _forbidden()
        if session.status != "pending":
            return _not_pending(session)

        uploaded_chunks = MediaChunk.objects.filter(upload_session=session).count()
        if uploaded_chunks < session.total_chunks:
            missing = session.total_chunks - uploaded_chunks
            return Response({"error": f"Missing {missing} chunks"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            # Again: an admin may have lowered the limit while the file was uploading.
            check_room(session.folder, session.file_size, exclude_session=session.id)
        except StorageError as exc:
            session.status = "error"
            session.error_message = str(exc)
            session.save(update_fields=["status", "error_message"])
            session.cleanup_chunks()
            return _too_large(exc)

        try:
            media = finalize_upload(session)
        except DuplicateUpload as exc:
            return Response({"error": str(exc)}, status=status.HTTP_409_CONFLICT)
        except (OSError, ValueError) as exc:
            logger.exception("Finalizing upload session %s failed", session.id)
            session.status = "error"
            session.error_message = str(exc)
            session.save(update_fields=["status", "error_message"])
            return Response(
                {"error": f"Failed to finalize upload: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            MediaSerializer(media, context={"member": member}).data, status=status.HTTP_201_CREATED
        )
