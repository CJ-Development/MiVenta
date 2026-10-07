from django.urls import path

from .views import OfertaView, OfertaDetalleView, DebugAuthView

urlpatterns = [
    path("", OfertaView.as_view()),
    path("<int:id>/", OfertaDetalleView.as_view()),
    path("_debug/auth/", DebugAuthView.as_view()),
]

app_name = "offers"
