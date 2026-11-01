"""Background jobs: queued after the commit in the container, right away without a worker."""

import io
from datetime import timedelta
from typing import Any

import pytest
from django.core import mail
from django.test import Client
from django.utils import timezone
from procrastinate.exceptions import AlreadyEnqueued
from pytest_django.fixtures import Settings

from apps.pickups import tasks
from apps.pickups.models import Media, Pickup
from apps.pickups.services.jobs import run_later

from .test_access import join, new_pickup
from .test_thumbnails import image_bytes, upload

pytestmark = pytest.mark.django_db


class FakeTask:
    name = "fake"

    def __init__(self) -> None:
        self.deferred: list[dict[str, Any]] = []
        self.locks: list[str | None] = []

    def configure(self, *, queueing_lock: str | None = None) -> FakeTask:
        self.locks.append(queueing_lock)
        return self

    def defer(self, **kwargs: Any) -> None:
        if self.deferred:
            raise AlreadyEnqueued("waiting already")
        self.deferred.append(kwargs)


def test_jobs_are_queued_after_the_commit(
    settings: Settings, django_capture_on_commit_callbacks: Any
) -> None:
    settings.JOBS_IN_BACKGROUND = True
    task = FakeTask()
    with django_capture_on_commit_callbacks(execute=False) as callbacks:
        run_later(task, lock="one", n=1)  # type: ignore[arg-type]
        run_later(task, lock="one", n=2)  # type: ignore[arg-type]
    assert task.deferred == []  # nothing before the commit
    for callback in callbacks:
        callback()  # the second one is already waiting: quietly skipped
    assert (task.deferred, task.locks) == ([{"n": 1}], ["one", "one"])


def test_mails_go_out_through_the_job(settings: Settings) -> None:
    tasks.send_mail(
        subject="Hi",
        body="Hello",
        html="<p>Hello</p>",
        sender="Anna via Pickup <pickup@example.com>",
        to=["bob@example.com"],
        reply_to=[],
    )
    [message] = mail.outbox
    assert (message.subject, message.to, message.from_email) == (
        "Hi",
        ["bob@example.com"],
        "Anna via Pickup <pickup@example.com>",
    )
    assert any(part.get_content_type() == "image/png" for part in message.message().walk())


def test_the_hourly_job_deletes_expired_pickups() -> None:
    gone, kept = new_pickup(Client()), new_pickup(Client())
    Pickup.objects.filter(id=gone).update(expires_at=timezone.now() - timedelta(minutes=1))
    tasks.delete_expired(timestamp=0)
    assert list(Pickup.objects.values_list("id", flat=True)) == [Pickup.objects.get(id=kept).id]


def test_catching_up_completes_files_one_job_each(client: Client) -> None:
    pickup_id = new_pickup(Client())
    folder_id = join(client, pickup_id, "Alice").json()["folder"]["id"]
    upload(client, pickup_id, folder_id, "a.jpg", image_bytes((40, 30)))
    upload(client, pickup_id, folder_id, "b.jpg", image_bytes((41, 30)))
    Media.objects.update(thumbnail="", sha256="", taken_at=None)  # as if from before
    tasks.catch_up(timestamp=0)
    assert not Media.objects.filter(thumbnail="").exists()
    assert not Media.objects.filter(sha256="").exists()
    assert not Media.objects.filter(taken_at=None).exists()
    assert tasks.needing_ids() == []
    tasks.complete_media(media_id="00000000-0000-4000-8000-000000000000")  # deleted meanwhile


def test_the_command_still_catches_up_by_hand(client: Client) -> None:
    from django.core.management import call_command

    pickup_id = new_pickup(Client())
    folder_id = join(client, pickup_id, "Alice").json()["folder"]["id"]
    upload(client, pickup_id, folder_id, "a.jpg", image_bytes((40, 30)))
    Media.objects.update(thumbnail="", sha256="")
    out = io.StringIO()
    call_command("create_thumbnails", stdout=out)
    assert out.getvalue() == "Created 1 thumbnails, fingerprinted 1 files\n"
