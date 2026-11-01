import io
import os
import shutil
import signal
import subprocess
from pathlib import Path
from typing import Any

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client
from PIL import Image

from apps.pickups.management.commands import create_thumbnails
from apps.pickups.models import Media, Member, Pickup
from apps.pickups.services.members import delete_pickup, remove_member
from apps.pickups.services.thumbnails import DISPLAY_SIZE, THUMBNAIL_SIZE, create_thumbnail, video_still

from .test_api import join, joined

__all__ = ["joined"]  # fixture

pytestmark = pytest.mark.django_db


def image_bytes(size: tuple[int, int], fmt: str = "JPEG", mode: str = "RGB", **save: Any) -> bytes:
    out = io.BytesIO()
    Image.new(mode, size, (200, 40, 40, 0) if mode == "RGBA" else "red").save(out, fmt, **save)
    return out.getvalue()


def upload(client: Client, pickup_id: str, folder_id: str, name: str, content: bytes) -> dict[str, Any]:
    response = client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/",
        {"file": SimpleUploadedFile(name, content)},
    )
    assert response.status_code == 201, response.content
    data: dict[str, Any] = response.json()
    return data


def thumbnail_of(client: Client, media: dict[str, Any]) -> Image.Image:
    response = client.get(media["thumbnail"])
    assert response.status_code == 200
    assert response["Content-Type"] == "image/jpeg"
    image = Image.open(io.BytesIO(b"".join(response.streaming_content)))  # type: ignore[attr-defined]
    assert image.format == "JPEG"
    return image


def test_upload_creates_small_upright_thumbnail(client: Client, joined: tuple[str, str]) -> None:
    exif = Image.Exif()
    exif[0x0112] = 6  # stored sideways: the camera says "rotate 90°"
    media = upload(client, *joined, "photo.jpg", image_bytes((3000, 2000), exif=exif))
    assert media["thumbnail"] == f"/api/files/{media['id']}/thumbnail/"
    assert thumbnail_of(client, media).size == (427, THUMBNAIL_SIZE)  # portrait now
    stored = Media.objects.get()
    assert stored.thumbnail.name and stored.thumbnail.name.endswith(".jpg")
    assert stored.thumbnail.name != stored.file.name


def test_transparent_images_get_a_white_background(client: Client, joined: tuple[str, str]) -> None:
    media = upload(client, *joined, "logo.png", image_bytes((100, 50), "PNG", "RGBA"))
    thumbnail = thumbnail_of(client, media)
    assert thumbnail.size == (100, 50)  # never enlarged
    assert thumbnail.convert("RGB").getpixel((10, 10)) == pytest.approx((255, 255, 255), abs=3)


@pytest.mark.parametrize(("name", "content"), [("broken.jpg", b"not an image"), ("clip.mp4", b"video")])
def test_no_thumbnail_for_videos_and_unreadable_files(
    client: Client, joined: tuple[str, str], name: str, content: bytes
) -> None:
    media = upload(client, *joined, name, content)
    assert media["thumbnail"] is None
    assert client.get(f"/api/files/{media['id']}/thumbnail/").status_code == 404


needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")


def video_bytes(tmp_path: Path, seconds: float, size: str = "320x240") -> bytes:
    path = tmp_path / "clip.mp4"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "lavfi", "-i", f"testsrc=duration={seconds}:size={size}:rate=10"]
        + ["-c:v", "mpeg4", str(path)],
        check=True,
    )
    return path.read_bytes()


@needs_ffmpeg
@pytest.mark.parametrize(
    ("seconds", "size", "expected"), [(2, "1280x720", (640, 360)), (0.2, "320x240", (320, 240))]
)
def test_video_gets_a_still(
    client: Client,
    joined: tuple[str, str],
    tmp_path: Path,
    seconds: float,
    size: str,
    expected: tuple[int, int],
) -> None:
    media = upload(client, *joined, "clip.mp4", video_bytes(tmp_path, seconds, size))
    assert thumbnail_of(client, media).size == expected  # short clips: the first frame


@needs_ffmpeg
def test_video_shot_upright_gets_an_upright_still(
    client: Client, joined: tuple[str, str], tmp_path: Path
) -> None:
    video_bytes(tmp_path, 1, "640x360")  # → clip.mp4
    rotated = tmp_path / "phone.mov"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-display_rotation", "90", "-i", str(tmp_path / "clip.mp4")]
        + ["-c", "copy", str(rotated)],
        check=True,
    )
    media = upload(client, *joined, "phone.mov", rotated.read_bytes())
    assert thumbnail_of(client, media).size == (360, 640)


