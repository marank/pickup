from typing import TYPE_CHECKING, Any

import pytest
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client

from apps.pickups.models import Folder, Media, Member, Pickup, UploadSession

if TYPE_CHECKING:  # only defined in django-stubs
    from django.test.client import _MonkeyPatchedWSGIResponse as TestResponse

pytestmark = pytest.mark.django_db


def create_pickup(client: Client, title: str = "Party") -> dict[str, Any]:
    response = client.post("/api/pickups/", {"title": title}, content_type="application/json")
    assert response.status_code == 201
    data: dict[str, Any] = response.json()
    return data


def join(client: Client, pickup_id: str, name: str = "Alice", email: str = "") -> TestResponse:
    return client.post(
        f"/api/pickups/{pickup_id}/join/",
        {"name": f"{name} folder", "user_name": name, "email": email},
        content_type="application/json",
    )


@pytest.fixture
def joined(client: Client) -> tuple[str, str]:
    """Alice joined a pickup; `client` is logged in as her."""
    pickup = create_pickup(Client())
    data = join(client, pickup["id"]).json()
    return pickup["id"], data["folder"]["id"]


def test_create_pickup_logs_in_creator(client: Client) -> None:
    pickup = create_pickup(client)
    creator = Member.objects.get(pickup_id=pickup["id"])
    assert creator.is_creator
    assert pickup["member_url"] == f"/pickup/{pickup['id']}/member/{creator.access_key}"
    assert client.get(f"/api/pickups/{pickup['id']}/").json()["is_creator"] is True


def test_pickup_never_exposes_member_ids_or_keys(client: Client, joined: tuple[str, str]) -> None:
    pickup_id, _ = joined
    Pickup.objects.update(visibility="link")  # let strangers look at the contents
    stranger = Client()
    secrets = [str(m.id) for m in Member.objects.all()] + [m.access_key for m in Member.objects.all()]
    for url in [f"/api/pickups/{pickup_id}/", f"/api/pickups/{pickup_id}/folders/"]:
        body = stranger.get(url).content.decode()
        assert not any(secret in body for secret in secrets), url
    assert "email" not in stranger.get(f"/api/pickups/{pickup_id}/folders/").json()[0]
    assert stranger.get(f"/api/pickups/{pickup_id}/").json()["is_creator"] is False


def test_pickup_ids_are_random_uuid4(client: Client) -> None:
    assert Pickup.objects.get(id=create_pickup(client)["id"]).id.version == 4


def test_join_creates_folder_logs_in_and_mails_link(client: Client) -> None:
    pickup = create_pickup(Client())
    response = join(client, pickup["id"], email="alice@example.com")
    assert response.status_code == 201
    member = Member.objects.get(user_name="Alice")
    assert response.json()["member_url"] == member.personal_path
    assert member.access_key in mail.outbox[0].body
    folders = client.get(f"/api/pickups/{pickup['id']}/folders/").json()
    assert [f["can_edit"] for f in folders] == [True]


def test_join_with_taken_name_does_not_hand_out_membership(client: Client, joined: tuple[str, str]) -> None:
    pickup_id, _ = joined
    response = Client().post(
        f"/api/pickups/{pickup_id}/join/",
        {"name": "Other folder", "user_name": "Alice"},
        content_type="application/json",
    )
    assert response.status_code == 400
    assert "user_name" in response.json()


def test_join_rejects_duplicate_folder_name(client: Client, joined: tuple[str, str]) -> None:
    pickup_id, _ = joined
    response = Client().post(
        f"/api/pickups/{pickup_id}/join/",
        {"name": "Alice folder", "user_name": "Bob"},
        content_type="application/json",
    )
    assert response.status_code == 400


