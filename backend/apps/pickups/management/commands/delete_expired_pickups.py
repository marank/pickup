from typing import Any

from django.core.management.base import BaseCommand

from apps.pickups.services.members import delete_expired_pickups


class Command(BaseCommand):
    help = "Delete pickups whose expiry date has passed, with all their files (the worker does it hourly)."

    def handle(self, *args: Any, **options: Any) -> None:
        for pickup_id, files in delete_expired_pickups():
            self.stdout.write(f"Deleted expired pickup {pickup_id} ({files} files)")
