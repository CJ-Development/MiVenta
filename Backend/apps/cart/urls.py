from django.urls import path

from .views import CarritoView, ItemCarritoDetalleView

urlpatterns = [

    path(
        "",
        CarritoView.as_view()
    ),

    path(
        "items/<int:id_item>/",
        ItemCarritoDetalleView.as_view()
    ),

]