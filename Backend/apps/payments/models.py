from django.db import models


class Pago(models.Model):
    """
    Pago asociado a una Compra.

    El flujo es:
      1. Compra se crea en estado 'pendiente' (POST /orders/checkout/).
      2. ConfirmarPagoView confirma pagos (WhatsApp, contra entrega, transferencia).
    """

    ESTADOS = [
        ("pendiente", "Pendiente"),
        ("aprobado", "Aprobado"),
        ("rechazado", "Rechazado"),
        ("reembolsado", "Reembolsado"),
        ("expirado", "Expirado"),
    ]

    id_pago = models.AutoField(primary_key=True)

    compra = models.ForeignKey(
        "orders.Compra",
        on_delete=models.CASCADE,
        db_column="id_compra",
        related_name="pagos",
    )

    metodo_pago = models.ForeignKey(
        "orders.MetodoPago",
        on_delete=models.PROTECT,
        db_column="id_metodo_pago",
    )

    monto = models.DecimalField(max_digits=10, decimal_places=2)

    # Referencia única de la transacción
    referencia_transaccion = models.CharField(
        max_length=120,
        blank=True,
        null=True,
        db_index=True,
    )

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default="pendiente",
    )

    fecha_pago = models.DateTimeField(auto_now_add=True)

    fecha_aprobacion = models.DateTimeField(null=True, blank=True)

    # Aceptaciones legales de VentasYa
    terminos_aceptados = models.BooleanField(default=False)
    datos_aceptados = models.BooleanField(default=False)
    fecha_aceptacion = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "pagos"

    def __str__(self):
        return f"Pago #{self.id_pago} - {self.estado}"
