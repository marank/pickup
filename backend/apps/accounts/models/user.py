from typing import ClassVar

from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.db.models.functions import Lower

from apps.core.models import UUIDModel


class CaseInsensitiveUserManager(UserManager["User"]):
    """Usernames are looked up case-insensitively: `Admin` and `admin` are the same user.

    `authenticate()` (login), the admin and our commands go through `get_by_natural_key`,
    so the lookup matches the case-insensitive unique constraint on the model.
    """

    def get_by_natural_key(self, username: str | None) -> User:
        return self.get(**{f"{self.model.USERNAME_FIELD}__iexact": username})


class User(UUIDModel, AbstractUser):
    """Custom user from day one, so the UUID primary key is in the very first migration."""

    objects: ClassVar[CaseInsensitiveUserManager] = CaseInsensitiveUserManager()

    class Meta(AbstractUser.Meta):
        swappable = "AUTH_USER_MODEL"
        constraints = [
            models.UniqueConstraint(
                Lower("username"),
                name="accounts_user_username_ci_unique",
                violation_error_message="A user with that username already exists.",
            ),
        ]
