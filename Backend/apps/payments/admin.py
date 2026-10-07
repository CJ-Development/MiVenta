from django.contrib import admin

from .models import Pago


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = (
        "id_pago",
        "compra",
        "metodo_pago",
        "monto",
        "estado",
        "fecha_pago",
    )
    list_filter = ("estado", "metodo_pago")
    search_fields = ("compra__id_compra", "referencia_transaccion")
    ordering = ("-fecha_pago",)
