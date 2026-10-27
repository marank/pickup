import pytest
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.pickups.models import Folder, Media, Member, UploadSession

pytestmark = pytest.mark.django_db


def create_pickup(client, title="Party"):
    response = client.post("/create-pickup/", {"title": title}, content_type="application/json")
    assert response.status_code == 201
    return response.json()


def join(client, pickup_id, name="Alice", email=""):
    return client.post(
        f"/api/pickups/{pickup_id}/join/",
        {"name": f"{name} folder", "user_name": name, "user_email": email},
        content_type="application/json",
    )


@pytest.fixture
def joined(client):
    pickup = create_pickup(client)
    data = join(client, pickup["id"]).json()
    return pickup["id"], data["folder"]["id"], data["member_id"]


def test_create_pickup_returns_creator(client):
    pickup = create_pickup(client)
    creator = Member.objects.get(pickup_id=pickup["id"])
    assert creator.is_creator
    assert pickup["is_creator"] is True
    assert pickup["creator_member_id"] == str(creator.id)


def test_join_creates_folder_and_mails_link(client):
    pickup = create_pickup(client)
    response = join(client, pickup["id"], email="alice@example.com")
    assert response.status_code == 201
    member = Member.objects.get(id=response.json()["member_id"])
    assert member.folder.name == "Alice folder"
    assert len(mail.outbox) == 1
    assert str(member.id) in mail.outbox[0].body


def test_join_again_returns_existing_member(client, joined):
    pickup_id, _, member_id = joined
    response = client.post(
        f"/api/pickups/{pickup_id}/join/",
        {"name": "Other name", "user_name": "Alice"},
        content_type="application/json",
    )
    assert response.status_code == 200
    assert response.json()["member_id"] == member_id


def test_join_rejects_duplicate_folder_name(client, joined):
    pickup_id, _, _ = joined
    response = client.post(
        f"/api/pickups/{pickup_id}/join/",
        {"name": "Alice folder", "user_name": "Bob"},
        content_type="application/json",
    )
    assert response.status_code == 400


def test_pickup_detail_folders_and_media(client, joined):
    pickup_id, folder_id, member_id = joined
    detail = client.get(f"/api/pickups/{pickup_id}/?member_id={member_id}").json()
    assert detail["folder_count"] == 1
    assert detail["is_creator"] is False
    folders = client.get(f"/api/pickups/{pickup_id}/folders/?member_id={member_id}").json()
    assert [f["can_edit"] for f in folders] == [True]
    assert client.get(f"/api/pickups/{pickup_id}/media/").json() == []


def upload(client, pickup_id, folder_id, member_id, name="photo.jpg"):
    return client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/media/",
        {"file": SimpleUploadedFile(name, b"jpegdata"), "caption": "hi", "member_id": member_id},
    )


def test_upload_requires_folder_owner(client, joined):
    pickup_id, folder_id, _ = joined
    other = join(client, pickup_id, name="Bob").json()["member_id"]
    assert upload(client, pickup_id, folder_id, other).status_code == 403


def test_upload_rejects_unknown_extension(client, joined):
    assert upload(client, *joined, name="evil.exe").status_code == 400


def test_upload_caption_delete_and_clear(client, joined):
    pickup_id, folder_id, member_id = joined
    response = upload(client, pickup_id, folder_id, member_id)
    assert response.status_code == 201
    media = response.json()
    assert media["media_type"] == "image"
    assert media["file_size_display"] == "8.0 B"

    base = f"/api/pickups/{pickup_id}/folders/{folder_id}/media/{media['id']}"
    response = client.patch(
        f"{base}/caption/?member_id={member_id}", {"caption": "new"}, content_type="application/json"
    )
    assert response.json()["caption"] == "new"
    assert (
        client.patch(f"{base}/caption/", {"caption": "x"}, content_type="application/json").status_code == 403
    )
    assert client.delete(f"{base}/").status_code == 403
    assert client.delete(f"{base}/?member_id={member_id}").status_code == 204

    upload(client, pickup_id, folder_id, member_id)
    clear = f"/api/pickups/{pickup_id}/folders/{folder_id}/clear/"
    assert client.delete(clear).status_code == 403
    assert client.delete(f"{clear}?member_id={member_id}").status_code == 200
    assert not Media.objects.exists()


def test_chunked_upload(client, joined, settings):
    pickup_id, folder_id, member_id = joined
    content = b"0123456789" * 3
    response = client.post(
        f"/api/pickups/{pickup_id}/folders/{folder_id}/upload-sessions/?member_id={member_id}",
        {"file_name": "../clip.mp4", "file_size": len(content), "media_type": "video", "chunk_size": 16},
        content_type="application/json",
    )
    assert response.status_code == 201
    session = response.json()
    assert session["total_chunks"] == 2
    base = f"/api/upload-sessions/{session['id']}"

    response = client.post(f"{base}/finalize/?member_id={member_id}")
    assert response.json() == {"error": "Missing 2 chunks"}

    for index, part in enumerate([content[:16], content[16:]]):
        response = client.post(
            f"{base}/chunks/",
            {"chunk_index": index, "chunk": SimpleUploadedFile("c", part), "member_id": member_id},
        )
        assert response.status_code == 200
    assert client.get(f"{base}/").json()["missing_chunks"] == []

    response = client.post(f"{base}/finalize/?member_id={member_id}")
    assert response.status_code == 201
    media = Media.objects.get()
    assert media.file.read() == content
    assert not media.file.name.startswith("/")
    assert "/" not in media.file.name.split("_", 1)[1]  # client path stripped
    assert UploadSession.objects.get().status == "complete"
    assert client.post(f"{base}/finalize/?member_id={member_id}").status_code == 400


def test_chunk_upload_checks_owner_and_range(client, joined):
    pickup_id, folder_id, member_id = joined
    folder = Folder.objects.get(id=folder_id)
    session = UploadSession.objects.create(
        folder=folder, file_name="a.mp4", file_size=1, chunk_size=1, total_chunks=1, media_type="video"
    )
    url = f"/api/upload-sessions/{session.id}/chunks/"
    assert client.post(url, {"chunk_index": 0, "chunk": SimpleUploadedFile("c", b"x")}).status_code == 403
    chunk = {"chunk_index": 5, "chunk": SimpleUploadedFile("c", b"x"), "member_id": member_id}
    response = client.post(url, chunk)
    assert response.json() == {"error": "Chunk index out of range"}