def test_personal_link_logs_in_another_browser(joined: tuple[str, str]) -> None:
    pickup_id, folder_id = joined
    member = Member.objects.get(user_name="Alice")
    other_browser = Client()
    url = f"/api/pickups/{pickup_id}/session/"
    bad = other_browser.post(url, {"access_key": "wrong"}, content_type="application/json")
    assert bad.status_code == 403
    assert (
        other_browser.post(url, {"access_key": str(member.id)}, content_type="application/json").status_code
        == 403
    )

    response = other_browser.post(url, {"access_key": member.access_key}, content_type="application/json")
    assert response.status_code == 200
    folder = other_browser.get(f"/api/pickups/{pickup_id}/folders/{folder_id}/").json()
    assert folder["can_edit"] is True

    assert other_browser.delete(url).status_code == 204
    # Signed out of a private pickup: no access at all anymore.
    assert other_browser.get(f"/api/pickups/{pickup_id}/folders/{folder_id}/").status_code == 403


def test_member_id_parameter_is_no_longer_a_credential(joined: tuple[str, str]) -> None:
    pickup_id, folder_id = joined
    member = Member.objects.get(user_name="Alice")
    response = Client().post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/?member_id={member.id}",
        {"file": SimpleUploadedFile("a.jpg", b"x"), "member_id": str(member.id)},
    )
    assert response.status_code == 403


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("get", "/api/pickups/"),
        ("put", "/api/pickups/{pickup}/"),
        ("post", "/api/pickups/{pickup}/folders/"),
        ("put", "/api/pickups/{pickup}/folders/{folder}/"),
        ("post", "/api/pickups/{pickup}/folders/{folder}/media/{media}/"),
        ("put", "/api/pickups/{pickup}/folders/{folder}/media/{media}/"),
        ("patch", "/api/pickups/{pickup}/folders/{folder}/media/{media}/"),
    ],
)
def test_removed_crud_actions(client: Client, joined: tuple[str, str], method: str, path: str) -> None:
    pickup_id, folder_id = joined
    media = upload(client, pickup_id, folder_id).json()
    url = path.format(pickup=pickup_id, folder=folder_id, media=media["id"])
    # The folder owner is logged in and still can't use them.
    response = getattr(client, method)(url, {}, content_type="application/json")
    assert response.status_code in (404, 405)
    assert Pickup.objects.exists()
    assert Folder.objects.exists()
    assert Media.objects.exists()


def test_unsafe_requests_need_csrf_token(joined: tuple[str, str]) -> None:
    pickup_id, _ = joined
    browser = Client(enforce_csrf_checks=True)
    assert browser.post("/api/pickups/", {}, content_type="application/json").status_code == 403

    browser.get("/api/csrf")
    token = browser.cookies["csrftoken"].value
    response = browser.post(
        "/api/pickups/", {}, content_type="application/json", headers={"X-CSRFToken": token}
    )
    assert response.status_code == 201


def test_inactive_pickup_is_gone(client: Client, joined: tuple[str, str]) -> None:
    pickup_id, folder_id = joined
    Pickup.objects.update(is_active=False)
    assert client.get(f"/api/pickups/{pickup_id}/").status_code == 404
    assert client.get(f"/api/pickups/{pickup_id}/folders/{folder_id}/").status_code == 404
    assert client.get(f"/api/pickups/{pickup_id}/folders/{folder_id}/media/").status_code == 404


def upload(client: Client, pickup_id: str, folder_id: str, name: str = "photo.jpg") -> TestResponse:
    return client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/",
        {"file": SimpleUploadedFile(name, b"jpegdata"), "caption": "hi"},
    )


def test_upload_requires_folder_owner(joined: tuple[str, str]) -> None:
    pickup_id, folder_id = joined
    bob = Client()
    join(bob, pickup_id, name="Bob")
    assert upload(bob, pickup_id, folder_id).status_code == 403
    assert upload(Client(), pickup_id, folder_id).status_code == 403


@pytest.mark.parametrize("name", ["evil.exe", "drawing.svg", "page.html"])
def test_upload_rejects_unsupported_types(client: Client, joined: tuple[str, str], name: str) -> None:
    assert upload(client, *joined, name=name).status_code == 400


