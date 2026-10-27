from django.conf import settings
from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.core.api.health import HealthView
from apps.pickups.api import urls as pickups_urls

urlpatterns = [
    path("api/health", HealthView.as_view()),
    *pickups_urls.urlpatterns,
]
if settings.DEBUG:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema")),
    ]
