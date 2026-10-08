import os
import uuid
import mimetypes
import urllib.request
import urllib.error
import json
import random
import string
import re

from django.conf import settings
from django.db import transaction
from django.db.models import Prefetch
from django.db import IntegrityError
from django.utils.text import slugify

from .models import Producto, Variante, ImagenProducto
from .serializers import VarianteSerializer


def generar_slug_unico(nombre, producto_id=None):
    """
    Genera un slug único a partir del nombre con sufijo aleatorio.
    SIEMPRE agrega un sufijo aleatorio para evitar duplicados.
    """
    base_slug = slugify(nombre, allow_unicode=False)
    if not base_slug:
        base_slug = "producto"

    # Si se está editando, mantener el slug existente si el nombre no cambió
    if producto_id:
        try:
            producto = Producto.objects.get(id_producto=producto_id)
            if slugify(producto.nombre, allow_unicode=False) == base_slug:
                return producto.slug
        except Producto.DoesNotExist:
            pass

    # SIEMPRE generar sufijo aleatorio para evitar duplicados
    sufijo = ''.join(random.choices(string.hexdigits.lower(), k=4))
    nuevo_slug = f"{base_slug}-{sufijo}"

    # Intentar hasta encontrar uno único (máximo 10 intentos)
    intentos = 0
    while Producto.objects.filter(slug=nuevo_slug).exists() and intentos < 10:
        sufijo = ''.join(random.choices(string.hexdigits.lower(), k=4))
        nuevo_slug = f"{base_slug}-{sufijo}"
        intentos += 1

    return nuevo_slug


def generar_sku_unico(nombre_producto):
    """
    Genera un SKU único a partir del nombre del producto.
    Si ya existe, agrega un sufijo aleatorio corto.
    """
    base_sku = re.sub(r'[^A-Z0-9]', '', slugify(nombre_producto, allow_unicode=False).upper())[:20]
    if not base_sku:
        base_sku = "PROD"

    # Verificar si el SKU base ya existe
    if not Variante.objects.filter(sku=base_sku).exists():
        return base_sku

    # Generar sufijo único corto (4 caracteres hexadecimales)
    sufijo = ''.join(random.choices(string.hexdigits.upper(), k=4))
    nuevo_sku = f"{base_sku}-{sufijo}"

    # Intentar hasta encontrar uno único (máximo 10 intentos)
    intentos = 0
    while Variante.objects.filter(sku=nuevo_sku).exists() and intentos < 10:
        sufijo = ''.join(random.choices(string.hexdigits.upper(), k=4))
        nuevo_sku = f"{base_sku}-{sufijo}"
        intentos += 1

    return nuevo_sku


