import signal
from types import FrameType
from typing import Any

from django.core.management.base import BaseCommand
from django.db.models import Q

from apps.pickups.models import Media, live
from apps.pickups.services.thumbnails import create_thumbnail


class Command(BaseCommand):
    help = (
        "Create missing previews (e.g. of files from before previews existed). On SIGTERM or "
        "SIGINT it finishes the current file and stops, so a container can shut down meanwhile."
    )

    stopping = False

    def stop(self, signum: int, frame: FrameType | None) -> None:
        self.stopping = True

    def handle(self, *args: Any, **options: Any) -> None:
        previous = {sig: signal.signal(sig, self.stop) for sig in (signal.SIGTERM, signal.SIGINT)}
        try:
            created = self.create_missing()
        finally:
            for sig, handler in previous.items():
                signal.signal(sig, handler)
        if created or self.stopping:
            self.stdout.write(f"Created {created} thumbnails" + (", stopped early" if self.stopping else ""))

    def create_missing(self) -> int:
        created = 0
        # No preview yet, or a HEIC photo without the viewer's JPEG.
        heic = Q(file__iendswith=".heic") | Q(file__iendswith=".heif")
        missing = Media.objects.filter(
            Q(thumbnail="") | (Q(display="") & heic), live("folder__pickup__")
        ).order_by("uploaded_at")
        for media in missing.iterator():
            if self.stopping:
                break
            created += create_thumbnail(media)
        return created
