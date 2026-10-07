from django.db import models


class Carrito(models.Model):

    id_carrito = models.AutoField(primary_key=True)

    usuario = models.OneToOneField(
        "users.Usuario",
        on_delete=models.CASCADE,
        db_column="id_usuario",
        related_name="carrito"
    )

    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "carritos"

    def __str__(self):
        return f"Carrito {self.id_carrito}"
        

class ItemCarrito(models.Model):

    id_item = models.AutoField(primary_key=True)

    carrito = models.ForeignKey(
        Carrito,
        on_delete=models.CASCADE,
        related_name="items",
        db_column="id_carrito"
    )

    variante = models.ForeignKey(
        "products.Variante",
        on_delete=models.CASCADE,
        db_column="id_variante"
    )

    cantidad = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "carrito_items"

    def __str__(self):
        return f"{self.variante} ({self.cantidad})"