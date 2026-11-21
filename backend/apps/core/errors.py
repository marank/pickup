class UserError(Exception):
    """
    A request the app refuses for a reason the user should read: the message is a translated
    text written for them, never internal details. Services raise it (or a subclass); the
    API's exception handler (apps.core.api.exceptions) answers `{"error": message}` with
    `status`, so views don't catch these themselves.
    """

    status = 400

    def __init__(self, message: str, status: int | None = None) -> None:
        super().__init__(message)
        self.message = message
        if status is not None:
            self.status = status
