"""OpenAPI (drf-spectacular) extensions; imported in CoreConfig.ready()."""

from drf_spectacular.authentication import SessionScheme


class CsrfSessionScheme(SessionScheme):  # type: ignore[no-untyped-call]
    target_class = "apps.core.api.authentication.CsrfSessionAuthentication"
