from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

from .serializers import ResenaSerializer, ResenaCrearSerializer
from .services import ResenaService


@method_decorator(ensure_csrf_cookie, name="dispatch")
class ResenaView(APIView):

    def get(self, request, id_producto):

        resenas = ResenaService.listar_producto(
            id_producto
        )

        serializer = ResenaSerializer(
            resenas,
            many=True
        )

        return Response(serializer.data)

    def post(self, request):

        serializer = ResenaCrearSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        try:
            resena = ResenaService.crear(
                serializer.validated_data
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            ResenaSerializer(resena).data,
            status=status.HTTP_201_CREATED
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class RatingView(APIView):
    """Endpoint para obtener rating de un producto"""

    def get(self, request, id_producto):
        rating = ResenaService.obtener_rating(id_producto)
        return Response(rating)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class PuedeResenarView(APIView):
    """Endpoint para verificar si un usuario puede reseñar un producto"""

    def get(self, request, id_producto):
        id_usuario = request.query_params.get('id_usuario')
        id_compra = request.query_params.get('id_compra')
        
        resultado = ResenaService.verificar_puede_resenar(
            id_producto,
            id_usuario=id_usuario,
            id_compra=id_compra
        )
        
        return Response(resultado)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class ResenaDetalleView(APIView):

    def delete(self, request, id):

        ResenaService.eliminar(id)

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )