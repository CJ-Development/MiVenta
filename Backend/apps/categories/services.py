from django.db import transaction
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404

from .models import Categoria


class CategoriaService:

    @staticmethod
    def listar(solo_padres=False, incluir_inactivos=True):
        """
        Devuelve la lista de categorías en orden jerárquico:
        primero los padres, luego las subcategorías ordenadas por `orden`.

        Si `solo_padres=True` devuelve únicamente las categorías principales.
        Si `incluir_inactivos=False` filtra por estado='activo'.
        """
        qs = Categoria.objects.select_related('id_categoria_padre', 'id_categoria_padre__id_categoria_padre')

        if solo_padres:
            qs = qs.filter(id_categoria_padre__isnull=True)

        if not incluir_inactivos:
            qs = qs.filter(estado="activo")

        # Precargamos subcategorías (solo las activas por defecto) para
        # que el serializer pueda devolver la jerarquía sin N+1.
        qs = qs.prefetch_related(
            Prefetch(
                "subcategorias",
                queryset=Categoria.objects.select_related("id_categoria_padre", "id_categoria_padre__id_categoria_padre").prefetch_related(Prefetch("subcategorias", queryset=Categoria.objects.select_related("id_categoria_padre", "id_categoria_padre__id_categoria_padre"))).order_by("orden", "nombre"),
            )
        )

        return qs.order_by("orden", "nombre")

    @staticmethod
    def obtener(id_categoria):
        # get_object_or_404 → 404 limpio en vez de DoesNotExist → 500.
        # Es importante para el admin: si el usuario borra una categoría
        # y refresca, la vista de detalle no debe explotar el servidor.
        return get_object_or_404(
            Categoria.objects.prefetch_related("subcategorias"),
            id_categoria=id_categoria,
        )

    @staticmethod
    def crear(data):
        return Categoria.objects.create(**data)

    @staticmethod
    def actualizar(id_categoria, data):
        categoria = Categoria.objects.get(id_categoria=id_categoria)

        campos_permitidos = {
            "nombre",
            "descripcion",
            "estado",
            "orden",
            "id_categoria_padre",
        }

        for campo, valor in data.items():
            if campo in campos_permitidos:
                setattr(categoria, campo, valor)

        categoria.save()
        return categoria

    @staticmethod
    def archivar(id_categoria):
        """
        Soft delete: marca la categoría y todas sus descendientes como
        'archivado' en una sola transacción. No elimina filas.
        """
        with transaction.atomic():
            categoria = Categoria.objects.get(id_categoria=id_categoria)

            ids = [categoria.id_categoria]
            visitados = set(ids)

            # Recorremos el árbol en anchura para recolectar todos los IDs.
            pendientes = list(categoria.subcategorias.all())
            while pendientes:
                hijo = pendientes.pop()
                if hijo.id_categoria in visitados:
                    continue
                visitados.add(hijo.id_categoria)
                ids.append(hijo.id_categoria)
                pendientes.extend(hijo.subcategorias.all())

            Categoria.objects.filter(id_categoria__in=ids).update(estado="archivado")

        return categoria

    @staticmethod
    def eliminar_fisico(id_categoria):
        with transaction.atomic():
            categoria = Categoria.objects.get(id_categoria=id_categoria)
            if categoria.subcategorias.exists():
                raise ValueError("No se puede eliminar la categoría porque tiene subcategorías. Elimine o mueva las subcategorías primero.")
            if categoria.producto_set.exists():
                raise ValueError("No se puede eliminar la categoría porque tiene productos asignados. Mueva los productos primero o archívela.")
            if categoria.productos.exists():
                raise ValueError("No se puede eliminar la categoría porque está etiquetada en productos. Mueva los productos primero o archívela.")
            
            categoria.delete()
            return True

    @staticmethod
    def reactivar(id_categoria):
        with transaction.atomic():
            categoria = Categoria.objects.get(id_categoria=id_categoria)
            if categoria.id_categoria_padre and categoria.id_categoria_padre.estado == "archivado":
                raise ValueError("Esta categoría no puede reactivarse porque su categoría padre está archivada. Reactiva primero la categoría padre.")
            categoria.estado = "activo"
            categoria.save(update_fields=["estado"])
        return categoria
