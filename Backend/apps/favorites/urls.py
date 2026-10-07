from django.urls import path

from .views import (
    FavoritoView,
    FavoritoDetalleView
)

urlpatterns = [

    path(
        "",
        FavoritoView.as_view()
    ),

    path(
        "<int:id>/",
        FavoritoDetalleView.as_view()
    ),

]