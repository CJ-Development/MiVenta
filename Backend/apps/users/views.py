from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import SessionAuthentication

from django.contrib.auth import login as django_login, logout as django_logout
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.middleware.csrf import get_token

from .serializers import (
    UsuarioSerializer,
    UsuarioUpdateSerializer,
    RegisterSerializer,
    LoginSerializer,
    CambiarPasswordSerializer,
    DireccionSerializer,
)

from .models import Usuario, Direccion

from .services import UserService


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Igual que SessionAuthentication pero no exige CSRF en el método.
    SOLO debe usarse en endpoints que crean o destruyen la sesión
    (login, register, logout) porque en esos casos todavía no hay
    token CSRF disponible.

    ⚠️  NO usar esta clase en endpoints sensibles (cambiar
    contraseña, editar perfil, checkout, admin…). Un uso
    accidental abriría un hueco CSRF grave.
    """

    def enforce_csrf(self, request):
        return  # no-op


@method_decorator(csrf_exempt, name="dispatch")
@method_decorator(ensure_csrf_cookie, name="dispatch")
class RegisterView(APIView):
    """Crea cuenta y abre sesión. CSRF exento (no hay sesión todavía).

    Se fuerza ``ensure_csrf_cookie`` para que el backend emita la cookie
    ``csrftoken`` justo después del registro. Sin esa cookie, los
    POST/PUT/DELETE posteriores del frontend (carrito, perfil,
    checkout…) fallan con 403 "CSRF Failed" porque DRF exige el
    token en cualquier método no-GET.
    """

    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):

        serializer = RegisterSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        usuario = UserService.crear_usuario(
            serializer.validated_data
        )

        # Iniciamos sesión automáticamente al registrarse para que
        # la cookie de sesión y el token CSRF queden disponibles.
        django_login(request, usuario)

        # Forzamos la emisión del token CSRF ligado a la sesión
        # recién creada. Sin esto, ensure_csrf_cookie puede emitir
        # un token ligado a la sesión anterior (csrf_exempt evita
        # la rotación normal) y el primer POST post-registro falla
        # con 403.
        get_token(request)

        return Response(
            UsuarioSerializer(usuario).data,
            status=status.HTTP_201_CREATED
        )


@method_decorator(csrf_exempt, name="dispatch")
@method_decorator(ensure_csrf_cookie, name="dispatch")
class LoginView(APIView):
    """
    Autentica credenciales y abre sesión Django.

    - csrf_exempt: sin sesión previa no se puede pedir CSRF.
    - ensure_csrf_cookie: fuerza al navegador a guardar la cookie
      `csrftoken` para que el frontend pueda usarla en los
      siguientes POST/PUT/DELETE.
    """

    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):

        serializer = LoginSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        usuario = UserService.login(
            serializer.validated_data["email"],
            serializer.validated_data["password"]
        )

        if not usuario:

            return Response(
                {
                    "error": "Credenciales inválidas"
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Creamos la sesión Django (cookie sessionid) para que las
        # siguientes llamadas con withCredentials viajen autenticadas
        # y el CSRF funcione en POST/PUT/DELETE.
        django_login(request, usuario)

        # Forzamos la emisión del token CSRF ligado a la sesión
        # recién creada. Igual que en RegisterView: csrf_exempt +
        # ensure_csrf_cookie pueden dejar la cookie csrftoken con
        # un token de la sesión anterior y el primer POST post-login
        # falla con 403.
        get_token(request)

        return Response(
            UsuarioSerializer(usuario).data,
            status=status.HTTP_200_OK
        )


@method_decorator(csrf_exempt, name="dispatch")
class LogoutView(APIView):
    """Cierra la sesión Django (borra sessionid)."""

    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        django_logout(request)
        return Response(
            {"ok": True},
            status=status.HTTP_200_OK
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class UserListView(APIView):

    def get(self, request):

        usuarios = UserService.obtener_usuarios()

        serializer = UsuarioSerializer(
            usuarios,
            many=True
        )

        return Response(
            serializer.data
        )

    def post(self, request):
        data = request.data.copy()
        if not data.get("fecha_nacimiento"):
            data["fecha_nacimiento"] = "2000-01-01"
        serializer = RegisterSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        usuario = UserService.crear_usuario(serializer.validated_data)
        if "rol" in request.data:
            rol = int(request.data["rol"])
            usuario.is_staff = (rol == 2)
            usuario.is_superuser = (rol == 2)
        if "estado" in request.data:
            usuario.estado = request.data["estado"]
        if "telefono" in request.data and request.data["telefono"]:
            usuario.telefono = request.data["telefono"]
        usuario.save()
        return Response(
            UsuarioSerializer(usuario).data,
            status=status.HTTP_201_CREATED
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MeView(APIView):
    """
    Devuelve el usuario asociado a la sesión actual.
    Sirve para diagnosticar si el cliente está enviando la cookie
    de sesión y qué flags (is_staff / is_superuser / is_active) ve
    el backend. No requiere autenticación: si no hay sesión,
    responde 200 con `autenticado: False`.

    Aunque es GET, lleva `ensure_csrf_cookie` porque el frontend
    lo usa como ping de "¿estoy logueado?" justo tras un reload.
    En ese momento la cookie `csrftoken` puede no existir todavía;
    emitirla aquí garantiza que el primer POST protegido después
    del reload tenga un token válido que enviar.
    """

    def get(self, request):

        user = request.user

        if not user or not user.is_authenticated:
            return Response(
                {
                    "autenticado": False,
                    "is_staff": False,
                    "is_superuser": False,
                    "is_active": False,
                    "email": None,
                }
            )

        return Response(
            {
                "autenticado": True,
                "is_staff": bool(user.is_staff),
                "is_superuser": bool(user.is_superuser),
                "is_active": bool(user.is_active),
                "email": user.email,
                "id_usuario": user.id_usuario,
            }
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class UsuarioDetalleView(APIView):

    def get(self, request, id):

        usuario = get_object_or_404(
            Usuario,
            id_usuario=id
        )

        return Response(
            UsuarioSerializer(usuario).data
        )

    def put(self, request, id):

        usuario = get_object_or_404(
            Usuario,
            id_usuario=id
        )

        serializer = UsuarioUpdateSerializer(
            usuario,
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        if "rol" in request.data:
            rol = int(request.data["rol"])
            usuario.is_staff = (rol == 2)
            usuario.is_superuser = (rol == 2)
            usuario.save()

        usuario.refresh_from_db()

        return Response(
            UsuarioSerializer(usuario).data
        )

    def delete(self, request, id):

        Usuario.objects.filter(
            id_usuario=id
        ).delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CambiarPasswordView(APIView):

    def post(self, request, id):

        usuario = get_object_or_404(
            Usuario,
            id_usuario=id
        )

        serializer = CambiarPasswordSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        password_actual = serializer.validated_data[
            "password_actual"
        ]

        password_nuevo = serializer.validated_data[
            "password_nuevo"
        ]

        if not usuario.check_password(
            password_actual
        ):

            return Response(
                {
                    "error": "La contraseña actual es incorrecta."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario.set_password(
            password_nuevo
        )

        usuario.save(
            update_fields=["password"]
        )

        return Response(
            {
                "ok": True
            },
            status=status.HTTP_200_OK
        )


class DireccionView(APIView):

    def get(self, request):

        usuario_id = (
            request.query_params.get("usuario_id")
            or request.query_params.get("usuario")
        )

        if not usuario_id:

            return Response(
                {
                    "detail": (
                        "Se requiere el parámetro "
                        "'usuario_id'."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        get_object_or_404(
            Usuario,
            id_usuario=usuario_id
        )

        direcciones = (
            Direccion.objects
            .filter(usuario_id=usuario_id)
            .order_by(
                "-predeterminada",
                "id_direccion"
            )
        )

        serializer = DireccionSerializer(
            direcciones,
            many=True
        )

        return Response(
            serializer.data
        )

    def post(self, request):

        serializer = DireccionSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        usuario = serializer.validated_data[
            "usuario"
        ]

        if serializer.validated_data.get(
            "predeterminada"
        ):

            Direccion.objects.filter(
                usuario=usuario,
                predeterminada=True
            ).update(
                predeterminada=False
            )

        direccion = serializer.save()

        return Response(
            DireccionSerializer(direccion).data,
            status=status.HTTP_201_CREATED
        )


class DireccionDetalleView(APIView):

    def put(self, request, id):

        direccion = get_object_or_404(
            Direccion,
            id_direccion=id
        )

        serializer = DireccionSerializer(
            direccion,
            data=request.data,
            partial=True
        )

        serializer.is_valid(
            raise_exception=True
        )

        if serializer.validated_data.get(
            "predeterminada"
        ):

            Direccion.objects.filter(
                usuario=direccion.usuario,
                predeterminada=True
            ).exclude(
                id_direccion=direccion.id_direccion
            ).update(
                predeterminada=False
            )

        serializer.save()

        direccion.refresh_from_db()

        return Response(
            DireccionSerializer(direccion).data
        )

    def delete(self, request, id):

        Direccion.objects.filter(
            id_direccion=id
        ).delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfTokenView(APIView):

    def get(self, request):
        from django.middleware.csrf import get_token

        token = get_token(request)

        return Response({
            "csrfToken": token
        })