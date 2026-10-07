from django.db import models
from django.core.exceptions import ValidationError
from django.utils.text import slugify


class Categoria(models.Model):

    id_categoria = models.AutoField(primary_key=True)

    tiendanube_category_id = models.PositiveBigIntegerField(
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="ID externo de Tiendanube"
    )

    nombre = models.CharField(
        max_length=100
    )

    slug = models.SlugField(
        max_length=255,
        unique=True,
        blank=True,
        db_index=False,
    )

    descripcion = models.TextField(
        blank=True,
        default=""
    )

    estado = models.CharField(
        max_length=20,
        default="activo"
    )

    # Jerarquía: una subcategoría apunta a su categoría padre.
    # NULL = categoría principal.
    id_categoria_padre = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        related_name="subcategorias",
        on_delete=models.PROTECT,
        db_column="id_categoria_padre",
    )

    orden = models.PositiveIntegerField(
        default=1
    )

    class Meta:
        db_table = "categorias"
        ordering = ["orden", "nombre"]
        constraints = [
            models.UniqueConstraint(
                fields=["id_categoria_padre", "nombre"],
                name="unique_nombre_por_padre",
                violation_error_message="Ya existe una categoría con este nombre bajo el mismo padre."
            )
        ]

    def __str__(self):
        return self.nombre

    def save(self, *args, **kwargs):
        # Generar slug jerárquico antes de guardar
        self.slug = self.generar_slug_jerarquico()
        super().save(*args, **kwargs)

    def generar_slug_jerarquico(self):
        """
        Genera un slug único basado en la jerarquía completa.
        Ejemplo: hombre-ropa-pantalones
        """
        # Slugify del nombre actual
        nombre_slug = slugify(self.nombre)
        
        # Si no tiene padre, el slug es solo el nombre
        if not self.id_categoria_padre:
            return nombre_slug
        
        # Si tiene padre, construir slug jerárquico
        slugs_padres = []
        padre = self.id_categoria_padre
        
        # Recorrer hacia arriba recolectando slugs
        while padre:
            slugs_padres.insert(0, slugify(padre.nombre))
            padre = padre.id_categoria_padre
        
        # Agregar slug actual
        slugs_padres.append(nombre_slug)
        
        # Unir con guiones
        slug_completo = "-".join(slugs_padres)
        
        return slug_completo

    def obtener_profundidad(self):
        """
        Devuelve la profundidad de la categoría en la jerarquía.
        Nivel 1 (raíz) = 1, Nivel 2 = 2, etc.
        """
        profundidad = 1
        padre = self.id_categoria_padre
        
        while padre:
            profundidad += 1
            padre = padre.id_categoria_padre
            if profundidad > 10:  # Límite de seguridad para evitar ciclos infinitos
                break
        
        return profundidad

    def clean(self):
        """
        Validaciones adicionales antes de guardar.
        """
        super().clean()
        
        # Validar que no sea su propio padre
        if self.id_categoria_padre and self.id_categoria_padre.id_categoria == self.id_categoria:
            raise ValidationError(
                "Una categoría no puede ser su propia padre."
            )
        
        # Validar que no cree un ciclo
        # Un ciclo ocurre si la categoría padre propuesta es descendiente de esta misma categoría.
        if self.id_categoria_padre and self.id_categoria_padre.es_descendiente_de(self):
            raise ValidationError(
                "La categoría padre seleccionada crearía un ciclo en la jerarquía."
            )

    def es_descendiente_de(self, otra):
        """
        Devuelve True si esta categoría es descendiente (directa o
        transitivamente) de `otra`. Se usa para evitar ciclos.
        """
        if not otra:
            return False

        actual = self.id_categoria_padre
        visitados = set()

        while actual is not None:
            if actual.id_categoria == otra.id_categoria:
                return True
            if actual.id_categoria in visitados:
                # Defensa ante datos corruptos: cortamos el ciclo.
                break
            visitados.add(actual.id_categoria)
            actual = actual.id_categoria_padre

        return False

    def obtener_descendientes_ids(self):
        """
        Devuelve una lista con los IDs de todas las categorías descendientes
        (directas y transitivas) de esta categoría.
        Útil para filtrar productos que deben aparecer en categorías padre.
        """
        ids = []
        visitados = set()
        pendientes = list(self.subcategorias.all())

        while pendientes:
            hijo = pendientes.pop()
            if hijo.id_categoria in visitados:
                continue
            visitados.add(hijo.id_categoria)
            ids.append(hijo.id_categoria)
            pendientes.extend(hijo.subcategorias.all())

        return ids
