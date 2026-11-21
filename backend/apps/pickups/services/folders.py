"""Subfolders inside a member's folder: create, rename, delete."""

import uuid

from django.db import transaction
from django.db.models import Count, OuterRef, QuerySet, Subquery
from django.db.models.functions import Coalesce
from django.utils.translation import gettext as _

from apps.core.errors import UserError

from ..models import Folder, Media


class FolderError(UserError):
    """A folder operation that is not allowed; the message is shown to the user."""


def _name_taken(parent: Folder, name: str, exclude: Folder | None = None) -> bool:
    siblings = Folder.objects.filter(parent=parent, name__iexact=name)
    if exclude is not None:
        siblings = siblings.exclude(id=exclude.id)
    return siblings.exists()


def create_subfolder(parent: Folder, name: str) -> Folder:
    if _name_taken(parent, name):
        raise FolderError(_("“{name}” already exists in this folder.").format(name=name))
    return Folder.objects.create(
        pickup_id=parent.pickup_id,
        parent=parent,
        root_id=parent.top_level_id,
        name=name,
        user_name=parent.user_name,
    )


def rename_folder(folder: Folder, name: str) -> Folder:
    if folder.parent is None:
        taken = (
            Folder.objects.filter(pickup_id=folder.pickup_id, parent__isnull=True, name__iexact=name)
            .exclude(id=folder.id)
            .exists()
        )
    else:
        taken = _name_taken(folder.parent, name, exclude=folder)
    if taken:
        raise FolderError(_("“{name}” already exists here.").format(name=name))
    folder.name = name
    folder.save(update_fields=["name"])
    return folder


def subtree_ids(folder: Folder) -> list[uuid.UUID]:
    """The folder and all folders below it."""
    ids = [folder.id]
    frontier = [folder.id]
    while frontier:
        frontier = list(Folder.objects.filter(parent_id__in=frontier).values_list("id", flat=True))
        ids.extend(frontier)
    return ids


@transaction.atomic
def delete_subfolder(folder: Folder) -> int:
    """Delete a subfolder with everything in it; returns the number of deleted files."""
    if folder.parent_id is None:
        raise FolderError(_("Your own top-level folder cannot be deleted."))
    media = Media.objects.filter(folder_id__in=subtree_ids(folder))
    count = 0
    for item in media:
        item.delete_files()
        count += 1
    folder.delete()  # cascades to subfolders and their media rows
    return count


def with_counts(folders: QuerySet[Folder]) -> QuerySet[Folder]:
    """Files and subfolders per folder in the same query (the tree lists every folder)."""

    def count(model: type[Media] | type[Folder], field: str) -> Coalesce:
        rows = model.objects.filter(**{field: OuterRef("pk")}).order_by().values(field)
        return Coalesce(Subquery(rows.annotate(n=Count("pk")).values("n")[:1]), 0)

    return folders.annotate(media_total=count(Media, "folder"), subfolder_total=count(Folder, "parent"))
