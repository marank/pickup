from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .files import MediaFileView
from .folders import FolderViewSet
from .media import MediaViewSet
from .members import MemberViewSet
from .pickups import PickupViewSet
from .uploads import (
    UploadChunkView,
    UploadSessionCreateView,
    UploadSessionDetailView,
    UploadSessionFinalizeView,
)

router = DefaultRouter()
router.register(r"pickups", PickupViewSet, basename="pickup")
router.register(r"pickups/(?P<pickup_id>[^/.]+)/folders", FolderViewSet, basename="folder")
router.register(
    r"pickups/(?P<pickup_id>[^/.]+)/folders/(?P<folder_id>[^/.]+)/media", MediaViewSet, basename="media"
)
router.register(r"pickups/(?P<pickup_id>[^/.]+)/members", MemberViewSet, basename="member")

urlpatterns = [
    path("api/files/<uuid:media_id>/", MediaFileView.as_view(), name="media-file"),
    path(
        "api/upload-sessions/",
        include(
            [
                path("<uuid:session_id>/", UploadSessionDetailView.as_view(), name="upload-session-detail"),
                path("<uuid:session_id>/chunks/", UploadChunkView.as_view(), name="upload-chunk"),
                path(
                    "<uuid:session_id>/finalize/", UploadSessionFinalizeView.as_view(), name="upload-finalize"
                ),
            ]
        ),
    ),
    path(
        "api/pickups/<uuid:pickup_id>/folders/<uuid:folder_id>/upload-sessions/",
        UploadSessionCreateView.as_view(),
        name="upload-session-create",
    ),
    path("api/", include(router.urls)),
]
