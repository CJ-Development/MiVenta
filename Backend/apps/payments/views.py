"""
Views de la app payments.

Funcionalidades:
  - Catálogo de métodos de pago (MetodosPagoView)
  - Listado de pagos (PagosView)
  - Confirmación manual de pagos (ConfirmarPagoView)
"""

import logging

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.orders.models import Compra, MetodoPago
from apps.products.models import Variante

from .models import Pago
from .serializers import (
    PagoSerializer,
    MetodoPagoCatalogoSerializer,
)


logger = logging.getLogger(__name__)


# ============================================================
# HELPERS
# ============================================================

def _finalizar_compra(compra):
    """
    Confirma la compra: descuenta stock definitivamente y marca
    la compra como 'pagado'.
    """
    if compra.estado_compra == "pagado":
        return

    with transaction.atomic():
        compra = (
            Compra.objects
            .select_for_update()
            .get(id_compra=compra.id_compra)
        )

        if compra.estado_compra == "pagado":
            return

        for detalle in compra.detalles.select_related("variante"):
            variante = (
                Variante.objects
                .select_for_update()
                .get(id_variante=detalle.variante.id_variante)
            )

            if not variante.stock_infinito:
                if variante.stock < detalle.cantidad:
                    raise ValueError(
                        f"Stock insuficiente al confirmar "
                        f"variante {variante.sku}."
                    )
                
                variante.stock -= detalle.cantidad
                variante.save(update_fields=["stock"])

        compra.estado_compra = "pagado"
        compra.save(update_fields=["estado_compra"])


# ============================================================
# CATÁLOGO Y CONSULTAS GENÉRICAS
# ============================================================

@method_decorator(ensure_csrf_cookie, name="dispatch")
class MetodosPagoView(APIView):

    def get(self, request):

        metodos = MetodoPago.objects.all().order_by("tipo")

        if not metodos.exists():
            defaults = [
                {
                    "tipo": "WhatsApp",
                    "detalle": "Envía tu pedido directamente por WhatsApp",
                },
                {
                    "tipo": "Contra entrega",
                    "detalle": "Pagas al recibir tu pedido",
                },
                {
                    "tipo": "Transferencia bancaria",
                    "detalle": "Transferencia directa a cuenta",
                },
            ]
            for d in defaults:
                MetodoPago.objects.get_or_create(
                    tipo=d["tipo"],
                    defaults={"detalle": d["detalle"]},
                )
            metodos = MetodoPago.objects.all().order_by("tipo")

        data = [
            MetodoPagoCatalogoSerializer.from_model(m) for m in metodos
        ]
        return Response(data)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class PagosView(APIView):

    def get(self, request):
        compra_id = request.query_params.get("compra_id")
        qs = (
            Pago.objects
            .select_related("metodo_pago", "compra")
            .order_by("-fecha_pago")
        )
        if compra_id:
            qs = qs.filter(compra_id=compra_id)
        return Response(PagoSerializer(qs, many=True).data)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class ConfirmarPagoView(APIView):
    """
    POST /api/payments/confirmar/
    Body: {"compra_id": 123}

    Para métodos de pago (WhatsApp, contra entrega, transferencia).
    """

    def post(self, request):

        compra_id = request.data.get("compra_id")

        if not compra_id:
            return Response(
                {"detail": "Se requiere 'compra_id'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        compra = get_object_or_404(Compra, id_compra=compra_id)

        pago = (
            Pago.objects
            .filter(compra=compra)
            .select_related("metodo_pago")
            .order_by("-fecha_pago")
            .first()
        )

        if not pago:
            return Response(
                {"detail": "No existe un pago para esta compra."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if pago.estado != "aprobado":
            pago.estado = "aprobado"
            pago.fecha_aprobacion = timezone.now()
            pago.save(update_fields=["estado", "fecha_aprobacion"])

        _finalizar_compra(compra)

        return Response({
            "ok": True,
            "compra_id": compra.id_compra,
            "pago_id": pago.id_pago,
            "estado": "aprobado",
        })
