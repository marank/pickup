from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser

from apps.pickups.models import Folder, Pickup
from apps.pickups.services.storage import format_size, member_limit, member_usage, pickup_usage
from config.env import parse_size

HELP_SIZE = 'a size like 50GB or 500MB, "unlimited", or "default" (the .env value)'


def _limit(value: str) -> int | None:
    """None: back to the default from .env; 0: unlimited."""
    lowered = value.strip().lower()
    if lowered == "default":
        return None
    if lowered == "unlimited":
        return 0
    try:
        return parse_size(value)
    except ValueError as exc:
        raise CommandError(str(exc)) from exc


def _show(limit: int) -> str:
    return format_size(limit) if limit else "unlimited"


class Command(BaseCommand):
    help = "Show or change the storage limits of one pickup (for the whole pickup and per participant)."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("pickup_id", help="The pickup's id (from its share link)")
        parser.add_argument("--pickup", dest="pickup_limit", help=f"Limit for all files: {HELP_SIZE}")
        parser.add_argument("--member", dest="member_limit", help=f"Limit per participant: {HELP_SIZE}")

    def handle(self, *args: Any, **options: Any) -> None:
        try:
            pickup = Pickup.objects.get(id=options["pickup_id"])
        except (Pickup.DoesNotExist, ValueError) as exc:
            raise CommandError(f"No pickup with id {options['pickup_id']}") from exc

        changed = []
        if options["pickup_limit"] is not None:
            pickup.storage_limit = _limit(options["pickup_limit"])
            changed.append("storage_limit")
        if options["member_limit"] is not None:
            pickup.member_storage_limit = _limit(options["member_limit"])
            changed.append("member_storage_limit")
        if changed:
            pickup.save(update_fields=changed)
            self.stdout.write(self.style.SUCCESS("Limits changed."))

        usage = pickup_usage(pickup)
        source = "default" if pickup.storage_limit is None else "set for this pickup"
        self.stdout.write(f"Pickup {pickup.id} “{pickup.title or 'Untitled'}”")
        self.stdout.write(f"  All files:        {format_size(usage.used)} of {_show(usage.limit)} ({source})")
        source = "default" if pickup.member_storage_limit is None else "set for this pickup"
        top_level = Folder.objects.filter(pickup=pickup, parent__isnull=True).select_related("pickup")
        for index, folder in enumerate(top_level.order_by("name")):
            own = member_usage(folder)
            label = "Per participant:" if index == 0 else ""
            self.stdout.write(
                f"  {label:<17} {folder.user_name}: {format_size(own.used)} of {_show(own.limit)}"
            )
        if not top_level:
            self.stdout.write(f"  Per participant:  {_show(member_limit(pickup))} ({source})")
        else:
            self.stdout.write(f"  (per participant: {source})")
