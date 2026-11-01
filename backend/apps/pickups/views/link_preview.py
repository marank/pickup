from uuid import UUID

from django.conf import settings
from django.http import HttpRequest, HttpResponse

from ..services.link_preview import link_preview, render_index


def pickup_page(request: HttpRequest, pickup_id: UUID, rest: str = "") -> HttpResponse:
    """
    The SPA for every page of a pickup, with its link preview filled in. nginx sends
    /pickup/{id}… here instead of serving index.html itself; the SPA does the rest.
    """
    page = render_index(
        settings.SPA_INDEX, link_preview(pickup_id), request.build_absolute_uri("/apple-touch-icon.png")
    )
    response = HttpResponse(page, content_type="text/html; charset=utf-8")
    response["Cache-Control"] = "no-cache"
    return response
