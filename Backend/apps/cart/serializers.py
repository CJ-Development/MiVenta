from rest_framework import serializers

from .models import Carrito, ItemCarrito


class ItemCarritoSerializer(serializers.ModelSerializer):

    variante_id = serializers.IntegerField(source="variante.id_variante", read_only=True)

    sku = serializers.CharField(source="variante.sku", read_only=True)

    stock = serializers.IntegerField(source="variante.stock", read_only=True)

    stock_infinito = serializers.BooleanField(source="variante.stock_infinito", read_only=True)

    producto_id = serializers.IntegerField(source="variante.producto.id_producto", read_only=True)

    producto_nombre = serializers.CharField(source="variante.producto.nombre", read_only=True)

    producto_slug = serializers.CharField(source="variante.producto.slug", read_only=True)

    producto_precio = serializers.SerializerMethodField()

    color = serializers.SerializerMethodField()

    talla = serializers.SerializerMethodField()

    imagen = serializers.SerializerMethodField()

    def get_producto_precio(self, obj):
        if obj.variante.precio is not None:
            return obj.variante.precio
        return obj.variante.producto.precio

    def get_color(self, obj):
        """
        Para productos simples, no mostrar color.
        Para productos con variantes, mostrar color si existe.
        """
        if obj.variante.producto.producto_simple:
            return ""
        return obj.variante.color.nombre if obj.variante.color else ""

    def get_talla(self, obj):
        """
        Para productos simples, no mostrar talla.
        Para productos con variantes, mostrar talla si existe.
        """
        if obj.variante.producto.producto_simple:
            return ""
        return obj.variante.talla.nombre if obj.variante.talla else ""

    class Meta:

        model = ItemCarrito

        fields = [
            "id_item",
            "variante_id",
            "sku",
            "stock",
            "stock_infinito",
            "producto_id",
            "producto_nombre",
            "producto_slug",
            "producto_precio",
            "color",
            "talla",
            "cantidad",
            "imagen",
        ]

    def get_imagen(self, obj):

        principal = obj.variante.imagenproducto_set.filter(principal=True).first()

        if principal:
            return principal.imagen

        primera = obj.variante.imagenproducto_set.order_by("orden", "id_imagen").first()

        return primera.imagen if primera else None


class CarritoSerializer(serializers.ModelSerializer):

    items = ItemCarritoSerializer(
        many=True,
        read_only=True
    )

    class Meta:

        model = Carrito

        fields = "__all__"