import mimetypes
from urllib.parse import quote

from django.conf import settings
from django.db.models.fields.files import FieldFile
from django.http import FileResponse, HttpResponse, HttpResponseBase
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.request import Request
from rest_framework.views import APIView

from ..models import Media, live
from ..services.access import can_view
from ..services.members import get_member_from_request

# Not in every system's mime.types; downloads should still say what they are.
mimetypes.add_type("image/heic", ".heic")
mimetypes.add_type("image/heif", ".heif")


class MediaFileView(APIView):
    """
    A media file, after the same access check as the API (private pickups stay private).
    In production nginx sends the bytes (X-Accel-Redirect to an internal location), so
    range requests and large videos work without tying up a gunicorn worker.
    """

    @extend_schema(responses={(200, "application/octet-stream"): OpenApiTypes.BINARY, 404: None})
    def get(self, request: Request, media_id: str) -> HttpResponseBase:
        media = _viewable_media(request, media_id)
        if media is None:
            return HttpResponse(status=404)
        content_type = mimetypes.guess_type(media.original_filename)[0] or "application/octet-stream"
        return _send(media.file, content_type, media.original_filename)


class MediaThumbnailView(APIView):
    """The small JPEG preview of a media file, after the same access check."""

    @extend_schema(responses={(200, "image/jpeg"): OpenApiTypes.BINARY, 404: None})
    def get(self, request: Request, media_id: str) -> HttpResponseBase:
        media = _viewable_media(request, media_id)
        if media is None or not media.thumbnail:
            return HttpResponse(status=404)
        return _send(media.thumbnail, "image/jpeg", "preview.jpg")


class MediaDisplayView(APIView):
    """The JPEG to view a file browsers can't show (HEIC), after the same access check."""

    @extend_schema(responses={(200, "image/jpeg"): OpenApiTypes.BINARY, 404: None})
    def get(self, request: Request, media_id: str) -> HttpResponseBase:
        media = _viewable_media(request, media_id)
        if media is None or not media.display:
            return HttpResponse(status=404)
        stem = media.original_filename.rsplit(".", 1)[0]
        return _send(media.display, "image/jpeg", f"{stem}.jpg")


def _viewable_media(request: Request, media_id: str) -> Media | None:
    """The file if this browser may see it; missing and private look the same (empty 404)."""
    media = (
        Media.objects.select_related("folder__pickup").filter(live("folder__pickup__"), id=media_id).first()
    )
    if media is None:
        return None
    pickup = media.folder.pickup
    if not can_view(pickup, get_member_from_request(request, pickup)):
        return None  # same answer as for a file that doesn't exist
    return media


# A file never changes under its address (new uploads get new ones): browsers keep files and
# previews a week instead of asking the access check again. nginx passes this header on.
CACHE_CONTROL = "private, max-age=604800"


def _send(file: FieldFile, content_type: str, filename: str) -> HttpResponseBase:
    response: HttpResponseBase
    if settings.MEDIA_ACCEL_REDIRECT:
        response = HttpResponse(content_type=content_type)
        response["X-Accel-Redirect"] = f"/protected-media/{quote(file.name or '')}"
        response["Content-Disposition"] = f"inline; filename*=UTF-8''{quote(filename)}"
    else:
        response = FileResponse(file.open("rb"), content_type=content_type, filename=filename)
    response["Cache-Control"] = CACHE_CONTROL
    return response
