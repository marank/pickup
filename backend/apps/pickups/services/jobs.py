"""Run a job in the background (the worker) or, without one, right away."""

import logging
from contextlib import suppress
from typing import Any

from django.conf import settings
from django.db import transaction
from procrastinate.exceptions import AlreadyEnqueued
from procrastinate.tasks import Task

logger = logging.getLogger(__name__)


def run_later(task: Task[Any, Any, Any], *, lock: str | None = None, **kwargs: Any) -> None:
    """
    With JOBS_IN_BACKGROUND the job goes to the queue once the request's transaction is
    committed (nothing happens for a request that fails); `lock` keeps a second one of the
    same kind from queueing while one waits. Without it the job runs at once; a failure is
    logged, never passed on to the request.
    """
    if not settings.JOBS_IN_BACKGROUND:
        try:
            task(**kwargs)
        except Exception:  # like a job in the worker: logged, the request goes on
            logger.exception("Job %s failed", task.name)
        return
    configured = task.configure(queueing_lock=lock) if lock else task

    def defer() -> None:
        with suppress(AlreadyEnqueued):  # the same job is already waiting
            configured.defer(**kwargs)

    transaction.on_commit(defer)
