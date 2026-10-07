from django.db import models


class Resena(models.Model):

    id_resena = models.AutoField(primary_key=True)

    compra = models.ForeignKey(
        "orders.Compra",
        on_delete=models.CASCADE,
        db_column="id_compra",
        related_name="resenas",
        null=True,
        blank=True,
        help_text="Compra asociada (obligatoria para nuevas reseñas, nullable para históricas)"
    )

    usuario = models.ForeignKey(
        "users.Usuario",
        on_delete=models.CASCADE,
        db_column="id_usuario",
        related_name="resenas",
        null=True,
        blank=True,
        help_text="Usuario (opcional para reseñas de invitados)"
    )

    producto = models.ForeignKey(
        "products.Producto",
        on_delete=models.CASCADE,
        db_column="id_producto",
        related_name="resenas"
    )

    nombre_cliente = models.CharField(
        max_length=150,
        null=True,
        blank=True,
        help_text="Nombre del cliente al momento de la reseña (snapshot para invitados)"
    )

    calificacion = models.PositiveSmallIntegerField(
        help_text="Calificación del 1 al 5"
    )

    comentario = models.TextField()

    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "resenas"
        unique_together = ("compra", "producto")
        constraints = [
            models.CheckConstraint(
                check=models.Q(calificacion__gte=1) & models.Q(calificacion__lte=5),
                name="calificacion_rango_valido"
            )
        ]

    def __str__(self):
        cliente = self.nombre_cliente or (self.usuario.nombres if self.usuario else "Anónimo")
        return f"{cliente} - {self.producto} ({self.calificacion}★)"