class ProductoService:
    @staticmethod
    def listar(*, solo_nuevos=False, categoria_id=None, estado=None, ordering=None, tendencia=False, es_admin=False):
        from django.db.models import Sum, F, Q
        from apps.orders.models import DetalleCompra

        qs = ProductoService._base_queryset()

        # Si no es admin, filtrar productos activos que tengan al menos una variante con stock > 0
        if not es_admin:
            qs = qs.filter(estado="activo").filter(variante__stock__gt=0).distinct()

        if tendencia:
            # Calcular cantidad vendida por producto SOLO de pedidos en proceso ("pagado", "enviado") o "entregado"
            ventas_por_producto = (
                DetalleCompra.objects
                .filter(compra__estado_compra__in=["pagado", "enviado", "entregado"])
                .values('variante__producto_id')
                .annotate(total_vendido=Sum('cantidad'))
                .order_by('-total_vendido')
            )

            # Obtener IDs de productos ordenados por ventas
            producto_ids_ordenados = [v['variante__producto_id'] for v in ventas_por_producto]

            # Ordenar queryset por cantidad vendida (usando Case/When)
            from django.db.models import Case, When
            when_clauses = [When(pk=pid, then=pos) for pos, pid in enumerate(producto_ids_ordenados)]
            qs = qs.annotate(
                ventas_orden=Case(*when_clauses, default=len(producto_ids_ordenados))
            ).order_by('ventas_orden', 'id_producto')

        if solo_nuevos:
            qs = qs.filter(created_at__isnull=False).order_by("-created_at", "id_producto")
        elif ordering:
            qs = qs.order_by(ordering, "id_producto")
        if categoria_id is not None:
            # Implementar herencia: incluir productos de la categoría y sus descendientes
            from apps.categories.models import Categoria
            try:
                categoria = Categoria.objects.get(id_categoria=categoria_id)
                descendientes_ids = categoria.obtener_descendientes_ids()
                # Incluir la categoría actual y todas sus descendientes
                categoria_ids = [categoria_id] + descendientes_ids
                # NUEVO: Usar ManyToMany categorias en lugar de ForeignKey categoria
                qs = qs.filter(categorias__id_categoria__in=categoria_ids).distinct()
            except Categoria.DoesNotExist:
                # Si la categoría no existe, no devolver productos
                qs = qs.none()
        if estado is not None:
            qs = qs.filter(estado=estado)
        return qs

    @staticmethod
    def obtener_recomendaciones(id_producto, limite=4, es_admin=False):
        """
        Obtiene productos recomendados basados en:
        1. Mismas categorías (prioridad)
        2. Productos con stock (público) o todos (admin)
        3. Estado activo (público) o todos (admin)
        4. Excluye el producto actual
        """
        try:
            producto_actual = Producto.objects.get(id_producto=id_producto)
        except Producto.DoesNotExist:
            return []

        # NUEVO: Obtener todas las categorías del producto actual
        categorias_ids = list(producto_actual.categorias.values_list('id_categoria', flat=True))

        # Filtros según si es admin o público
        if es_admin:
            filtros_categoria = {}
            filtros_fallback = {}
        else:
            filtros_categoria = {"estado": "activo", "variante__stock__gt": 0}
            filtros_fallback = {"estado": "activo", "variante__stock__gt": 0}

        # Productos de las mismas categorías
        if categorias_ids:
            recomendaciones = (
                Producto.objects
                .filter(
                    categorias__id__in=categorias_ids,
                    **filtros_categoria
                )
                .exclude(id_producto=id_producto)
                .distinct()
                .select_related("categoria")  # Mantener temporalmente
                .prefetch_related(
                    Prefetch(
                        "variante_set",
                        queryset=Variante.objects.select_related("color", "talla").prefetch_related(
                            Prefetch("imagenproducto_set", queryset=ImagenProducto.objects.order_by("orden", "id_imagen"))
                        ),
                    )
                )[:limite]
            )
        else:
            recomendaciones = Producto.objects.none()

        # Si no hay suficientes productos de las mismas categorías,
        # completar con productos de otras categorías
        if recomendaciones.count() < limite:
            cantidad_faltante = limite - recomendaciones.count()
            ids_existentes = [p.id_producto for p in recomendaciones] + [id_producto]

            productos_fallback = (
                Producto.objects
                .filter(
                    **filtros_fallback
                )
                .exclude(id_producto__in=ids_existentes)
                .distinct()
                .select_related("categoria")  # Mantener temporalmente
                .prefetch_related(
                    Prefetch(
                        "variante_set",
                        queryset=Variante.objects.select_related("color", "talla").prefetch_related(
                            Prefetch("imagenproducto_set", queryset=ImagenProducto.objects.order_by("orden", "id_imagen"))
                        ),
                    )
                )[:cantidad_faltante]
            )

            recomendaciones = list(recomendaciones) + list(productos_fallback)

        return recomendaciones[:limite]

    @staticmethod
    def _base_queryset():
        from apps.categories.models import Categoria
        return (
            Producto.objects.select_related(
                "categoria",
                "categoria__id_categoria_padre",
                "categoria__id_categoria_padre__id_categoria_padre"
            ).prefetch_related(
                # prefetch del campo 'categoria' singular (por compatibilidad)
                Prefetch(
                    "categoria__subcategorias",
                    queryset=Categoria.objects.select_related("id_categoria_padre").prefetch_related("subcategorias")
                ),
                # prefetch jerárquico de categorías con 3 niveles completos
                Prefetch(
                    "categorias",
                    queryset=Categoria.objects.select_related("id_categoria_padre", "id_categoria_padre__id_categoria_padre").prefetch_related(
                        Prefetch(
                            "subcategorias",
                            queryset=Categoria.objects.select_related("id_categoria_padre").prefetch_related("subcategorias")
                        )
                    )
                ),
                Prefetch(
                    "variante_set",
                    queryset=Variante.objects.select_related("color", "diseño", "talla").prefetch_related(
                        Prefetch("imagenproducto_set", queryset=ImagenProducto.objects.order_by("orden", "id_imagen"))
                    ),
                )
            )
        )

    @staticmethod
    def obtener(id_producto):
        return ProductoService._base_queryset().get(id_producto=id_producto)

    @staticmethod
    def crear(data):
        return Producto.objects.create(**data)

    @staticmethod
    def actualizar(id_producto, data):
        producto = ProductoService.obtener(id_producto)
        for campo, valor in data.items():
            setattr(producto, campo, valor)
        producto.save()
        return producto

    @staticmethod
    def archivar(id_producto):
        return ProductoService.actualizar(id_producto, {"estado": "archivado"})

    @staticmethod
    def eliminar_fisico(id_producto):
        producto = ProductoService.obtener(id_producto)
        for variante in producto.variante_set.all():
            if hasattr(variante, 'detallecompra_set') and variante.detallecompra_set.exists():
                raise ValueError(
                    "El producto no puede eliminarse físicamente porque tiene información histórica asociada a pedidos. Puede archivarse."
                )
        for variante in producto.variante_set.all():
            for image in variante.imagenproducto_set.all():
                ProductoService._delete_file_if_local(image)
        producto.delete()
        return True

    @staticmethod
    def reactivar(id_producto):
        return ProductoService.actualizar(id_producto, {"estado": "activo"})

    @staticmethod
    def _save_uploaded_file(uploaded_file):
        # Token de Vercel Blob: soporta tanto el prefijo específico del store
        # (BLOB_MIVENTA_READ_WRITE_TOKEN) como el genérico (BLOB_READ_WRITE_TOKEN)
        token = (
            os.environ.get("BLOB_MIVENTA_READ_WRITE_TOKEN")
            or os.environ.get("BLOB_READ_WRITE_TOKEN")
            or getattr(settings, "BLOB_READ_WRITE_TOKEN", None)
        )

        is_production = not settings.DEBUG or bool(os.environ.get("VERCEL"))

        if not token:
            if is_production:
                raise RuntimeError(
                    "Error de configuración: no se encontró BLOB_MIVENTA_READ_WRITE_TOKEN "
                    "ni BLOB_READ_WRITE_TOKEN en el entorno de producción. "
                    "El almacenamiento local en disco está deshabilitado en producción (Vercel serverless)."
                )

            # Fallback a disco local ÚNICAMENTE en desarrollo local (DEBUG=True)
            folder = os.path.join(settings.MEDIA_ROOT, "productos")
            os.makedirs(folder, exist_ok=True)
            ext = os.path.splitext(uploaded_file.name)[1].lower() or ".jpg"
            filename = f"{uuid.uuid4().hex}{ext}"
            ruta = os.path.join(folder, filename)
            with open(ruta, "wb") as destino:
                for chunk in uploaded_file.chunks():
                    destino.write(chunk)
            return f"{settings.MEDIA_URL}productos/{filename}"

        try:
            ext = os.path.splitext(uploaded_file.name)[1].lower() or ".jpg"
            filename = f"productos/{uuid.uuid4().hex}{ext}"

            content_type = getattr(uploaded_file, "content_type", None)
            if not content_type or content_type == "application/octet-stream":
                if ext in [".mp4", ".m4v"]:
                    content_type = "video/mp4"
                elif ext in [".webm"]:
                    content_type = "video/webm"
                else:
                    content_type = mimetypes.guess_type(uploaded_file.name)[0] or "application/octet-stream"

            url = f"https://blob.vercel-storage.com/{filename}"

            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": content_type,
                "x-api-version": "7",
                "x-content-type": content_type,
                "x-cache-control-max-age": "31536000",
                "x-add-random-suffix": "0",
                "access": "public",
            }

            # Asegurar puntero del archivo al inicio
            if hasattr(uploaded_file, "seek"):
                uploaded_file.seek(0)

            # Leer el contenido del archivo
            file_content = uploaded_file.read()

            # Crear solicitud PUT a la API oficial de Vercel Blob
            req = urllib.request.Request(
                url,
                data=file_content,
                headers=headers,
                method='PUT'
            )

            with urllib.request.urlopen(req, timeout=120) as response:
                response_data = response.read()
                data = json.loads(response_data.decode('utf-8'))
                
                blob_url = data.get("url")

                if not blob_url:
                    raise RuntimeError(
                        f"Vercel Blob no devolvió una URL válida: {data}"
                    )

                return blob_url
        except urllib.error.HTTPError as e:
            error_body = ""
            try:
                error_body = e.read().decode("utf-8")
            except Exception:
                pass
            raise RuntimeError(
                f"Error HTTP {e.code} subiendo archivo a Vercel Blob: {e.reason}. {error_body}"
            )
        except Exception as e:
            raise RuntimeError(
                f"Error subiendo archivo a Vercel Blob Storage: {str(e)}. "
                "Verifica que BLOB_MIVENTA_READ_WRITE_TOKEN sea válido."
            )

    @staticmethod
    def _resolve_local_path_from_url(value):
        if not value:
            return None
        prefix = settings.MEDIA_URL.rstrip("/") + "/"
        if not value.startswith(prefix):
            return None
        relative = value[len(prefix):]
        return os.path.join(settings.MEDIA_ROOT, relative)

    @staticmethod
    def _delete_file_if_local(imagen):
        path = ProductoService._resolve_local_path_from_url(imagen.imagen)
        if not path:
            return
        if os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass

    @staticmethod
    def _delete_file_by_url(value):
        path = ProductoService._resolve_local_path_from_url(value)
        if not path:
            return
        if os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass

    @staticmethod
    @transaction.atomic
    def guardar_completo(*, producto_data, variantes_data, archivos, producto_simple=False):
        # Lista de URLs de archivos nuevos escritos al disco.
        # Si la transacción falla (rollback), se borran para evitar huérfanos.
        uploaded_file_urls = []

        # on_commit: borra los archivos nuevos que sí se persistieron
        # cuando ya se confirmó la transacción (solo en éxito).
        try:
            categorias_ids = producto_data.pop("categorias_ids", None)
            producto_id = producto_data.pop("id_producto", None)

            # Generar slug automáticamente desde el nombre
            nombre = producto_data.get("nombre", "")
            if nombre and not producto_data.get("slug"):
                producto_data["slug"] = generar_slug_unico(nombre, producto_id)
            elif not producto_data.get("slug"):
                producto_data["slug"] = generar_slug_unico(nombre or "producto", producto_id)

            # Persistir el tipo de producto (simple vs con variantes)
            producto_data["producto_simple"] = producto_simple

            if producto_id:
                producto = Producto.objects.select_for_update().get(id_producto=producto_id)
                for field, value in producto_data.items():
                    setattr(producto, field, value)
                producto.save()
            else:
                producto = Producto.objects.create(**producto_data)

            if categorias_ids is not None:
                producto.categorias.set(categorias_ids)
                if categorias_ids and not producto.categoria_id:
                    primera_cat = categorias_ids[0]
                    cat_id = primera_cat.id_categoria if hasattr(primera_cat, 'id_categoria') else primera_cat
                    Producto.objects.filter(id_producto=producto.id_producto).update(categoria_id=cat_id)

            existing_variants = {v.id_variante: v for v in Variante.objects.filter(producto=producto)}
            received_variant_ids = set()

            if producto_simple and len(variantes_data) != 1:
                raise ValueError("Un producto simple debe guardar una única variante interna.")

            for variant_data in variantes_data:

                variant_id = variant_data.pop("id_variante", None)

                image_data = variant_data.pop("imagenes", []) or []

                # Validar que al menos un atributo esté presente
                # EXCEPTO para productos simples (variantes sin atributos)
                color_id = variant_data.get("color_id")
                diseño_id = variant_data.get("diseño_id")
                talla_id = variant_data.get("talla_id")

                # Un producto simple no expone atributos. La variante interna
                # solo conserva el stock y las imágenes generales.
                if not producto_simple and color_id is None and diseño_id is None and talla_id is None:
                    raise ValueError(
                        "Cada variante debe tener al menos un atributo: color, diseño o talla."
                    )

                # Generar SKU automático solo para variantes NUEVAS (sin id_variante)
                # Para variantes existentes, conservar el SKU actual
                sku = variant_data.get("sku")
                if not sku or sku == "":
                    if variant_id is None:  # Solo generar SKU para variantes nuevas
                        variant_data["sku"] = generar_sku_unico(nombre)

                existing_variant = (
                    existing_variants.get(int(variant_id))
                    if variant_id is not None
                    else None
                )

                # Si se proporcionó id_variante, esa es la identidad principal
                # NO usar fallback por SKU cuando ya tenemos id_variante
                if variant_id is not None:
                    if existing_variant is None:
                        raise ValueError(
                            f"La variante con id {variant_id} no existe o no pertenece al producto."
                        )
                    if existing_variant.producto_id != producto.id_producto:
                        raise ValueError(
                            "Una de las variantes no pertenece al producto."
                        )
                else:
                    # Fallbacks solo cuando NO hay id_variante (compatibilidad con payloads antiguos)
                    if existing_variant is None and producto_simple:
                        existing_variant = next(iter(existing_variants.values()), None)
                    if existing_variant is None and variant_data.get("sku"):
                        existing_variant = Variante.objects.filter(
                            producto=producto,
                            sku=variant_data["sku"],
                        ).first()

                variant_serializer = VarianteSerializer(
                    existing_variant,
                    data={
                        **variant_data,
                        "producto_id": producto.id_producto,
                    },
                    partial=existing_variant is not None,
                    context={"allow_attribute_less": producto_simple},
                )

                variant_serializer.is_valid(raise_exception=True)

                clean_variant = variant_serializer.validated_data

                clean_variant.pop("producto", None)

                if existing_variant:
                    # Actualización segura usando .get() para partial updates
                    existing_variant.color = clean_variant.get("color", existing_variant.color)
                    existing_variant.diseño = clean_variant.get("diseño", existing_variant.diseño)
                    existing_variant.talla = clean_variant.get("talla", existing_variant.talla)
                    existing_variant.stock = clean_variant.get("stock", existing_variant.stock)
                    # Solo actualizar SKU si cambió para evitar IntegrityError falso
                    if "sku" in clean_variant and existing_variant.sku != clean_variant["sku"]:
                        existing_variant.sku = clean_variant["sku"]
                    try:
                        existing_variant.save()
                    except IntegrityError as e:
                        if "sku" in str(e).lower():
                            raise ValueError(f"Ya existe una variante con el SKU '{clean_variant.get('sku', existing_variant.sku)}'.")
                        raise
                    variant = existing_variant
                else:
                    try:
                        variant = Variante.objects.create(producto=producto, **clean_variant)
                    except IntegrityError as e:
                        if "sku" in str(e).lower():
                            raise ValueError(f"Ya existe una variante con el SKU '{clean_variant['sku']}'.")
                        raise

                received_variant_ids.add(variant.id_variante)
                existing_images = {i.id_imagen: i for i in ImagenProducto.objects.filter(variante=variant)}
                received_image_ids = set()

                # Validar cantidad de videos y límite total
                videos_count = 0
                for item in image_data:
                    file_k = item.get("file_key")
                    up_f = archivos.get(file_k) if file_k else None
                    val_url = (item.get("imagen") or "").strip().lower().split("?")[0]
                    item_tipo = (item.get("tipo") or "").lower()
                    is_video = (
                        item_tipo == "video"
                        or (up_f and os.path.splitext(up_f.name)[1].lower() in [".mp4", ".webm"])
                        or val_url.endswith(".mp4")
                        or val_url.endswith(".webm")
                    )
                    if is_video:
                        videos_count += 1

                if videos_count > 1:
                    raise ValueError("Cada variante o producto puede tener como máximo 1 video.")

                if len(image_data) > 9:
                    raise ValueError("Cada variante puede tener como máximo 8 imágenes y 1 video.")

                for image_index, image_item in enumerate(image_data, start=1):
                    image_id = image_item.get("id_imagen")
                    principal = bool(image_item.get("principal", image_index == 1))
                    order = int(image_item.get("orden") or image_index)
                    file_key = image_item.get("file_key")

                    uploaded = archivos.get(file_key) if file_key else None
                    tipo = (image_item.get("tipo") or "").lower()

                    if uploaded:
                        ext = os.path.splitext(uploaded.name)[1].lower()
                        if ext in [".mp4", ".webm"]:
                            tipo = "video"
                            if uploaded.size > 15 * 1024 * 1024:
                                raise ValueError(f"El video '{uploaded.name}' supera el tamaño máximo permitido de 15 MB.")
                        elif not tipo:
                            tipo = "imagen"
                    else:
                        clean_url = (image_item.get("imagen") or "").strip().lower().split("?")[0]
                        if clean_url.endswith(".mp4") or clean_url.endswith(".webm"):
                            tipo = "video"
                        elif not tipo:
                            tipo = "imagen"

                    if tipo not in ["imagen", "video"]:
                        tipo = "imagen"

                    if image_id:
                        image = existing_images.get(int(image_id))
                        if not image or image.variante_id != variant.id_variante:
                            raise ValueError("Una de las imágenes no pertenece a la variante.")
                        image.principal = principal
                        image.orden = order
                        image.tipo = tipo
                        image.save(update_fields=["principal", "orden", "tipo"])
                        received_image_ids.add(image.id_imagen)
                        continue

                    if uploaded:
                        image_url = ProductoService._save_uploaded_file(uploaded)
                        uploaded_file_urls.append(image_url)
                    else:
                        image_url = image_item.get("imagen", "")

                    if not image_url:
                        raise ValueError("Cada imagen o video nuevo debe incluir un archivo o una URL.")

                    image = ImagenProducto.objects.create(
                        variante=variant,
                        imagen=image_url,
                        principal=principal,
                        orden=order,
                        tipo=tipo,
                    )
                    received_image_ids.add(image.id_imagen)

                for old_image in existing_images.values():
                    if old_image.id_imagen not in received_image_ids:
                        ProductoService._delete_file_if_local(old_image)
                        old_image.delete()

                principal_images = ImagenProducto.objects.filter(variante=variant, principal=True).order_by("orden", "id_imagen")
                first = principal_images.first()
                if first:
                    principal_images.exclude(id_imagen=first.id_imagen).update(principal=False)

            for old_variant in existing_variants.values():
                if old_variant.id_variante not in received_variant_ids:
                    if hasattr(old_variant, 'detallecompra_set') and old_variant.detallecompra_set.exists():
                        raise ValueError(
                            f"No se puede eliminar la variante '{old_variant.sku}' porque tiene un historial de pedidos asociados. Por favor, mantén la variante en el producto."
                        )
                    for old_image in ImagenProducto.objects.filter(variante=old_variant):
                        ProductoService._delete_file_if_local(old_image)
                    old_variant.delete()

            return ProductoService.obtener(producto.id_producto)
        except Exception:
            # Rollback de archivos: borra cualquier archivo que ya se haya
            # escrito al disco durante esta transacción antes del fallo.
            for url in uploaded_file_urls:
                ProductoService._delete_file_by_url(url)
            raise
