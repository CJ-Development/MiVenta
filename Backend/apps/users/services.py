from .models import Usuario


class UserService:

    @staticmethod
    def crear_usuario(data):

        usuario = Usuario.objects.create_user(
            email=data["email"],
            password=data["password"],
            nombres=data["nombres"],
            apellidos=data["apellidos"],
            fecha_nacimiento=data["fecha_nacimiento"],
            telefono=data.get("telefono"),
            is_staff=False,
            is_superuser=False,
            is_active=True,
        )

        return usuario

    @staticmethod
    def login(email, password):

        try:
            usuario = Usuario.objects.get(
                email=email
            )
        except Usuario.DoesNotExist:
            return None

        if not usuario.is_active:
            return None

        if not usuario.check_password(password):
            return None

        return usuario

    @staticmethod
    def obtener_usuarios():

        return Usuario.objects.all()

    @staticmethod
    def obtener(id_usuario):

        return Usuario.objects.get(
            id_usuario=id_usuario
        )

    @staticmethod
    def actualizar(id_usuario, data):

        usuario = Usuario.objects.get(
            id_usuario=id_usuario
        )

        campos_permitidos = [
            "nombres",
            "apellidos",
            "email",
            "fecha_nacimiento",
            "telefono",
            "estado",
        ]

        for campo, valor in data.items():

            if campo in campos_permitidos:
                setattr(
                    usuario,
                    campo,
                    valor
                )

        usuario.save()

        return usuario