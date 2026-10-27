from typing import Any

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.pickups.models import Pickup
from apps.pickups.services.members import delete_pickup


class Command(BaseCommand):
    help = "Delete pickups whose expiry date has passed, with all their files."

    def handle(self, *args: Any, **options: Any) -> None:
        expired = Pickup.objects.filter(expires_at__lte=timezone.now())
        for pickup in expired:
            files = delete_pickup(pickup)
            self.stdout.write(f"Deleted expired pickup {pickup.id} ({files} files)")
