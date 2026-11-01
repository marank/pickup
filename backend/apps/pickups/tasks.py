"""
Background jobs, run by the container's worker (`manage.py procrastinate worker`) from the
queue in Postgres. Without Postgres there is no worker: services.jobs.run_later calls them
right away, and the periodic ones don't run (native development).
"""

import logging

from procrastinate import RetryStrategy
from procrastinate.contrib.django import app

from .models import Media
from .services import catch_up as catch_up_service
from .services.jobs import run_later
from .services.mail import deliver
from .services.members import delete_expired_pickups

logger = logging.getLogger(__name__)


# A mail server that is away for a while: retries after 3 s, 9 s, 27 s … for about an
# hour (8 attempts), then the job stays failed and the error is in the log.
@app.task(retry=RetryStrategy(max_attempts=8, exponential_wait=3), pass_context=False)
def send_mail(*, subject: str, body: str, html: str, sender: str, to: list[str], reply_to: list[str]) -> None:
    deliver(subject=subject, body=body, html=html, sender=sender, to=to, reply_to=reply_to)


@app.periodic(cron="5 * * * *")  # hourly
@app.task(queueing_lock="delete_expired")
def delete_expired(timestamp: int) -> None:
    for pickup_id, files in delete_expired_pickups():
        logger.info("Deleted expired pickup %s (%s files)", pickup_id, files)


@app.periodic(cron="*/10 * * * *")
@app.task(queueing_lock="catch_up")
def catch_up(timestamp: int) -> None:
    """One small job per file still missing something, so the worker can stop at any time."""
    for media_id in needing_ids():
        run_later(complete_media, lock=f"complete_media-{media_id}", media_id=str(media_id))


def needing_ids() -> list[object]:
    return list(catch_up_service.needing_work().values_list("id", flat=True)[:500])


@app.task
def complete_media(*, media_id: str) -> None:
    media = Media.objects.filter(id=media_id).first()
    if media is not None:  # deleted meanwhile
        catch_up_service.complete(media)
