from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .folders import FolderViewSet
from .media import MediaViewSet
from .pickups import CreatePickupView, PickupViewSet
from .uploads import (
    UploadChunkView,
    UploadSessionCreateView,
    UploadSessionDetailView,
    UploadSessionFinalizeView,
)

# Paths are unchanged from before the restructure, so the SPA keeps working.
router = DefaultRouter()
router.register(r"pickups", PickupViewSet, basename="pickup")
router.register(r"pickups/(?P<pickup_id>[^/.]+)/folders", FolderViewSet, basename="folder")
router.register(
    r"pickups/(?P<pickup_id>[^/.]+)/folders/(?P<folder_id>[^/.]+)/media", MediaViewSet, basename="media"
)

urlpatterns = [
    path("create-pickup/", CreatePickupView.as_view(), name="create-pickup"),
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
