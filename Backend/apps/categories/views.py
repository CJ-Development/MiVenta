from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Categoria
from .serializers import CategoriaSerializer
from .services import CategoriaService


class IsAdminUserCustom(BasePermission):
    """
    Permiso personalizado que verifica explícitamente is_staff.
    Funciona mejor con sesiones basadas en cookies en Vercel.
    """

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_staff
        )


def permisos_admin_en_mutacion(self):
    """
    GET:
        Público.

    POST / PUT / DELETE:
        Requiere sesión Django con is_staff=True.
    """

    if self.request.method == "GET":
        return [AllowAny()]

    return [IsAdminUserCustom()]


@method_decorator(
    ensure_csrf_cookie,
    name="dispatch"
)
class CategoriaView(APIView):

    authentication_classes = [
        SessionAuthentication
    ]

    get_permissions = permisos_admin_en_mutacion

    def get(self, request):

        solo_padres = self._parse_bool(
            request.query_params.get(
                "solo_padres"
            )
        )

        incluir_inactivos = self._parse_bool(
            request.query_params.get(
                "incluir_inactivos",
                "true"
            )
        )

        categorias = CategoriaService.listar(
            solo_padres=solo_padres,
            incluir_inactivos=incluir_inactivos,
        )

        serializer = CategoriaSerializer(
            categorias,
            many=True
        )

        return Response(
            serializer.data
        )

    def post(self, request):

        serializer = CategoriaSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        validated = serializer.validated_data

        validated.pop(
            "categoria_padre",
            None
        )

        categoria = CategoriaService.crear(
            validated
        )

        return Response(
            CategoriaSerializer(
                categoria
            ).data,
            status=status.HTTP_201_CREATED
        )

    @staticmethod
    def _parse_bool(value):

        if value is None:
            return False

        return str(value).lower() in (
            "true",
            "1",
            "yes"
        )


@method_decorator(
    ensure_csrf_cookie,
    name="dispatch"
)
class CategoriaDetalleView(APIView):

    authentication_classes = [
        SessionAuthentication
    ]

    get_permissions = permisos_admin_en_mutacion

    def get(self, request, id):

        categoria = CategoriaService.obtener(
            id
        )

        return Response(
            CategoriaSerializer(
                categoria
            ).data
        )

    def put(self, request, id):

        instancia = get_object_or_404(
            Categoria,
            id_categoria=id
        )

        serializer = CategoriaSerializer(
            instancia,
            data=request.data,
            partial=True
        )

        serializer.is_valid(
            raise_exception=True
        )

        validated = serializer.validated_data

        validated.pop(
            "categoria_padre",
            None
        )

        categoria = CategoriaService.actualizar(
            id,
            validated
        )

        return Response(
            CategoriaSerializer(
                categoria
            ).data
        )

    def delete(self, request, id):
        categoria = get_object_or_404(Categoria, id_categoria=id)

        confirmacion = request.data.get("confirmacion_nombre")
        if confirmacion != categoria.nombre:
            return Response(
                {"detail": f"El nombre '{confirmacion}' no coincide exactamente con '{categoria.nombre}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            CategoriaService.eliminar_fisico(id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_409_CONFLICT)
        except Exception as e:
            return Response({"detail": f"No se pudo eliminar: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CategoriaArchivarView(APIView):
    """
    POST /api/categories/<id>/archivar/
    Archiva la categoría y, opcionalmente, sus descendientes y productos.
    """
    authentication_classes = [SessionAuthentication]
    get_permissions = permisos_admin_en_mutacion

    def post(self, request, id):
        cascade = str(request.query_params.get("cascade", "")).lower() in ("true", "1", "yes")
        categoria = CategoriaService.archivar(id)

        if not cascade:
            return Response(
                {
                    "estado": "archivado",
                    "id_categoria": categoria.id_categoria,
                    "cascade": False,
                },
                status=status.HTTP_200_OK
            )

        from apps.products.models import Producto

        with transaction.atomic():
            ids = [categoria.id_categoria]
            visitados = set(ids)
            pendientes = list(categoria.subcategorias.all())
            while pendientes:
                hijo = pendientes.pop()
                if hijo.id_categoria in visitados:
                    continue
                visitados.add(hijo.id_categoria)
                ids.append(hijo.id_categoria)
                pendientes.extend(hijo.subcategorias.all())

            actualizados = Producto.objects.filter(
                categorias__id_categoria__in=ids,
                estado="activo"
            ).distinct().update(estado="archivado")

        return Response(
            {
                "estado": "archivado",
                "id_categoria": categoria.id_categoria,
                "cascade": True,
                "productos_archivados": actualizados,
            },
            status=status.HTTP_200_OK
        )


@method_decorator(
    ensure_csrf_cookie,
    name="dispatch"
)
class CategoriaReactivarView(APIView):
    """
    POST /api/categories/<id>/reactivar/
    Reactiva la categoría y todas sus subcategorías en cascada.
    """

    authentication_classes = [SessionAuthentication]
    get_permissions = permisos_admin_en_mutacion

    def post(self, request, id):
        categoria = get_object_or_404(Categoria, id_categoria=id)

        with transaction.atomic():
            # Recopilar todos los IDs de la categoría y sus descendientes
            ids = [categoria.id_categoria]
            visitados = set(ids)
            pendientes = list(categoria.subcategorias.all())

            while pendientes:
                hijo = pendientes.pop()
                if hijo.id_categoria in visitados:
                    continue
                visitados.add(hijo.id_categoria)
                ids.append(hijo.id_categoria)
                pendientes.extend(hijo.subcategorias.all())

            # Reactivar todas
            reactivadas = Categoria.objects.filter(
                id_categoria__in=ids
            ).update(estado="activo")

        return Response(
            {
                "estado": "activo",
                "id_categoria": categoria.id_categoria,
                "categorias_reactivadas": reactivadas,
            },
            status=status.HTTP_200_OK
        )