from rest_framework import serializers

from .models import Pago


class PagoSerializer(serializers.ModelSerializer):

    class Meta:
        model = Pago
        fields = "__all__"


class MetodoPagoCatalogoSerializer(serializers.Serializer):
    """
    Catálogo simple de métodos de pago para el frontend.
    Reutiliza el modelo MetodoPago de orders.
    """

    id = serializers.IntegerField()
    tipo = serializers.CharField()
    detalle = serializers.CharField(allow_blank=True, allow_null=True)

    @classmethod
    def from_model(cls, metodo):
        return {
            "id": metodo.id_metodo_pago,
            "tipo": metodo.tipo,
            "detalle": metodo.detalle or "",
        }
