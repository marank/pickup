"""Chunked uploads: sessions, chunks and assembling the final media file."""

import hashlib
import math
import os
from typing import Any

from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from django.utils import timezone

from ..models import Folder, Media, MediaChunk, UploadSession
from ..models.media import media_type_for, stored_name
from .duplicates import DuplicateUpload, check_duplicate
from .thumbnails import create_thumbnail


def create_upload_session(folder: Folder, data: dict[str, Any]) -> UploadSession:
    chunk_size = data.get("chunk_size") or settings.UPLOAD_CHUNK_SIZE
    session = UploadSession.objects.create(
        folder=folder,
        file_name=data["file_name"],
        file_size=data["file_size"],
        chunk_size=chunk_size,
        total_chunks=math.ceil(data["file_size"] / chunk_size),
        # Derived from the validated extension, not taken from the client.
        media_type=media_type_for(data["file_name"]),
        caption=data.get("caption", ""),
    )
    os.makedirs(session.chunks_dir, exist_ok=True)
    return session


def store_chunk(session: UploadSession, chunk_index: int, chunk_file: UploadedFile[bytes]) -> None:
    os.makedirs(session.chunks_dir, exist_ok=True)
    with open(session.get_chunk_path(chunk_index), "wb+") as destination:
        for chunk in chunk_file.chunks():
            destination.write(chunk)

    MediaChunk.objects.update_or_create(
        upload_session=session, chunk_index=chunk_index, defaults={"chunk_size": chunk_file.size or 0}
    )
    session.uploaded_chunks = MediaChunk.objects.filter(upload_session=session).count()
    session.save(update_fields=["uploaded_chunks"])


def finalize_upload(session: UploadSession) -> Media:
    """Combine all chunks into one file below MEDIA_ROOT and create the Media object."""
    # Same layout as Media.file's upload_to='%Y/%m/%d/'
    relative_dir = timezone.now().strftime("%Y/%m/%d")
    upload_dir = os.path.join(settings.MEDIA_ROOT, relative_dir)
    os.makedirs(upload_dir, exist_ok=True)
    final_name = stored_name(session.file_name)
    final_path = os.path.join(upload_dir, final_name)

    digest = hashlib.sha256()
    with open(final_path, "wb") as destination:
        for i in range(session.total_chunks):
            chunk_path = session.get_chunk_path(i)
            if not os.path.exists(chunk_path):
                raise FileNotFoundError(f"Missing chunk {i}")
            with open(chunk_path, "rb") as chunk:
                while block := chunk.read(1024 * 1024):
                    destination.write(block)
                    digest.update(block)

    actual_size = os.path.getsize(final_path)
    if actual_size != session.file_size:
        os.remove(final_path)
        raise ValueError(f"File size mismatch: expected {session.file_size}, got {actual_size}")

    try:
        check_duplicate(session.folder, digest.hexdigest())
    except DuplicateUpload:
        os.remove(final_path)
        _close(session)
        raise

    media = Media.objects.create(
        folder=session.folder,
        file=f"{relative_dir}/{final_name}",  # relative to MEDIA_ROOT, so .url works
        original_filename=session.file_name,
        media_type=session.media_type,
        file_size=session.file_size,
        caption=session.caption,
        sha256=digest.hexdigest(),
    )
    _close(session)
    create_thumbnail(media)
    return media


def _close(session: UploadSession) -> None:
    session.status = "complete"
    session.completed_at = timezone.now()
    session.save(update_fields=["status", "completed_at"])
    session.cleanup_chunks()
