from django.db import models


class MetodoPago(models.Model):

    id_metodo_pago = models.AutoField(primary_key=True)

    tipo = models.CharField(max_length=50)

    detalle = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    class Meta:
        db_table = "metodos_pago"

    def __str__(self):
        return self.tipo


class Compra(models.Model):

    ESTADOS = [

        ("pendiente","Pendiente"),

        ("pagado","Pagado"),

        ("enviado","Enviado"),

        ("entregado","Entregado"),

        ("cancelado","Cancelado")

    ]

    id_compra = models.AutoField(primary_key=True)

    usuario = models.ForeignKey(
        "users.Usuario",
        on_delete=models.PROTECT,
        db_column="id_usuario",
        null=True,
        blank=True
    )

    nombre_cliente = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    direccion = models.ForeignKey(
        "users.Direccion",
        on_delete=models.PROTECT,
        db_column="id_direccion",
        null=True,
        blank=True
    )

    metodo_pago = models.ForeignKey(
        MetodoPago,
        on_delete=models.PROTECT,
        db_column="id_metodo_pago"
    )

    fecha_compra = models.DateTimeField(
        auto_now_add=True
    )

    total = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    estado_compra = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default="pendiente"
    )

    telefono_contacto = models.CharField(
        max_length=20,
        blank=True,
        null=True,
    )

    class Meta:

        db_table="compras"

    def __str__(self):

        return str(self.id_compra)


class DetalleCompra(models.Model):

    id_detalle = models.AutoField(primary_key=True)

    compra = models.ForeignKey(
        Compra,
        on_delete=models.CASCADE,
        db_column="id_compra",
        related_name="detalles"
    )

    variante = models.ForeignKey(
        "products.Variante",
        on_delete=models.PROTECT,
        db_column="id_variante"
    )

    cantidad = models.PositiveIntegerField()

    precio_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    class Meta:

        db_table="detalle_compra"

    def __str__(self):

        return f"Detalle {self.id_detalle}"