from rest_framework import serializers

from .models import Usuario, Direccion


class UsuarioSerializer(serializers.ModelSerializer):

    tipo_usuario = serializers.SerializerMethodField()

    class Meta:
        model = Usuario

        fields = [
            "id_usuario",
            "nombres",
            "apellidos",
            "email",
            "fecha_nacimiento",
            "telefono",
            "fecha_registro",
            "estado",
            "is_active",
            "is_staff",
            "is_superuser",
            "tipo_usuario",
        ]

        read_only_fields = [
            "id_usuario",
            "fecha_registro",
            "is_superuser",
            "is_staff",
            "tipo_usuario",
        ]

    def get_tipo_usuario(self, obj):
        return "admin" if obj.is_staff or obj.is_superuser else "cliente"


class UsuarioUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Usuario

        fields = [
            "nombres",
            "apellidos",
            "email",
            "fecha_nacimiento",
            "telefono",
            "estado",
        ]


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=6
    )

    class Meta:
        model = Usuario

        fields = [
            "nombres",
            "apellidos",
            "email",
            "fecha_nacimiento",
            "telefono",
            "password",
        ]

    def create(self, validated_data):

        password = validated_data.pop("password")

        # Todo registro público es cliente
        usuario = Usuario.objects.create_user(
            password=password,
            is_staff=False,
            is_superuser=False,
            is_active=True,
            **validated_data
        )

        return usuario


class LoginSerializer(serializers.Serializer):

    email = serializers.EmailField()

    password = serializers.CharField(
        write_only=True
    )


class CambiarPasswordSerializer(serializers.Serializer):

    password_actual = serializers.CharField(
        required=True,
        write_only=True
    )

    password_nuevo = serializers.CharField(
        required=True,
        write_only=True,
        min_length=6
    )


class DireccionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Direccion

        fields = [
            "id_direccion",
            "usuario",
            "direccion",
            "ciudad",
            "departamento",
            "codigo_postal",
            "predeterminada",
        ]

        read_only_fields = [
            "id_direccion",
        ]