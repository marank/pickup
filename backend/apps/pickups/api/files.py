import mimetypes
from urllib.parse import quote

from django.conf import settings
from django.http import FileResponse, HttpResponse, HttpResponseBase
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.request import Request
from rest_framework.views import APIView

from ..models import Media, live
from ..services.access import can_view
from ..services.members import get_member_from_request


class MediaFileView(APIView):
    """
    A media file, after the same access check as the API (private pickups stay private).
    In production nginx sends the bytes (X-Accel-Redirect to an internal location), so
    range requests and large videos work without tying up a gunicorn worker.
    """

    @extend_schema(responses={(200, "application/octet-stream"): OpenApiTypes.BINARY, 404: None})
    def get(self, request: Request, media_id: str) -> HttpResponseBase:
        media = get_object_or_404(
            Media.objects.select_related("folder__pickup").filter(live("folder__pickup__")), id=media_id
        )
        pickup = media.folder.pickup
        if not can_view(pickup, get_member_from_request(request, pickup)):
            # Same answer as for a file that doesn't exist.
            return HttpResponse(status=404)

        content_type = mimetypes.guess_type(media.original_filename)[0] or "application/octet-stream"
        response: HttpResponseBase
        if settings.MEDIA_ACCEL_REDIRECT:
            response = HttpResponse(content_type=content_type)
            response["X-Accel-Redirect"] = f"/protected-media/{quote(media.file.name or '')}"
            response["Content-Disposition"] = f"inline; filename*=UTF-8''{quote(media.original_filename)}"
        else:
            response = FileResponse(
                media.file.open("rb"), content_type=content_type, filename=media.original_filename
            )
        response["Cache-Control"] = "private, max-age=3600"
        return response
