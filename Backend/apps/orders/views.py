from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction, OperationalError, IntegrityError, ProgrammingError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils import timezone

import logging

from .models import Compra, DetalleCompra, MetodoPago
from .serializers import CompraSerializer
from .services import CompraService

from apps.cart.models import Carrito
from apps.products.models import Variante
from apps.users.models import Direccion, Usuario
from apps.payments.models import Pago


logger = logging.getLogger(__name__)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CompraView(APIView):

    def get(self, request):
        compras = CompraService.listar()
        serializer = CompraSerializer(compras, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CompraSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        compra = CompraService.crear(serializer.validated_data)

        try:
            from apps.users.activity import registrar_actividad
            registrar_actividad(
                accion="Nuevo pedido recibido",
                elemento=f"Pedido #{compra.id_compra}",
                usuario=request.user if request.user.is_authenticated else None,
                tipo_accion="pedido",
                detalles=f"Cliente: {compra.nombre_cliente or 'Cliente'} · Total: ${int(compra.total or 0):,}",
            )
        except Exception:
            pass

        return Response(
            CompraSerializer(compra).data,
            status=status.HTTP_201_CREATED,
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CompraDetalleView(APIView):

    ESTADOS_VALIDOS = ["pendiente", "pagado", "enviado", "entregado", "cancelado"]
    CAMPOS_PERMITIDOS = {"estado_compra", "telefono_contacto", "metodo_pago"}

    def get(self, request, id):
        compra = get_object_or_404(Compra, id_compra=id)
        return Response(CompraSerializer(compra).data)

    def put(self, request, id):
        compra = get_object_or_404(Compra, id_compra=id)
        nuevo_estado = request.data.get("estado_compra")
        if nuevo_estado and nuevo_estado not in self.ESTADOS_VALIDOS:
            return Response(
                {"estado_compra": f"Estado inválido. Use uno de: {self.ESTADOS_VALIDOS}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data_filtrada = {
            k: v for k, v in request.data.items() if k in self.CAMPOS_PERMITIDOS
        }
        compra_actualizada = CompraService.actualizar(id, data_filtrada)

        try:
            from apps.users.activity import registrar_actividad
            accion_txt = f"Pedido marcado como {nuevo_estado.replace('_', ' ').title()}" if nuevo_estado else "Actualización de pedido"
            registrar_actividad(
                accion=accion_txt,
                elemento=f"Pedido #{id}",
                usuario=request.user if request.user.is_authenticated else None,
                tipo_accion="pedido",
                detalles=f"Cliente: {compra.nombre_cliente or 'Cliente'} · Total: ${int(compra.total or 0):,}",
            )
        except Exception:
            pass

        return Response(CompraSerializer(compra_actualizada).data)

    def delete(self, request, id):
        CompraService.eliminar(id)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MisPedidosView(APIView):

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
        pedidos = (
            Compra.objects
            .filter(usuario_id=usuario_id)
            .select_related("metodo_pago")
            .prefetch_related("detalles")
            .order_by("-fecha_compra")
        )
        return Response(CompraSerializer(pedidos, many=True).data)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CheckoutView(APIView):
    """
    POST /api/orders/checkout/

    Crea la Compra + DetalleCompra + Pago(pendiente).
    Descuenta stock definitivamente y vacía el carrito.

    Responde con los datos completos del pedido para que el frontend
    pueda generar el mensaje de WhatsApp.
    """

    def post(self, request):
        usuario_id = request.data.get("usuario_id")
        nombre_cliente = request.data.get("nombre_cliente")
        telefono_contacto = request.data.get("telefono_contacto")
        direccion_id = request.data.get("direccion_id")
        terminos_aceptados = request.data.get("terminos_aceptados", False)
        datos_aceptados = request.data.get("datos_aceptados", False)
        items_data = request.data.get("items", [])

        # Validaciones
        if not nombre_cliente:
            return Response(
                {"detail": "nombre_cliente es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not telefono_contacto:
            return Response(
                {"detail": "telefono_contacto es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not terminos_aceptados:
            return Response(
                {"detail": "Debes aceptar los términos y condiciones."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not datos_aceptados:
            return Response(
                {"detail": "Debes aceptar la política de privacidad."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not items_data:
            return Response(
                {"detail": "El carrito está vacío."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            usuario = None
            direccion = None

            # Si hay usuario_id, obtener usuario y dirección
            if usuario_id:
                usuario = get_object_or_404(Usuario, id_usuario=usuario_id)
                if direccion_id:
                    direccion = get_object_or_404(
                        Direccion, id_direccion=direccion_id, usuario=usuario
                    )

            # Obtener o crear el método de pago WhatsApp internamente
            metodo_pago, _ = MetodoPago.objects.get_or_create(
                tipo="WhatsApp",
                defaults={"detalle": "Envía tu pedido directamente por WhatsApp"}
            )

            with transaction.atomic():
                # Validar items y calcular total
                items_validados = []
                total = 0

                for item in items_data:
                    variante_id = item.get("variante_id")
                    cantidad = item.get("cantidad", 1)

                    if not variante_id:
                        return Response(
                            {"detail": "Cada item debe tener variante_id."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    variante = (
                        Variante.objects
                        .select_for_update()
                        .get(id_variante=variante_id)
                    )

                    if not variante.stock_infinito and cantidad > variante.stock:
                        return Response(
                            {
                                "detail": (
                                    f"Stock insuficiente para "
                                    f"{variante.producto.nombre}. "
                                    f"Disponible: {variante.stock}, "
                                    f"solicitado: {cantidad}."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    precio_usar = variante.precio if variante.precio is not None else variante.producto.precio
                    subtotal = precio_usar * cantidad
                    total += subtotal

                    items_validados.append({
                        "variante": variante,
                        "cantidad": cantidad,
                        "precio_unitario": precio_usar,
                        "subtotal": subtotal,
                    })

                # 1) Crear Compra.
                compra = Compra.objects.create(
                    usuario=usuario,
                    nombre_cliente=nombre_cliente,
                    direccion=direccion,
                    metodo_pago=metodo_pago,
                    total=total,
                    estado_compra="pendiente",
                    telefono_contacto=telefono_contacto,
                )

                # 2) Crear DetalleCompra.
                for item in items_validados:
                    DetalleCompra.objects.create(
                        compra=compra,
                        variante=item["variante"],
                        cantidad=item["cantidad"],
                        precio_unitario=item["precio_unitario"],
                        subtotal=item["subtotal"],
                    )

                # 3) Crear Pago pendiente.
                fecha_aceptacion = (
                    timezone.now()
                    if (terminos_aceptados and datos_aceptados)
                    else None
                )
                pago = Pago.objects.create(
                    compra=compra,
                    metodo_pago=metodo_pago,
                    monto=total,
                    estado="pendiente",
                    terminos_aceptados=terminos_aceptados,
                    datos_aceptados=datos_aceptados,
                    fecha_aceptacion=fecha_aceptacion,
                )

                # 4) Descontar stock definitivamente y archivar si stock llega a 0.
                for item in items_validados:
                    variante = item["variante"]
                    if not variante.stock_infinito:
                        variante.stock -= item["cantidad"]
                        variante.save(update_fields=["stock"])

                        # Si el stock llega a 0, archivar el producto si todas sus variantes estn agotadas
                        if variante.stock == 0:
                            producto = variante.producto
                            variantes_con_stock = producto.variante_set.filter(stock__gt=0).count()
                            if variantes_con_stock == 0:
                                producto.estado = "archivado"
                                producto.save(update_fields=["estado"])

                # 5) Vaciar carrito si hay usuario autenticado.
                if usuario:
                    try:
                        carrito = Carrito.objects.get(usuario=usuario)
                        carrito.items.all().delete()
                    except Carrito.DoesNotExist:
                        pass

                # 6) Construir datos detallados para WhatsApp DENTRO de la transacción.
                productos_whatsapp = []
                for item in items_validados:
                    v = item["variante"]
                    p = v.producto
                    
                    if p.producto_simple:
                        # Producto simple: no mostrar color/diseño/talla
                        productos_whatsapp.append({
                            "nombre": p.nombre,
                            "cantidad": item["cantidad"],
                            "precio_unitario": float(item["precio_unitario"]),
                            "subtotal": float(item["subtotal"]),
                        })
                    else:
                        # Producto con variantes: mostrar atributos existentes
                        productos_whatsapp.append({
                            "nombre": p.nombre,
                            "sku": v.sku or "",
                            "color": v.color.nombre if v.color else "",
                            "talla": v.talla.nombre if v.talla else "",
                            "cantidad": item["cantidad"],
                            "precio_unitario": float(item["precio_unitario"]),
                            "subtotal": float(item["subtotal"]),
                        })

                whatsapp_number = getattr(settings, "WHATSAPP_NUMBER", None)
                if not whatsapp_number:
                    return Response(
                        {
                            "detail": (
                                "El número de WhatsApp no está configurado. "
                                "Por favor contacta al administrador."
                            )
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

                # 7) Construir y devolver la respuesta DENTRO de la transacción.
                response_data = {
                    "ok": True,
                    "compra_id": compra.id_compra,
                    "referencia": f"#{compra.id_compra}",
                    "pago_id": pago.id_pago,
                    "estado": "pendiente",
                    "total": float(total),
                    "whatsapp_number": whatsapp_number,
                    "metodo_pago": {
                        "id": metodo_pago.id_metodo_pago,
                        "tipo": metodo_pago.tipo,
                        "detalle": metodo_pago.detalle or "",
                    },
                    "aceptaciones_legales": {
                        "terminos_aceptados": pago.terminos_aceptados,
                        "datos_aceptados": pago.datos_aceptados,
                        "fecha_aceptacion": (
                            pago.fecha_aceptacion.isoformat()
                            if pago.fecha_aceptacion else None
                        ),
                    },
                    "cliente": {
                        "nombre": nombre_cliente,
                        "telefono": telefono_contacto,
                    },
                    "productos": productos_whatsapp,
                    "compra": CompraSerializer(compra).data,
                }

                # Agregar dirección si existe
                if direccion:
                    response_data["direccion_envio"] = {
                        "direccion": direccion.direccion,
                        "ciudad": direccion.ciudad,
                        "departamento": direccion.departamento,
                        "codigo_postal": direccion.codigo_postal or "",
                    }

                # Registrar actividad del pedido
                try:
                    from apps.users.activity import registrar_actividad
                    registrar_actividad(
                        accion="Nuevo pedido recibido (Checkout)",
                        elemento=f"Pedido #{compra.id_compra}",
                        usuario=usuario,
                        tipo_accion="pedido",
                        detalles=f"Cliente: {nombre_cliente or 'Cliente'} · Total: ${int(total):,}",
                    )
                except Exception:
                    pass

                return Response(
                    response_data,
                    status=status.HTTP_201_CREATED,
                )

        except Exception as e:
            logger.exception(
                "Checkout falló | usuario_id=%s direccion_id=%s "
                "metodo_pago=%s items=%s",
                usuario_id, direccion_id, metodo_pago.tipo if metodo_pago else None,
                len(items) if 'items' in locals() else 0,
            )

            if isinstance(e, OperationalError):
                return Response(
                    {
                        "detail": (
                            "No se pudo conectar con la base de datos. "
                            "Intenta de nuevo en unos segundos."
                        ),
                        "error_type": "db_unavailable",
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            if isinstance(e, ProgrammingError):
                msg = str(e).lower()
                if (
                    "does not exist" in msg
                    and (
                        "column" in msg
                        or "relation" in msg
                        or "table" in msg
                    )
                ):
                    return Response(
                        {
                            "detail": (
                                "La base de datos no está sincronizada "
                                "con la última versión del backend. "
                                "Por favor contacta al administrador."
                            ),
                            "error_type": "migrations_pending",
                        },
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )

            if isinstance(e, IntegrityError):
                return Response(
                    {
                        "detail": (
                            "Datos inconsistentes al crear la compra. "
                            "Verifica dirección y método de pago."
                        ),
                        "error_type": "data_integrity",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            return Response(
                {
                    "detail": f"Error en checkout: {type(e).__name__}: {e}",
                    "error_type": "internal_error",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
