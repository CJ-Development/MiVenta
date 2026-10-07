from django.urls import path

from .views import (
    MetodosPagoView,
    PagosView,
    ConfirmarPagoView,
)

urlpatterns = [
    # Catálogo y listados
    path("metodos/", MetodosPagoView.as_view(), name="payments-metodos"),
    path("", PagosView.as_view(), name="payments"),

    # Confirmar pagos (contra entrega, transferencia)
    path("confirmar/", ConfirmarPagoView.as_view(), name="payments-confirmar"),
]

app_name = "payments"
