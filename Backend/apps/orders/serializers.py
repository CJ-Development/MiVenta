from rest_framework import serializers

from .models import *

from apps.users.serializers import UsuarioSerializer


class MetodoPagoSerializer(serializers.ModelSerializer):

    class Meta:

        model=MetodoPago

        fields="__all__"


class DetalleCompraSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.SerializerMethodField()
    variante_info = serializers.SerializerMethodField()
    imagen = serializers.SerializerMethodField()

    class Meta:
        model=DetalleCompra
        fields="__all__"

    def get_producto_nombre(self, obj):
        try:
            return obj.variante.producto.nombre
        except Exception:
            return None

    def get_variante_info(self, obj):
        try:
            v = obj.variante
            partes = []
            if getattr(v, "color", None) and getattr(v.color, "nombre", None):
                partes.append(v.color.nombre)
            if getattr(v, "talla", None) and getattr(v.talla, "nombre", None):
                partes.append(v.talla.nombre)
            return " / ".join(partes) if partes else None
        except Exception:
            return None

    def get_imagen(self, obj):
        try:
            img = obj.variante.imagenes.first()
            if img and img.imagen:
                return img.imagen.url
            return None
        except Exception:
            return None


class CompraSerializer(serializers.ModelSerializer):

    detalles=DetalleCompraSerializer(
        many=True,
        read_only=True
    )

    usuario_info=UsuarioSerializer(
        source="usuario",
        read_only=True,
        allow_null=True
    )

    metodo_pago_info=MetodoPagoSerializer(
        source="metodo_pago",
        read_only=True,
        allow_null=True
    )

    class Meta:

        model=Compra

        fields="__all__"