from django.db import models

from apps.products.models import Producto, Variante
from apps.categories.models import Categoria


class Oferta(models.Model):

    TIPO_DESCUENTO = [
        ("porcentaje", "Porcentaje"),
        ("fijo", "Valor fijo"),
    ]

    id_oferta = models.AutoField(primary_key=True)

    nombre = models.CharField(max_length=150)

    descripcion = models.TextField(blank=True, default="")

    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        db_column="id_producto",
        related_name="ofertas",
    )

    # Variante opcional: si se define, la oferta aplica sólo a esa
    # variante; si es NULL, aplica a todas las variantes del producto.
    variante = models.ForeignKey(
        Variante,
        on_delete=models.SET_NULL,
        db_column="id_variante",
        related_name="ofertas",
        null=True,
        blank=True,
    )

    # M2M con categorías: una oferta puede aplicar a varias
    # categorías y/o subcategorías. La vista pública arma el
    # mega-menú agrupando por estas categorías.
    categorias = models.ManyToManyField(
        Categoria,
        related_name="ofertas",
        blank=True,
    )

    tipo_descuento = models.CharField(
        max_length=20,
        choices=TIPO_DESCUENTO,
        default="porcentaje",
    )

    valor = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    fecha_inicio = models.DateTimeField()

    fecha_fin = models.DateTimeField()

    activa = models.BooleanField(default=True)

    class Meta:
        db_table = "ofertas"

    def __str__(self):
        return self.nombre
