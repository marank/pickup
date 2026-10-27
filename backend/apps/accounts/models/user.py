from django.contrib.auth.models import AbstractUser

from apps.core.models import UUIDModel


class User(UUIDModel, AbstractUser):
    """Custom user from day one, so the UUID primary key is in the very first migration."""

    class Meta(AbstractUser.Meta):
        swappable = "AUTH_USER_MODEL"
