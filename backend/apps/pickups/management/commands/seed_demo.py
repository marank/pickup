from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError, CommandParser

from apps.pickups.services.demo import seed_demo


class Command(BaseCommand):
    help = (
        "Create a demo pickup (a weekend at a lake: four people, folders, photos over two days) "
        "for screenshots and trying things out, and print the creator's personal link. "
        "Only with DEBUG=true, so it never lands in a real installation."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--photos", type=Path, help="A folder of JPEG photos to use (default: generated pictures)"
        )

    def handle(self, *args: Any, **options: Any) -> None:
        if not settings.DEBUG:
            raise CommandError("seed_demo only runs with DEBUG=true.")
        photos: Path | None = options["photos"]
        if photos is not None and not photos.is_dir():
            raise CommandError(f"{photos} is not a folder.")
        try:
            demo = seed_demo(photos)
        except ValueError as exc:
            raise CommandError(str(exc)) from exc
        pickup_id = demo.pickup.id
        self.stdout.write(f"Created '{demo.pickup.title}' with {demo.photos} photos. On the dev server:")
        self.stdout.write(f"Pickup:        /pickup/{pickup_id}")
        self.stdout.write(f"Anna's link:   /pickup/{pickup_id}/member/{demo.creator.access_key}")
