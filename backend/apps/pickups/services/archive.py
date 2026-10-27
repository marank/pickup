"""ZIP downloads of a pickup, folders or single files, streamed while they are written."""

import posixpath
import re
import zipfile
from collections import defaultdict
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from uuid import UUID

from django.utils import timezone

from ..models import Folder, Media, Pickup

BLOCK_SIZE = 1024 * 1024


@dataclass(frozen=True)
class Entry:
    path: str  # inside the archive; directories end in "/"
    media: Media | None = None


def safe_name(name: str) -> str:
    """One path segment: no separators, no "." or "..", nothing empty."""
    name = re.sub(r"[/\\\x00-\x1f]", "_", name).strip()
    return name if name not in {"", ".", ".."} else "_"


def _unique(path: str, used: set[str]) -> str:
    """Two files with the same name in one folder: "beach.jpg", "beach (2).jpg", ..."""
    if path not in used:
        used.add(path)
        return path
    stem, ext = posixpath.splitext(path)
    n = 2
    while f"{stem} ({n}){ext}" in used:
        n += 1
    used.add(f"{stem} ({n}){ext}")
    return f"{stem} ({n}){ext}"


def collect(pickup: Pickup, folder_ids: Iterable[UUID] = (), media_ids: Iterable[UUID] = ()) -> list[Entry]:
    """
    What goes into the archive. Nothing selected: the whole pickup, one directory per
    top-level folder. Otherwise each selected folder with everything inside, and the
    selected files next to them.
    """
    folders = list(Folder.objects.filter(pickup=pickup).order_by("name"))
    children: dict[UUID | None, list[Folder]] = defaultdict(list)
    for folder in folders:
        children[folder.parent_id].append(folder)
    media_by_folder: dict[UUID, list[Media]] = defaultdict(list)
    for item in Media.objects.filter(folder__pickup=pickup).order_by("uploaded_at"):
        media_by_folder[item.folder_id].append(item)

    used: set[str] = set()
    entries: list[Entry] = []

    def add_folder(folder: Folder, prefix: str) -> None:
        path = _unique(f"{prefix}{safe_name(folder.name)}/", used)
        entries.append(Entry(path))
        for item in media_by_folder[folder.id]:
            entries.append(Entry(_unique(path + safe_name(item.original_filename), used), item))
        for child in children[folder.id]:
            add_folder(child, path)

    wanted_folders = set(folder_ids)
    wanted_media = set(media_ids)
    if not wanted_folders and not wanted_media:
        for folder in children[None]:
            add_folder(folder, "")
        return entries
    for folder in folders:
        if folder.id in wanted_folders:
            add_folder(folder, "")
    for items in media_by_folder.values():
        for item in items:
            if item.id in wanted_media:
                entries.append(Entry(_unique(safe_name(item.original_filename), used), item))
    return entries


class _Sink:
    """Write-only target for ZipFile; the stream hands out what was written so far."""

    def __init__(self) -> None:
        self._parts: list[bytes] = []

    def write(self, data: bytes) -> int:
        self._parts.append(bytes(data))
        return len(data)

    def flush(self) -> None:
        pass

    def close(self) -> None:
        pass

    def drain(self) -> bytes:
        data = b"".join(self._parts)
        self._parts.clear()
        return data


def stream(entries: list[Entry]) -> Iterator[bytes]:
    """
    The archive as chunks, without temporary files: ZipFile writes to a non-seekable
    target (sizes go into data descriptors). Photos and videos are already compressed,
    so files are stored, not deflated.
    """
    sink = _Sink()
    with zipfile.ZipFile(sink, "w", zipfile.ZIP_STORED, allowZip64=True) as archive:
        for entry in entries:
            moment = timezone.localtime(entry.media.uploaded_at if entry.media else timezone.now())
            info = zipfile.ZipInfo(entry.path, date_time=moment.timetuple()[:6])
            if entry.media is None:
                info.external_attr = 0o40755 << 16 | 0x10  # directory
                archive.writestr(info, b"")
                continue
            info.external_attr = 0o644 << 16
            with entry.media.file.open("rb") as source, archive.open(info, "w", force_zip64=True) as target:
                while block := source.read(BLOCK_SIZE):
                    target.write(block)
                    if data := sink.drain():
                        yield data
            if data := sink.drain():
                yield data
    yield sink.drain()
