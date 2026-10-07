from django.contrib import admin

from .models import Oferta


@admin.register(Oferta)
class OfertaAdmin(admin.ModelAdmin):

    list_display = (
        "id_oferta",
        "nombre",
        "producto",
        "tipo_descuento",
        "valor",
        "fecha_inicio",
        "fecha_fin",
        "activa",
    )

    list_filter = ("activa", "tipo_descuento")

    search_fields = ("nombre", "producto__nombre")
