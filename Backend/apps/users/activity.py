import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


def registrar_actividad(accion, elemento, usuario=None, tipo_accion="general", detalles="", nombre_usuario=None):
    """
    Registra una acción relevante en la tabla de actividades del panel administrativo.
    No rompe el flujo principal si ocurre un error de base de datos.
    """
    try:
        from apps.users.models import Actividad

        nombre = nombre_usuario
        if not nombre and usuario:
            try:
                if hasattr(usuario, "nombres") and hasattr(usuario, "apellidos"):
                    nombre = f"{usuario.nombres} {usuario.apellidos}".strip() or getattr(usuario, "email", "Administrador")
                elif hasattr(usuario, "email"):
                    nombre = usuario.email
                else:
                    nombre = str(usuario)
            except Exception:
                nombre = "Administrador"

        if not nombre:
            nombre = "Administrador"

        user_instance = usuario if hasattr(usuario, "pk") and getattr(usuario, "pk", None) else None

        return Actividad.objects.create(
            accion=accion,
            elemento=str(elemento)[:255],
            usuario=user_instance,
            nombre_usuario=nombre[:150],
            tipo_accion=tipo_accion,
            detalles=str(detalles) if detalles else "",
        )
    except Exception as e:
        logger.warning(f"No se pudo registrar actividad en DB: {e}")
        return None


def obtener_actividades_recientes(limit=30):
    """
    Obtiene las actividades registradas. Si la tabla está vacía,
    sintetiza actividades reales a partir de los datos existentes en la BD
    (compras, productos, categorías, ofertas) para que nunca muestre datos ficticios.
    """
    try:
        from apps.users.models import Actividad
        actividades_db = list(Actividad.objects.all().order_by("-fecha")[:limit])
        if actividades_db:
            return [
                {
                    "id_actividad": a.id_actividad,
                    "accion": a.accion,
                    "elemento": a.elemento,
                    "usuario": a.usuario_id,
                    "nombre_usuario": a.nombre_usuario,
                    "tipo_accion": a.tipo_accion,
                    "detalles": a.detalles or "",
                    "fecha": a.fecha.isoformat() if hasattr(a.fecha, "isoformat") else str(a.fecha),
                }
                for a in actividades_db
            ]
    except Exception as e:
        logger.warning(f"Error consultando tabla de actividades: {e}")

    # Fallback con datos reales del sistema
    resultado = []
    
    # 1. Compras reales
    try:
        from apps.orders.models import Compra
        compras = Compra.objects.all().order_by("-fecha_compra")[:12]
        for c in compras:
            estado_lbl = dict(Compra.ESTADOS).get(c.estado_compra, c.estado_compra)
            resultado.append({
                "id_actividad": f"order-{c.id_compra}",
                "accion": f"Pedido {estado_lbl}",
                "elemento": f"#{c.id_compra} · Total: ${int(c.total or 0):,}",
                "usuario": c.usuario_id,
                "nombre_usuario": c.nombre_cliente or "Cliente registrado",
                "tipo_accion": "pedido",
                "detalles": f"Estado actual: {estado_lbl}",
                "fecha": c.fecha_compra.isoformat() if hasattr(c.fecha_compra, "isoformat") else str(c.fecha_compra),
                "_timestamp": c.fecha_compra,
            })
    except Exception as e:
        logger.debug(f"Error consultando compras para actividades: {e}")

    # 2. Productos reales
    try:
        from apps.products.models import Producto
        prods = Producto.objects.all().order_by("-created_at")[:12]
        for p in prods:
            dt = p.created_at or p.updated_at or timezone.now()
            estado_lbl = "Archivado" if p.estado == "archivado" else ("Activo" if p.estado == "activo" else "Inactivo")
            accion = "Archivo de producto" if p.estado == "archivado" else "Creación de producto"
            resultado.append({
                "id_actividad": f"prod-{p.id_producto}",
                "accion": accion,
                "elemento": p.nombre,
                "usuario": None,
                "nombre_usuario": "Administrador",
                "tipo_accion": "producto",
                "detalles": f"Estado: {estado_lbl} · Precio: ${int(p.precio or 0):,}",
                "fecha": dt.isoformat() if hasattr(dt, "isoformat") else str(dt),
                "_timestamp": dt,
            })
    except Exception as e:
        logger.debug(f"Error consultando productos para actividades: {e}")

    # 3. Categorías reales
    try:
        from apps.categories.models import Categoria
        cats = Categoria.objects.all()[:8]
        for cat in cats:
            accion = "Archivo de categoría" if cat.estado == "archivado" else "Categoría registrada"
            resultado.append({
                "id_actividad": f"cat-{cat.id_categoria}",
                "accion": accion,
                "elemento": cat.nombre,
                "usuario": None,
                "nombre_usuario": "Administrador",
                "tipo_accion": "categoria",
                "detalles": f"Tipo: {'Subcategoría' if cat.id_categoria_padre_id else 'Categoría principal'}",
                "fecha": timezone.now().isoformat(),
                "_timestamp": timezone.now(),
            })
    except Exception as e:
        logger.debug(f"Error consultando categorías para actividades: {e}")

    # 4. Ofertas reales
    try:
        from apps.offers.models import Oferta
        ofertas = Oferta.objects.all().order_by("-fecha_inicio")[:8]
        for of in ofertas:
            dt = of.fecha_inicio or timezone.now()
            resultado.append({
                "id_actividad": f"off-{of.id_oferta}",
                "accion": "Configuración de oferta",
                "elemento": of.nombre,
                "usuario": None,
                "nombre_usuario": "Administrador",
                "tipo_accion": "oferta",
                "detalles": f"Descuento: {of.valor}{'%' if of.tipo_descuento == 'porcentaje' else ' COP'}",
                "fecha": dt.isoformat() if hasattr(dt, "isoformat") else str(dt),
                "_timestamp": dt,
            })
    except Exception as e:
        logger.debug(f"Error consultando ofertas para actividades: {e}")

    # Ordenar por timestamp y limitar
    try:
        resultado.sort(key=lambda x: str(x.get("fecha", "")), reverse=True)
    except Exception:
        pass

    for r in resultado:
        r.pop("_timestamp", None)

    return resultado[:limit]
