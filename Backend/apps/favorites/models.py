from django.db import models


class Favorito(models.Model):

    id_favorito = models.AutoField(primary_key=True)

    usuario = models.ForeignKey(
        "users.Usuario",
        on_delete=models.CASCADE,
        db_column="id_usuario",
        related_name="favoritos"
    )

    producto = models.ForeignKey(
        "products.Producto",
        on_delete=models.CASCADE,
        db_column="id_producto",
        related_name="favoritos"
    )

    fecha_agregado = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "favoritos"
        unique_together = ("usuario", "producto")

    def __str__(self):
        return f"{self.usuario} - {self.producto}"