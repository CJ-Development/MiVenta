from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.authentication import SessionAuthentication
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

from apps.users.models import Usuario

from .models import Oferta
from .serializers import OfertaSerializer
from .services import OfertaService


class IsStaff(BasePermission):
    """
    Solo permite usuarios autenticados con is_staff=True.
    La sesión debe llegar vía cookie sessionid (Django
    SessionAuthentication). NO se acepta ?usuario_id= como
    autenticación: eso sería un hueco de seguridad crítico.
    """

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(
            user
            and getattr(user, "is_authenticated", False)
            and getattr(user, "is_staff", False)
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class OfertaView(APIView):
    """
    Lista y crea ofertas.

    Permisos:
    - GET: público (AllowAny). El home y las páginas de categoría
      necesitan listar ofertas activas sin requerir login.
    - POST: solo administradores autenticados por sesión Django.
    """

    authentication_classes = [SessionAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsStaff()]

    def get(self, request):

        ofertas = OfertaService.listar()

        serializer = OfertaSerializer(ofertas, many=True)

        return Response(serializer.data)

    def post(self, request):

        serializer = OfertaSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        oferta = OfertaService.crear(serializer.validated_data)

        return Response(
            OfertaSerializer(oferta).data,
            status=status.HTTP_201_CREATED,
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class OfertaDetalleView(APIView):
    """
    Detalle, edición y eliminación de una oferta.

    Mismo criterio de permisos que OfertaView: GET público,
    mutaciones restringidas a staff autenticado.
    """

    authentication_classes = [SessionAuthentication]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsStaff()]

    def get(self, request, id):

        oferta = get_object_or_404(Oferta, id_oferta=id)

        return Response(OfertaSerializer(oferta).data)

    def put(self, request, id):

        oferta = get_object_or_404(Oferta, id_oferta=id)

        serializer = OfertaSerializer(oferta, data=request.data)

        serializer.is_valid(raise_exception=True)

        serializer.save()

        oferta.refresh_from_db()

        return Response(OfertaSerializer(oferta).data)

    def delete(self, request, id):

        OfertaService.eliminar(id)

        return Response(status=status.HTTP_204_NO_CONTENT)


class DebugAuthView(APIView):
    """
    Endpoint TEMPORAL de diagnóstico: muestra qué cookies y headers
    llegan al backend y el estado de request.user. Útil para saber
    si la cookie sessionid viaja o si el problema es CORS/SameSite.

    Devuelve siempre 200 (no requiere auth) para que pueda inspeccionarse
    incluso cuando la sesión está rota.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        from django.conf import settings as django_settings
        cookies = {k: request.COOKIES.get(k) for k in ("sessionid", "csrftoken")}
        user = request.user
        return Response({
            "cookies_recibidas": cookies,
            "origin_header": request.META.get("HTTP_ORIGIN"),
            "referer_header": request.META.get("HTTP_REFERER"),
            "host_header": request.META.get("HTTP_HOST"),
            "user_autenticado": bool(getattr(user, "is_authenticated", False)),
            "user_is_staff": bool(getattr(user, "is_staff", False)),
            "user_email": getattr(user, "email", None),
            "settings_SAMESITE": django_settings.SESSION_COOKIE_SAMESITE,
            "settings_SECURE": django_settings.SESSION_COOKIE_SECURE,
            "settings_CSRF_TRUSTED": list(django_settings.CSRF_TRUSTED_ORIGINS),
            "all_cookies": list(request.COOKIES.keys()),
            "session_id_in_db": request.session.session_key,
        })

    def post(self, request):
        """Fuerza la creación de una sesión de prueba en el navegador."""
        from django.contrib.auth import login as django_login
        usuario = Usuario.objects.filter(is_staff=True).first()
        if not usuario:
            return Response({"error": "no hay usuario staff"}, status=400)
        django_login(request, usuario)
        return Response({
            "login_forzado": True,
            "usuario": usuario.email,
            "session_key": request.session.session_key,
        })
