from rest_framework import serializers

from .models import Favorito

from apps.products.serializers import ProductoSerializer


class FavoritoSerializer(serializers.ModelSerializer):

    producto_detalle = ProductoSerializer(source="producto", read_only=True)

    class Meta:

        model = Favorito

        fields = [
            "id_favorito",
            "usuario",
            "producto",
            "producto_detalle",
            "fecha_agregado",
        ]
