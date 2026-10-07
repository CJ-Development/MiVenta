from rest_framework import serializers

from .models import Resena


class ResenaSerializer(serializers.ModelSerializer):

    nombre_cliente_display = serializers.SerializerMethodField()
    compra_verificada = serializers.SerializerMethodField()
    fecha_formateada = serializers.SerializerMethodField()

    class Meta:
        model = Resena
        fields = [
            "id_resena",
            "compra",
            "usuario",
            "nombre_cliente",
            "nombre_cliente_display",
            "producto",
            "calificacion",
            "comentario",
            "fecha",
            "fecha_formateada",
            "compra_verificada"
        ]

    def get_nombre_cliente_display(self, obj):
        """Retorna el nombre a mostrar (nombre_cliente o usuario.nombres)"""
        return obj.nombre_cliente or (obj.usuario.nombres if obj.usuario else "Anónimo")

    def get_compra_verificada(self, obj):
        """Indica si la reseña está verificada por una compra real"""
        return obj.compra is not None

    def get_fecha_formateada(self, obj):
        """Fecha formateada para mostrar"""
        if obj.fecha:
            return obj.fecha.strftime("%d/%m/%Y")
        return ""


class ResenaCrearSerializer(serializers.ModelSerializer):
    """Serializer para crear reseñas con validaciones"""

    class Meta:
        model = Resena
        fields = [
            "compra",
            "usuario",
            "producto",
            "nombre_cliente",
            "calificacion",
            "comentario"
        ]

    def validate_calificacion(self, value):
        """Valida que la calificación esté entre 1 y 5"""
        if not (1 <= value <= 5):
            raise serializers.ValidationError("La calificación debe estar entre 1 y 5")
        return value

    def validate_comentario(self, value):
        """Valida que el comentario no esté vacío"""
        if not value or not value.strip():
            raise serializers.ValidationError("El comentario no puede estar vacío")
        return value.strip()