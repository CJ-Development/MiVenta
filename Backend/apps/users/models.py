from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.base_user import BaseUserManager
from django.db import models


class UsuarioManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):

        if not email:
            raise ValueError("El email es obligatorio")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields
        )

        user.set_password(password)

        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(
                "El superusuario debe tener is_staff=True."
            )

        if extra_fields.get("is_superuser") is not True:
            raise ValueError(
                "El superusuario debe tener is_superuser=True."
            )

        return self.create_user(
            email=email,
            password=password,
            **extra_fields
        )


class Usuario(AbstractBaseUser, PermissionsMixin):

    id_usuario = models.AutoField(
        primary_key=True
    )

    nombres = models.CharField(
        max_length=100
    )

    apellidos = models.CharField(
        max_length=100
    )

    email = models.EmailField(
        max_length=150,
        unique=True
    )

    fecha_nacimiento = models.DateField()

    telefono = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    fecha_registro = models.DateTimeField(
        auto_now_add=True
    )

    estado = models.CharField(
        max_length=20,
        choices=[
            ("activo", "Activo"),
            ("inactivo", "Inactivo"),
        ],
        default="activo"
    )

    is_staff = models.BooleanField(
        default=False
    )

    is_active = models.BooleanField(
        default=True
    )

    objects = UsuarioManager()

    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = [
        "nombres",
        "apellidos",
        "fecha_nacimiento",
    ]

    class Meta:
        db_table = "usuarios"

    def __str__(self):
        return f"{self.nombres} {self.apellidos}"


class Direccion(models.Model):

    id_direccion = models.AutoField(
        primary_key=True
    )

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        db_column="id_usuario",
        related_name="direcciones"
    )

    direccion = models.CharField(
        max_length=255
    )

    ciudad = models.CharField(
        max_length=100
    )

    departamento = models.CharField(
        max_length=100
    )

    codigo_postal = models.CharField(
        max_length=15,
        blank=True,
        null=True
    )

    predeterminada = models.BooleanField(
        default=False
    )

    class Meta:
        db_table = "direcciones"

    def __str__(self):
        return f"{self.usuario.email} - {self.direccion}"