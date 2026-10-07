from django.db import models
from apps.categories.models import Categoria

# ==========================
# COLORES
# ==========================

class Color(models.Model):

    id_color = models.AutoField(primary_key=True)

    nombre = models.CharField(
        max_length=50,
        unique=True
    )

    codigo_hex = models.CharField(
        max_length=7
    )

    class Meta:
        db_table = "colores"

    def __str__(self):
        return self.nombre


# ==========================
# TALLAS
# ==========================

class Talla(models.Model):

    id_talla = models.AutoField(primary_key=True)

    nombre = models.CharField(
        max_length=20,
        unique=True
    )

    class Meta:
        db_table = "tallas"

    def __str__(self):
        return self.nombre


# ==========================
# DISEÑOS
# ==========================

class Diseño(models.Model):

    id_diseño = models.AutoField(primary_key=True)

    nombre = models.CharField(
        max_length=50,
        unique=True
    )

    imagen = models.URLField(
        max_length=500,
        blank=True,
        null=True
    )

    class Meta:
        db_table = "diseños"

    def __str__(self):
        return self.nombre


# ==========================
# PRODUCTOS
# ==========================


class Producto(models.Model):

    ESTADOS = [

        ("activo","Activo"),

        ("inactivo","Inactivo"),

        ("archivado","Archivado"),

    ]

    id_producto = models.AutoField(primary_key=True)

    tiendanube_product_id = models.PositiveBigIntegerField(
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="ID externo de Tiendanube"
    )

    # MANTENER TEMPORALMENTE para migración de datos
    categoria = models.ForeignKey(
        "categories.Categoria",
        on_delete=models.PROTECT,
        db_column="id_categoria",
        null=True,
        blank=True
    )

    # NUEVA RELACIÓN ManyToMany (la fuente de verdad después de migración)
    categorias = models.ManyToManyField(
        "categories.Categoria",
        related_name="productos",
        blank=True
    )

    nombre = models.CharField(max_length=150)

    slug = models.SlugField(
        unique=True
    )

    descripcion = models.TextField()

    precio = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default="activo"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        null=True,
        blank=True
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        null=True,
        blank=True
    )

    producto_simple = models.BooleanField(
        default=False,
        db_index=True,
        help_text="True si es producto simple (sin variantes visibles), False si tiene variantes"
    )

    class Meta:
        db_table="productos"
        ordering=["-created_at", "id_producto"]

    def __str__(self):
        return self.nombre


# ==========================
# VARIANTES
# ==========================

class Variante(models.Model):

    id_variante = models.AutoField(primary_key=True)

    tiendanube_variant_id = models.PositiveBigIntegerField(
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="ID externo de Tiendanube"
    )

    precio = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Precio real de esta variante (Tiendanube)"
    )

    atributos_extra = models.JSONField(
        blank=True,
        default=dict,
        help_text="Atributos de Tiendanube no mapeados a Color/Talla/Diseño"
    )

    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        db_column="id_producto"
    )

    color = models.ForeignKey(
        Color,
        on_delete=models.PROTECT,
        db_column="id_color",
        null=True,
        blank=True
    )

    diseño = models.ForeignKey(
        Diseño,
        on_delete=models.PROTECT,
        db_column="id_diseño",
        null=True,
        blank=True
    )

    talla = models.ForeignKey(
        Talla,
        on_delete=models.PROTECT,
        db_column="id_talla",
        null=True,
        blank=True
    )

    sku = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True
    )

    stock = models.PositiveIntegerField(default=0)
    stock_infinito = models.BooleanField(default=False, help_text="True si el inventario no se gestiona")

    class Meta:

        db_table="producto_variantes"

    def __str__(self):

        return self.sku


# ==========================
# IMAGENES
# ==========================

class ImagenProducto(models.Model):

    id_imagen = models.AutoField(primary_key=True)

    variante = models.ForeignKey(

        Variante,

        on_delete=models.CASCADE,

        db_column="id_variante"

    )

    imagen = models.URLField(

        max_length=500

    )

    orden = models.PositiveIntegerField(default=1)

    principal = models.BooleanField(default=False)

    TIPOS = [
        ("imagen", "Imagen"),
        ("video", "Video"),
    ]

    tipo = models.CharField(
        max_length=10,
        choices=TIPOS,
        default="imagen",
        db_index=True,
    )

    class Meta:

        db_table="producto_imagenes"

    def __str__(self):

        return f"{self.tipo.capitalize()} {self.id_imagen}"