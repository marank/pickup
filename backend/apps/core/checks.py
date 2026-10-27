"""System check: every model defined in our own apps must use a UUID primary key."""

from django.apps import apps
from django.core import checks
from django.db import models


@checks.register(checks.Tags.models)
def uuid_primary_keys(app_configs=None, **kwargs):
    errors = []
    configs = app_configs or apps.get_app_configs()
    for config in configs:
        if not config.name.startswith("apps."):
            continue
        for model in config.get_models():
            if model._meta.proxy or not model._meta.managed:
                continue
            if not isinstance(model._meta.pk, models.UUIDField):
                errors.append(
                    checks.Error(
                        f"{model._meta.label} must use a UUID primary key.",
                        hint="Inherit from apps.core.models.UUIDModel (or TimeStampedModel).",
                        obj=model,
                        id="core.E001",
                    )
                )
    return errors
