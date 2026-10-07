from django.db.models import Avg, Count, Q
from .models import Resena


class ResenaService:

    @staticmethod
    def listar_producto(id_producto):

        return Resena.objects.filter(
            producto_id=id_producto
        ).select_related('usuario', 'compra').order_by('-fecha')

    @staticmethod
    def obtener_rating(id_producto):
        """
        Obtiene el rating promedio, total de reseñas y distribución por estrellas
        de un producto.
        """
        resenas = Resena.objects.filter(producto_id=id_producto)

        if not resenas.exists():
            return {
                "promedio": 0,
                "total": 0,
                "distribucion": {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
            }

        # Calcular promedio
        promedio_result = resenas.aggregate(promedio=Avg('calificacion'))
        promedio = round(promedio_result['promedio'] or 0, 1)

        # Calcular distribución por estrellas
        distribucion_raw = resenas.values('calificacion').annotate(
            cantidad=Count('id_resena')
        ).order_by('calificacion')

        distribucion = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
        for item in distribucion_raw:
            estrellas = item['calificacion']
            if estrellas in distribucion:
                distribucion[estrellas] = item['cantidad']

        return {
            "promedio": promedio,
            "total": resenas.count(),
            "distribucion": distribucion
        }

    @staticmethod
    def verificar_puede_resenar(id_producto, id_usuario=None, id_compra=None):
        """
        Verifica si un usuario puede reseñar un producto.
        
        Reglas:
        - Debe existir una compra real del producto (Compra → DetalleCompra → Variante → Producto)
        - La compra debe estar en estado "entregado"
        - No debe existir una reseña previa para esa compra-producto
        
        Para invitados: se usa id_compra
        Para usuarios autenticados: se usa id_usuario (se busca compra del usuario)
        """
        from apps.orders.models import Compra, DetalleCompra
        
        # Buscar compras que contienen el producto
        compras_con_producto = Compra.objects.filter(
            detalles__variante__producto_id=id_producto,
            estado_compra="entregado"
        ).distinct()
        
        if id_compra:
            # Caso invitado: verificar compra específica
            if not compras_con_producto.filter(id_compra=id_compra).exists():
                return {"puede": False, "motivo": "Compra no encontrada o no entregada"}
            
            # Verificar si ya existe reseña para esta compra-producto
            if Resena.objects.filter(compra_id=id_compra, producto_id=id_producto).exists():
                return {"puede": False, "motivo": "Ya existe una reseña para esta compra"}
            
            return {"puede": True, "compra_id": id_compra}
        
        elif id_usuario:
            # Caso usuario autenticado: buscar compras del usuario
            compras_usuario = compras_con_producto.filter(usuario_id=id_usuario)
            
            if not compras_usuario.exists():
                return {"puede": False, "motivo": "No tienes compras entregadas de este producto"}
            
            # Buscar una compra sin reseña previa
            for compra in compras_usuario:
                if not Resena.objects.filter(compra_id=compra.id_compra, producto_id=id_producto).exists():
                    return {"puede": True, "compra_id": compra.id_compra}
            
            return {"puede": False, "motivo": "Ya has reseñado este producto"}
        
        else:
            return {"puede": False, "motivo": "No se proporcionó identificación"}

    @staticmethod
    def crear(data):
        """
        Crea una reseña con validación de compra real.
        """
        compra_id = data.get('compra')
        producto_id = data.get('producto')
        
        # Validar que la compra existe y contiene el producto
        from apps.orders.models import Compra, DetalleCompra
        
        try:
            compra = Compra.objects.get(id_compra=compra_id)
        except Compra.DoesNotExist:
            raise ValueError("La compra especificada no existe")
        
        # Validar estado de la compra
        if compra.estado_compra != "entregado":
            raise ValueError("Solo se pueden reseñar productos de pedidos entregados")
        
        # Validar que la compra contiene el producto
        if not compra.detalles.filter(variante__producto_id=producto_id).exists():
            raise ValueError("La compra no contiene este producto")
        
        # Validar que no existe reseña previa para esta compra-producto
        if Resena.objects.filter(compra_id=compra_id, producto_id=producto_id).exists():
            raise ValueError("Ya existe una reseña para esta compra y producto")
        
        # Validar calificación
        calificacion = data.get('calificacion')
        if not (1 <= calificacion <= 5):
            raise ValueError("La calificación debe estar entre 1 y 5")
        
        # Para reseñas de invitados, usar nombre_cliente de la compra
        if not data.get('usuario') and not data.get('nombre_cliente'):
            data['nombre_cliente'] = compra.nombre_cliente
        
        return Resena.objects.create(**data)

    @staticmethod
    def eliminar(id_resena):

        Resena.objects.filter(
            id_resena=id_resena
        ).delete()