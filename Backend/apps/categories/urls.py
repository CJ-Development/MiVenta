from django.urls import path

from .views import (
    CategoriaView,
    CategoriaDetalleView,
    CategoriaArchivarView,
    CategoriaReactivarView,
)

urlpatterns = [

    path(
        "",
        CategoriaView.as_view()
    ),

    path(
        "<int:id>/",
        CategoriaDetalleView.as_view()
    ),

    path(
        "<int:id>/archivar/",
        CategoriaArchivarView.as_view()
    ),

    path(
        "<int:id>/reactivar/",
        CategoriaReactivarView.as_view()
    ),

]