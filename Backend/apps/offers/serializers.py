from rest_framework import serializers

from .models import Oferta

from apps.products.models import Producto, Variante
from apps.products.serializers import ProductoSerializer
from apps.categories.models import Categoria


class VarianteMiniSerializer(serializers.ModelSerializer):
    """Mini serializer para mostrar la variante dentro del detalle de la oferta."""

    color = serializers.SerializerMethodField()
    talla = serializers.SerializerMethodField()

    class Meta:
        model = Variante
        fields = ["id_variante", "sku", "color", "talla"]

    def get_color(self, obj):
        return obj.color.nombre if obj.color else None

    def get_talla(self, obj):
        return obj.talla.nombre if obj.talla else None


class OfertaSerializer(serializers.ModelSerializer):

    producto = serializers.StringRelatedField(read_only=True)

    producto_id = serializers.PrimaryKeyRelatedField(
        queryset=Producto.objects.all(),
        source="producto",
        write_only=True,
    )

    producto_detalle = ProductoSerializer(source="producto", read_only=True)

    # Variante opcional: si viaja, se asigna al FK; si no, queda NULL
    # (la oferta aplica a todas las variantes del producto).
    variante_id = serializers.PrimaryKeyRelatedField(
        queryset=Variante.objects.all(),
        source="variante",
        write_only=True,
        required=False,
        allow_null=True,
    )

    variante_detalle = VarianteMiniSerializer(source="variante", read_only=True)

    # Categorías: lista de PKs para escribir; lista de objetos
    # completos para leer. Permite que la oferta aplique a varias
    # categorías / subcategorías.
    categorias_ids = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all(),
        source="categorias",
        many=True,
        required=False,
        write_only=True,
    )

    categorias_detalle = serializers.SerializerMethodField()

    class Meta:
        model = Oferta
        fields = [
            "id_oferta",
            "nombre",
            "descripcion",
            "producto",
            "producto_id",
            "producto_detalle",
            "variante_id",
            "variante_detalle",
            "categorias_ids",
            "categorias_detalle",
            "tipo_descuento",
            "valor",
            "fecha_inicio",
            "fecha_fin",
            "activa",
        ]

    def get_categorias_detalle(self, obj):
        return [
            {
                "id_categoria": c.id_categoria,
                "nombre": c.nombre,
                "id_categoria_padre": (
                    c.id_categoria_padre.id_categoria
                    if c.id_categoria_padre
                    else None
                ),
            }
            for c in obj.categorias.all()
        ]

    def validate(self, attrs):
        """
        Reglas de coherencia:
        - Si se envía variante_id, debe pertenecer al producto_id enviado.
        - fecha_fin debe ser >= fecha_inicio (cuando ambas vienen en el payload).
        """
        variante = attrs.get("variante")
        producto = attrs.get("producto")

        # En PUT parcial, si no viene ninguno de los dos, no podemos
        # validar la relación contra la instancia: dejamos pasar.
        if variante and producto and variante.producto_id != producto.id_producto:
            raise serializers.ValidationError(
                {"variante_id": "La variante no pertenece al producto seleccionado."}
            )

        fecha_inicio = attrs.get("fecha_inicio")
        fecha_fin = attrs.get("fecha_fin")
        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError(
                {"fecha_fin": "La fecha de fin debe ser posterior a la fecha de inicio."}
            )

        return attrs
