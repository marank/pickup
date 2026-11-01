import signal
from types import FrameType
from typing import Any

from django.core.management.base import BaseCommand
from django.db.models import Q

from apps.pickups.models import Media, live
from apps.pickups.models.media import DISPLAY_FROM_BYTES, LARGE_STILLS, NEEDS_DISPLAY
from apps.pickups.services.capture_time import store_capture_time
from apps.pickups.services.duplicates import fingerprint
from apps.pickups.services.thumbnails import create_thumbnail


def _ending(extensions: set[str]) -> Q:
    """Files with one of these extensions."""
    query = Q()
    for extension in sorted(extensions):
        query |= Q(file__iendswith=f".{extension}")
    return query


class Command(BaseCommand):
    help = (
        "Create missing previews, fingerprints and capture times (e.g. of files from before they "
        "existed). On SIGTERM or SIGINT it finishes the current file and stops, so a container can "
        "shut down meanwhile."
    )

    stopping = False

    def stop(self, signum: int, frame: FrameType | None) -> None:
        self.stopping = True

    def handle(self, *args: Any, **options: Any) -> None:
        previous = {sig: signal.signal(sig, self.stop) for sig in (signal.SIGTERM, signal.SIGINT)}
        try:
            created = self.create_missing()
            fingerprinted = self.fingerprint_missing()
            self.read_capture_times()
        finally:
            for sig, handler in previous.items():
                signal.signal(sig, handler)
        if created or fingerprinted or self.stopping:
            self.stdout.write(
                f"Created {created} thumbnails"
                + (f", fingerprinted {fingerprinted} files" if fingerprinted else "")
                + (", stopped early" if self.stopping else "")
            )

    def create_missing(self) -> int:
        created = 0
        # No preview yet, or no viewer's JPEG where one is due (Media.needs_display; large
        # photos may get none when it wouldn't be smaller: they are tried once per start).
        display_due = _ending(NEEDS_DISPLAY) | (_ending(LARGE_STILLS) & Q(file_size__gt=DISPLAY_FROM_BYTES))
        missing = Media.objects.filter(
            Q(thumbnail="") | (Q(display="") & display_due), live("folder__pickup__")
        ).order_by("uploaded_at")
        for media in missing.iterator():
            if self.stopping:
                break
            created += create_thumbnail(media)
        return created

    def fingerprint_missing(self) -> int:
        """Files from before fingerprints existed, so repeating such an upload is noticed too."""
        done = 0
        for media in (
            Media.objects.filter(live("folder__pickup__"), sha256="").order_by("uploaded_at").iterator()
        ):
            if self.stopping:
                break
            try:
                with media.file.open("rb") as source:
                    sha256 = fingerprint(source.chunks())
            except OSError:
                continue  # the file is missing on disk: nothing to compare with
            done += Media.objects.filter(id=media.id, sha256="").update(sha256=sha256)
        return done

    def read_capture_times(self) -> None:
        """Files from before the timeline: when they were taken."""
        for media in (
            Media.objects.filter(live("folder__pickup__"), taken_at=None).order_by("uploaded_at").iterator()
        ):
            if self.stopping:
                break
            store_capture_time(media)