def test_uploaded_files_get_random_names(client: Client, joined: tuple[str, str]) -> None:
    media = upload(client, *joined).json()
    stored = Media.objects.get(id=media["id"])
    assert media["original_filename"] == "photo.jpg"
    assert stored.file.name
    assert "photo" not in stored.file.name
    assert stored.file.name.endswith(".jpg")


def test_upload_caption_delete_and_clear(client: Client, joined: tuple[str, str]) -> None:
    pickup_id, folder_id = joined
    response = upload(client, pickup_id, folder_id)
    assert response.status_code == 201
    media = response.json()
    assert media["media_type"] == "image"
    assert media["file_size_display"] == "8.0 B"

    stranger = Client()
    base = f"/api/pickups/{pickup_id}/folders/{folder_id}/media/{media['id']}"
    assert stranger.get(f"{base}/").status_code == 403  # private by default
    Pickup.objects.update(visibility="link")
    assert stranger.get(f"{base}/").status_code == 200
    response = client.patch(f"{base}/caption/", {"caption": "new"}, content_type="application/json")
    assert response.json()["caption"] == "new"
    assert (
        stranger.patch(f"{base}/caption/", {"caption": "x"}, content_type="application/json").status_code
        == 403
    )
    assert stranger.delete(f"{base}/").status_code == 403
    assert client.delete(f"{base}/").status_code == 204

    upload(client, pickup_id, folder_id)
    clear = f"/api/pickups/{pickup_id}/folders/{folder_id}/clear/"
    assert stranger.delete(clear).status_code == 403
    assert client.delete(clear).status_code == 200
    assert not Media.objects.exists()


def test_chunked_upload(client: Client, joined: tuple[str, str]) -> None:
    pickup_id, folder_id = joined
    content = b"0123456789" * 3
    response = client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/upload-sessions/",
        {"file_name": "../clip.mp4", "file_size": len(content), "media_type": "image", "chunk_size": 16},
        content_type="application/json",
    )
    assert response.status_code == 201
    session = response.json()
    assert session["total_chunks"] == 2
    assert session["media_type"] == "video"  # derived from the extension, not the client
    base = f"/api/upload-sessions/{session['id']}"

    assert Client().get(f"{base}/").status_code == 403
    response = client.post(f"{base}/finalize/")
    assert response.json() == {"error": "Missing 2 chunks"}

    for index, part in enumerate([content[:16], content[16:]]):
        response = client.post(
            f"{base}/chunks/", {"chunk_index": index, "chunk": SimpleUploadedFile("c", part)}
        )
        assert response.status_code == 200
    assert client.get(f"{base}/").json()["missing_chunks"] == []

    response = client.post(f"{base}/finalize/")
    assert response.status_code == 201
    media = Media.objects.get()
    assert media.file.read() == content
    assert media.original_filename == "../clip.mp4"
    assert media.file.name
    assert ".." not in media.file.name
    assert media.file.name.endswith(".mp4")
    assert UploadSession.objects.get().status == "complete"
    assert client.post(f"{base}/finalize/").status_code == 400


def test_chunked_upload_rejects_unsupported_types(client: Client, joined: tuple[str, str]) -> None:
    pickup_id, folder_id = joined
    response = client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/upload-sessions/",
        {"file_name": "x.svg", "file_size": 10},
        content_type="application/json",
    )
    assert response.status_code == 400


def test_chunk_upload_checks_owner_and_range(client: Client, joined: tuple[str, str]) -> None:
    _, folder_id = joined
    folder = Folder.objects.get(id=folder_id)
    session = UploadSession.objects.create(
        folder=folder, file_name="a.mp4", file_size=1, chunk_size=1, total_chunks=1, media_type="video"
    )
    url = f"/api/upload-sessions/{session.id}/chunks/"
    assert Client().post(url, {"chunk_index": 0, "chunk": SimpleUploadedFile("c", b"x")}).status_code == 403
    response = client.post(url, {"chunk_index": 5, "chunk": SimpleUploadedFile("c", b"x")})
    assert response.json() == {"error": "Chunk index out of range"}
