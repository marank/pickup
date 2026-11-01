"""Lists that every page loads ask the database a fixed number of times, however big."""

from collections.abc import Callable
from contextlib import AbstractContextManager
from typing import Any

import pytest
from django.test import Client

from .test_access import join, new_pickup

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("path", ["/folders/", "/media/", "/"])
def test_pickup_lists_dont_grow_with_participants(
    path: str, django_assert_max_num_queries: Callable[[int], AbstractContextManager[Any]]
) -> None:
    pickup_id = new_pickup(Client())
    viewer = Client()
    join(viewer, pickup_id, "Viewer")
    for i in range(20):
        join(Client(), pickup_id, f"Person {i}")
    with django_assert_max_num_queries(20):  # was 2 per folder: 50+ here
        assert viewer.get(f"/api/pickups/{pickup_id}{path}").status_code == 200