@needs_ffmpeg
def test_video_stills_refuse_playlists(client: Client, joined: tuple[str, str]) -> None:
    playlist = b"#EXTM3U\n#EXT-X-TARGETDURATION:1\n#EXTINF:1,\nfile:///etc/passwd\n#EXT-X-ENDLIST\n"
    assert upload(client, *joined, "clip.mp4", playlist)["thumbnail"] is None


def test_videos_without_ffmpeg_keep_no_thumbnail(
    client: Client, joined: tuple[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(shutil, "which", lambda name: None)
    assert upload(client, *joined, "clip.mp4", b"video")["thumbnail"] is None


def test_thumbnail_needs_view_access(client: Client, joined: tuple[str, str]) -> None:
    media = upload(client, *joined, "photo.jpg", image_bytes((20, 20)))
    assert Client().get(media["thumbnail"]).status_code == 404
    Pickup.objects.update(visibility="link")
    assert Client().get(media["thumbnail"]).status_code == 200


def test_thumbnail_goes_to_nginx_in_production(
    client: Client, joined: tuple[str, str], settings: Any
) -> None:
    settings.MEDIA_ACCEL_REDIRECT = True
    media = upload(client, *joined, "photo.jpg", image_bytes((20, 20)))
    response = client.get(media["thumbnail"])
    assert response["X-Accel-Redirect"] == f"/protected-media/{Media.objects.get().thumbnail.name}"
    assert response["Content-Type"] == "image/jpeg"


def test_chunked_upload_creates_thumbnail(client: Client, joined: tuple[str, str]) -> None:
    pickup_id, folder_id = joined
    content = image_bytes((800, 600))
    session = client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/upload-sessions/",
        {"file_name": "big.jpg", "file_size": len(content)},
        content_type="application/json",
    ).json()
    base = f"/api/upload-sessions/{session['id']}"
    client.post(f"{base}/chunks/", {"chunk_index": 0, "chunk": SimpleUploadedFile("c", content)})
    media = client.post(f"{base}/finalize/").json()
    assert thumbnail_of(client, media).size == (THUMBNAIL_SIZE, 480)


def test_backfill_command_creates_missing_thumbnails(client: Client, joined: tuple[str, str]) -> None:
    upload(client, *joined, "photo.jpg", image_bytes((20, 20)))
    upload(client, *joined, "clip.mp4", b"video")
    image = Media.objects.get(media_type="image")
    image.thumbnail.delete(save=True)
    out = io.StringIO()
    call_command("create_thumbnails", stdout=out)
    assert out.getvalue() == "Created 1 thumbnails\n"
    image.refresh_from_db()
    assert image.thumbnail
    call_command("create_thumbnails", stdout=out)  # nothing left: silent
    assert out.getvalue() == "Created 1 thumbnails\n"


def test_deleting_media_removes_thumbnail(client: Client, joined: tuple[str, str]) -> None:
    pickup_id, folder_id = joined
    media = upload(client, pickup_id, folder_id, "photo.jpg", image_bytes((20, 20)))
    stored = Media.objects.get()
    paths = [Path(stored.file.path), Path(stored.thumbnail.path)]
    assert all(path.exists() for path in paths)
    response = client.delete(f"/api/pickups/{pickup_id}/folders/{folder_id}/media/{media['id']}/")
    assert response.status_code == 204
    assert not any(path.exists() for path in paths)


def test_member_removal_and_pickup_deletion_remove_thumbnails(
    client: Client, joined: tuple[str, str], django_capture_on_commit_callbacks: Any
) -> None:
    pickup_id, folder_id = joined
    upload(client, pickup_id, folder_id, "photo.jpg", image_bytes((20, 20)))
    thumbnail = Path(Media.objects.get().thumbnail.path)
    remove_member(Member.objects.get(user_name="Alice"))
    assert not thumbnail.exists()

    bob = Client()
    bob_folder = join(bob, pickup_id, name="Bob").json()["folder"]["id"]
    upload(bob, pickup_id, bob_folder, "photo.jpg", image_bytes((20, 20)))
    thumbnail = Path(Media.objects.get().thumbnail.path)
    with django_capture_on_commit_callbacks(execute=True):
        delete_pickup(Pickup.objects.get())
    assert not thumbnail.exists()


def test_backfill_stops_after_the_current_file_on_sigterm(
    client: Client, joined: tuple[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    for width in (20, 21, 22):  # three different photos (the same one twice is skipped)
        upload(client, *joined, "photo.jpg", image_bytes((width, 20)))
    Media.objects.update(thumbnail="")
    calls: list[Media] = []

    def create_and_get_stopped(media: Media) -> bool:
        calls.append(media)
        os.kill(os.getpid(), signal.SIGTERM)  # docker stop while the first file is made
        return True

    monkeypatch.setattr(create_thumbnails, "create_thumbnail", create_and_get_stopped)
    before = signal.getsignal(signal.SIGTERM)
    out = io.StringIO()
    call_command("create_thumbnails", stdout=out)
    assert len(calls) == 1
    assert out.getvalue() == "Created 1 thumbnails, stopped early\n"
    assert signal.getsignal(signal.SIGTERM) is before


def test_a_preview_made_twice_at_once_is_stored_once(client: Client, joined: tuple[str, str]) -> None:
    upload(client, *joined, "photo.jpg", image_bytes((20, 20)))
    stale = Media.objects.get()
    stored = Path(stale.thumbnail.path)
    stale.thumbnail = ""  # what the backfill saw before the upload stored its preview
    assert not create_thumbnail(stale)
    assert Path(stale.thumbnail.path) == stored
    # The second preview is gone again: only the file and the first preview are left.
    assert sorted(stored.parent.iterdir()) == sorted([Path(stale.file.path), stored])


@pytest.mark.parametrize(("returncode", "attempts"), [(255, 1), (0, 2)])
def test_ffmpeg_retries_only_for_clips_shorter_than_the_seek(
    monkeypatch: pytest.MonkeyPatch, returncode: int, attempts: int
) -> None:
    calls: list[list[str]] = []

    def run(args: list[str], **kwargs: Any) -> subprocess.CompletedProcess[bytes]:
        calls.append(args)
        return subprocess.CompletedProcess(args, returncode, b"", b"stopped")

    monkeypatch.setattr(shutil, "which", lambda name: "/usr/bin/ffmpeg")
    monkeypatch.setattr(subprocess, "run", run)
    with pytest.raises(ValueError, match="no frame"):
        video_still("/data/clip.mp4")
    assert len(calls) == attempts  # 255: an error or SIGTERM (container stopping)


HEIC = (Path(__file__).parent / "files" / "photo.heic").read_bytes()  # 3000 × 2000


def test_iphone_photos_get_a_preview_and_a_jpeg_to_view(client: Client, joined: tuple[str, str]) -> None:
    media = upload(client, *joined, "IMG_0001.HEIC", HEIC)
    assert media["media_type"] == "image"
    assert thumbnail_of(client, media).size == (THUMBNAIL_SIZE, 427)
    assert media["display"] == f"/api/files/{media['id']}/display/"
    response = client.get(media["display"])
    assert response["Content-Type"] == "image/jpeg"
    assert "IMG_0001.jpg" in response["Content-Disposition"]
    display = Image.open(io.BytesIO(b"".join(response.streaming_content)))  # type: ignore[attr-defined]
    assert display.size == (DISPLAY_SIZE, 1707)
    original = client.get(media["file"])  # downloads stay the original
    assert original["Content-Type"] == "image/heic"
    assert Client().get(media["display"]).status_code == 404  # same access check


def test_other_images_need_no_display_copy(client: Client, joined: tuple[str, str]) -> None:
    media = upload(client, *joined, "photo.jpg", image_bytes((20, 20)))
    assert media["display"] is None
    assert client.get(f"/api/files/{media['id']}/display/").status_code == 404


def test_backfill_and_deletion_cover_the_display_copy(client: Client, joined: tuple[str, str]) -> None:
    pickup_id, folder_id = joined
    media = upload(client, pickup_id, folder_id, "IMG_0001.heic", HEIC)
    stored = Media.objects.get()
    stored.display.delete(save=True)
    call_command("create_thumbnails", stdout=io.StringIO())
    stored.refresh_from_db()
    paths = [Path(stored.file.path), Path(stored.thumbnail.path), Path(stored.display.path)]
    assert all(path.exists() for path in paths)
    client.delete(f"/api/pickups/{pickup_id}/folders/{folder_id}/media/{media['id']}/")
    assert not any(path.exists() for path in paths)


def test_unsupported_files_are_refused_with_a_clear_reason(client: Client, joined: tuple[str, str]) -> None:
    pickup_id, folder_id = joined
    response = client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/",
        {"file": SimpleUploadedFile("notes.pdf", b"%PDF")},
    )
    assert response.json() == {
        "file": ["Only photos and videos can be uploaded; “pdf” files aren't supported."]
    }
