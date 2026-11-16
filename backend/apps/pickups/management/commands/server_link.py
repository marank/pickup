from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError, CommandParser

from apps.pickups.services.creation import connect_link, creation_mode, valid_code


class Command(BaseCommand):
    help = (
        "Print the link that adds this server to the Pickup apps' server list. With "
        "PICKUP_CREATION=code it carries a code (the first one unless --code is given), so whoever "
        "has the link can create pickups: share it only with them."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--code", default="", help="One of PICKUP_CREATION_CODES to put into the link")
        parser.add_argument("--no-code", action="store_true", help="Leave the code out (the app asks for it)")

    def handle(self, *args: Any, **options: Any) -> None:
        mode = creation_mode()
        code = ""
        if mode == "code" and not options["no_code"]:
            code = options["code"] or settings.PICKUP_CREATION_CODES[0]
            if not valid_code(code):
                raise CommandError("That code is not in PICKUP_CREATION_CODES.")
        elif options["code"]:
            raise CommandError(f"PICKUP_CREATION is {mode!r}: no code needed.")
        if mode == "none":
            self.stderr.write(
                "Note: PICKUP_CREATION=none, so the apps can open pickups here but not create any."
            )
        self.stdout.write(connect_link(code))
