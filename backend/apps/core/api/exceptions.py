from typing import Any

from rest_framework.response import Response
from rest_framework.views import exception_handler

from apps.core.errors import UserError


def handle_exception(exc: Exception, context: dict[str, Any]) -> Response | None:
    """DRF's handler, plus UserError: its message for the user, with its status."""
    if isinstance(exc, UserError):
        return Response({"error": exc.message}, status=exc.status)
    return exception_handler(exc, context)
