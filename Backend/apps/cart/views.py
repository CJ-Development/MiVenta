from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

from .models import Carrito, ItemCarrito
from .serializers import CarritoSerializer, ItemCarritoSerializer
from .services import CarritoService

from apps.products.models import Variante


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CarritoView(APIView):

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

        from apps.users.models import Usuario

        usuario = get_object_or_404(Usuario, id_usuario=usuario_id)

        carrito = CarritoService.obtener(usuario)

        return Response(CarritoSerializer(carrito).data)

    def post(self, request):

        usuario_id = request.data.get("usuario_id")

        if not usuario_id:

            return Response(
                {"detail": "Se requiere 'usuario_id' en el cuerpo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.users.models import Usuario

        usuario = get_object_or_404(Usuario, id_usuario=usuario_id)

        variante_id = request.data.get("variante_id")

        cantidad = int(request.data.get("cantidad", 1))

        if not variante_id:

            return Response(
                {"detail": "Se requiere 'variante_id'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        variante = get_object_or_404(Variante, id_variante=variante_id)

        carrito = CarritoService.obtener(usuario)

        item = CarritoService.agregar(carrito, variante, cantidad)

        return Response(
            ItemCarritoSerializer(item).data,
            status=status.HTTP_201_CREATED,
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class ItemCarritoDetalleView(APIView):

    def put(self, request, id_item):

        item = get_object_or_404(ItemCarrito, id_item=id_item)

        cantidad = request.data.get("cantidad")

        if cantidad is None:

            return Response(
                {"detail": "Se requiere 'cantidad'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            cantidad = int(cantidad)

        except (TypeError, ValueError):

            return Response(
                {"detail": "'cantidad' debe ser un entero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if cantidad < 1:

            return Response(
                {"detail": "'cantidad' debe ser mayor o igual a 1."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.cantidad = cantidad

        item.save()

        return Response(ItemCarritoSerializer(item).data)

    def delete(self, request, id_item):

        CarritoService.eliminar(id_item)

        return Response(status=status.HTTP_204_NO_CONTENT)