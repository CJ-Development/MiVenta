from django.urls import path

from .views import (
    ResenaView,
    ResenaDetalleView,
    RatingView,
    PuedeResenarView
)

urlpatterns = [

    path(
        "producto/<int:id_producto>/",
        ResenaView.as_view()
    ),

    path(
        "producto/<int:id_producto>/rating/",
        RatingView.as_view()
    ),

    path(
        "producto/<int:id_producto>/puede-resenar/",
        PuedeResenarView.as_view()
    ),

    path(
        "<int:id>/",
        ResenaDetalleView.as_view()
    ),

]