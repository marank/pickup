import signal
from types import FrameType
from typing import Any

from django.core.management.base import BaseCommand

from apps.pickups.services.catch_up import complete, needing_work


class Command(BaseCommand):
    help = (
        "Make what files are missing: previews, the viewer's JPEG, fingerprints, capture times "
        "(the worker does it every few minutes). On SIGTERM or SIGINT it finishes the current "
        "file and stops."
    )

    stopping = False

    def stop(self, signum: int, frame: FrameType | None) -> None:
        self.stopping = True

    def handle(self, *args: Any, **options: Any) -> None:
        previous = {sig: signal.signal(sig, self.stop) for sig in (signal.SIGTERM, signal.SIGINT)}
        created = fingerprinted = 0
        try:
            for media in needing_work().iterator():
                if self.stopping:
                    break
                done = complete(media)
                created += done.previews
                fingerprinted += done.fingerprint
        finally:
            for sig, handler in previous.items():
                signal.signal(sig, handler)
        if created or fingerprinted or self.stopping:
            self.stdout.write(
                f"Created {created} thumbnails"
                + (f", fingerprinted {fingerprinted} files" if fingerprinted else "")
                + (", stopped early" if self.stopping else "")
            )
