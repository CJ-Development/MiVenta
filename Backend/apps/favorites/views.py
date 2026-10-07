from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

from .serializers import FavoritoSerializer
from .services import FavoritoService

from apps.users.models import Usuario
from apps.products.models import Producto


@method_decorator(ensure_csrf_cookie, name="dispatch")
class FavoritoView(APIView):

    def get(self, request):

        usuario_id = (
            request.query_params.get("usuario_id")
            or request.query_params.get("usuario")
        )

        if not usuario_id:

            return Response(
                {"detail": "Se requiere el parámetro 'usuario_id'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario = get_object_or_404(Usuario, id_usuario=usuario_id)

        favoritos = FavoritoService.listar(usuario)

        return Response(FavoritoSerializer(favoritos, many=True).data)

    def post(self, request):

        usuario_id = request.data.get("usuario_id")
        producto_id = request.data.get("producto_id")

        if not usuario_id or not producto_id:

            return Response(
                {"detail": "Se requieren 'usuario_id' y 'producto_id'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario = get_object_or_404(Usuario, id_usuario=usuario_id)
        producto = get_object_or_404(Producto, id_producto=producto_id)

        # Evitar duplicados aprovechando unique_together (usuario, producto)
        favorito_existente = (
            usuario.favoritos
            .filter(producto_id=producto_id)
            .first()
        )

        if favorito_existente:
            return Response(
                FavoritoSerializer(favorito_existente).data,
                status=status.HTTP_200_OK,
            )

        favorito = FavoritoService.agregar({
            "usuario": usuario,
            "producto": producto,
        })

        return Response(
            FavoritoSerializer(favorito).data,
            status=status.HTTP_201_CREATED,
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class FavoritoDetalleView(APIView):

    def delete(self, request, id):

        FavoritoService.eliminar(id)

        return Response(status=status.HTTP_204_NO_CONTENT)
