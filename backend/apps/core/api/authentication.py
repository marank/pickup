from rest_framework.authentication import SessionAuthentication
from rest_framework.request import Request


class CsrfSessionAuthentication(SessionAuthentication):
    """Session auth that checks CSRF for anonymous requests too.

    DRF only checks CSRF once a Django user is logged in. Pickup members are anonymous
    users identified through the session, so without this every unsafe request riding
    on their session cookie would go unchecked.
    """

    def authenticate(self, request: Request):  # type: ignore[no-untyped-def]
        result = super().authenticate(request)
        if result is None:
            self.enforce_csrf(request)
        return result
