from typing import Any

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError, CommandParser

from apps.pickups.models import Pickup


class Command(BaseCommand):
    help = (
        "Show whether a pickup has a password, or remove it (e.g. the creator forgot it: they log in "
        "with their creator link and set a new one)."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("pickup_id", help="The pickup's id (from its share link)")
        parser.add_argument("--remove", action="store_true", help="Remove the password")

    def handle(self, *args: Any, **options: Any) -> None:
        try:
            pickup = Pickup.objects.get(id=options["pickup_id"])
        except (Pickup.DoesNotExist, ValueError, ValidationError) as exc:
            raise CommandError(f"No pickup with the id {options['pickup_id']!r}.") from exc
        if options["remove"]:
            Pickup.objects.filter(id=pickup.id).update(password="")
            self.stdout.write(f"Password of “{pickup.title or 'Untitled pickup'}” removed.")
            return
        state = "has a password" if pickup.password else "has no password"
        self.stdout.write(f"“{pickup.title or 'Untitled pickup'}” {state}.")
