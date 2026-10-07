from rest_framework import serializers

from .models import Producto, Variante, ImagenProducto, Color, Talla, Diseño

from apps.categories.serializers import CategoriaSerializer
from apps.categories.models import Categoria

import os
import uuid

from django.conf import settings


class ColorSerializer(serializers.ModelSerializer):

    class Meta:
        model = Color
        fields = "__all__"


class TallaSerializer(serializers.ModelSerializer):

    class Meta:
        model = Talla
        fields = "__all__"


class DiseñoSerializer(serializers.ModelSerializer):

    class Meta:
        model = Diseño
        fields = "__all__"


class ImagenSerializer(serializers.ModelSerializer):

    # Campo opcional para subir un archivo desde la PC.
    # NO está en el modelo: se usa solo en create/update y luego
    # se guarda en disco y se asigna la URL resultante a `imagen`.
    archivo = serializers.FileField(
        required=False,
        write_only=True,
    )

    class Meta:
        model = ImagenProducto
        fields = "__all__"

    def _guardar_archivo(self, archivo):
        from .services import ProductoService
        return ProductoService._save_uploaded_file(archivo)

    def create(self, validated_data):
        archivo = validated_data.pop("archivo", None)

        if archivo:
            validated_data["imagen"] = self._guardar_archivo(archivo)
            ext = os.path.splitext(archivo.name)[1].lower()
            if ext in [".mp4", ".webm"]:
                validated_data["tipo"] = "video"

        return super().create(validated_data)

    def update(self, instance, validated_data):
        archivo = validated_data.pop("archivo", None)

        if archivo:
            validated_data["imagen"] = self._guardar_archivo(archivo)
            ext = os.path.splitext(archivo.name)[1].lower()
            if ext in [".mp4", ".webm"]:
                validated_data["tipo"] = "video"

        return super().update(instance, validated_data)


class VarianteSerializer(serializers.ModelSerializer):

    imagenes = ImagenSerializer(
        many=True,
        read_only=True,
        source="imagenproducto_set"
    )

    color = ColorSerializer(read_only=True)

    diseño = DiseñoSerializer(read_only=True)

    talla = TallaSerializer(read_only=True)

    color_id = serializers.PrimaryKeyRelatedField(
        queryset=Color.objects.all(),
        source="color",
        write_only=True,
        required=False,
        allow_null=True
    )

    diseño_id = serializers.PrimaryKeyRelatedField(
        queryset=Diseño.objects.all(),
        source="diseño",
        write_only=True,
        required=False,
        allow_null=True
    )

    talla_id = serializers.PrimaryKeyRelatedField(
        queryset=Talla.objects.all(),
        source="talla",
        write_only=True,
        required=False,
        allow_null=True
    )

    sku = serializers.CharField(required=False, allow_blank=True, validators=[])

    class Meta:
        model = Variante
        fields = [
            "id_variante",
            "color",
            "color_id",
            "diseño",
            "diseño_id",
            "talla",
            "talla_id",
            "sku",
            "stock",
            "imagenes",
        ]

    def validate(self, attrs):
        """
        Validar que al menos uno de color, diseño o talla esté presente.
        """
        # Los productos simples se persisten con una única variante interna
        # (para mantener stock e imágenes), pero no tienen por qué exponer
        # color, diseño ni talla al cliente.
        if self.context.get("allow_attribute_less"):
            return attrs

        color = attrs.get('color', getattr(self.instance, 'color', None))
        diseño = attrs.get('diseño', getattr(self.instance, 'diseño', None))
        talla = attrs.get('talla', getattr(self.instance, 'talla', None))

        if color is None and diseño is None and talla is None:
            raise serializers.ValidationError(
                "Cada variante debe tener al menos un atributo: color, diseño o talla."
            )

        return attrs

    def validate_sku(self, value):
        """
        Validar unicidad de SKU solo si cambió.
        """
        if not value:
            return value

        # Si estamos actualizando y el SKU no cambió, permitir
        if self.instance and self.instance.sku == value:
            return value

        # Si estamos actualizando y el SKU cambió, verificar unicidad
        if self.instance:
            from .models import Variante
            if Variante.objects.filter(sku=value).exclude(id_variante=self.instance.id_variante).exists():
                raise serializers.ValidationError("Ya existe una variante con este SKU.")

        # Si estamos creando, verificar unicidad
        if not self.instance:
            from .models import Variante
            if Variante.objects.filter(sku=value).exists():
                raise serializers.ValidationError("Ya existe una variante con este SKU.")

        return value


class ProductoSerializer(serializers.ModelSerializer):

    categoria = CategoriaSerializer(read_only=True)  # Mantener temporalmente para compatibilidad

    categoria_id = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all(),
        source="categoria",
        write_only=True,
        required=False,
        allow_null=True
    )

    # NUEVA: Categorías múltiples (fuente de verdad)
    categorias = CategoriaSerializer(read_only=True, many=True)

    categorias_ids = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all(),
        write_only=True,
        many=True,
        required=False
    )

    variantes = VarianteSerializer(
        many=True,
        read_only=True,
        source="variante_set"
    )

    producto_simple = serializers.BooleanField(default=False, required=False)

    imagenes_generales = serializers.SerializerMethodField()

    stock_general = serializers.SerializerMethodField()

    slug = serializers.SlugField(required=False)

    def get_stock_general(self, obj):
        # Usar variantes del prefetch_related (ya están cargadas en memoria)
        variantes = obj.variante_set.all()
        if obj.producto_simple:
            variante = next(iter(variantes), None)
            return variante.stock if variante else 0
        return sum(v.stock for v in variantes)

    def get_imagenes_generales(self, obj):
        """
        Campo calculado para facilitar el frontend.
        Si el producto es simple, extrae las imágenes de la variante técnica.
        Si tiene variantes, retorna array vacío (el frontend usará variantes[].imagenes).
        """
        if obj.producto_simple:
            # Usar variantes del prefetch_related
            variantes = obj.variante_set.all()
            variante = next(iter(variantes), None)
            if variante:
                # Usar imágenes del prefetch_related (ya están ordenadas)
                return ImagenSerializer(variante.imagenproducto_set.all(), many=True).data
        return []

    def to_internal_value(self, data):
        # Manejar el caso donde descripcion viene como array
        if 'descripcion' in data and isinstance(data['descripcion'], list):
            data = data.copy()
            if len(data['descripcion']) > 0:
                data['descripcion'] = str(data['descripcion'][0])
            else:
                data['descripcion'] = ''

        # MANTENER COMPATIBILIDAD: Si viene categoria_id (uno solo), convertir a categorias_ids
        if 'categoria_id' in data and data['categoria_id'] is not None and data['categoria_id'] != '':
            data = data.copy()
            # Si ya viene categorias_ids, agregar a la lista
            if 'categorias_ids' in data and isinstance(data['categorias_ids'], list):
                if data['categoria_id'] not in data['categorias_ids']:
                    data['categorias_ids'].append(data['categoria_id'])
            else:
                # Si no viene categorias_ids, crear lista con categoria_id
                data['categorias_ids'] = [data['categoria_id']]

        return super().to_internal_value(data)

    def create(self, validated_data):
        # Extraer categorias_ids antes de crear el producto
        categorias_ids = validated_data.pop('categorias_ids', None)
        # Mantener compatibilidad con categoria_id
        categoria_id = validated_data.pop('categoria_id', None)

        # Si viene categoria_id, convertir a categorias_ids
        if categoria_id and not categorias_ids:
            categorias_ids = [categoria_id]

        producto = super().create(validated_data)

        # Asignar categorías después de crear el producto
        if categorias_ids:
            producto.categorias.set(categorias_ids)

        return producto

    def update(self, instance, validated_data):
        # Extraer categorias_ids antes de actualizar el producto
        categorias_ids = validated_data.pop('categorias_ids', None)
        # Mantener compatibilidad con categoria_id
        categoria_id = validated_data.pop('categoria_id', None)

        # Si viene categoria_id, convertir a categorias_ids
        if categoria_id is not None and categorias_ids is None:
            categorias_ids = [categoria_id]

        # Actualizar campos normales
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Actualizar categorías si se proporcionaron
        if categorias_ids is not None:
            instance.categorias.set(categorias_ids)

        return instance

    class Meta:

        model = Producto

        fields = [
            "id_producto",
            "categoria",  # Mantener temporalmente para compatibilidad
            "categoria_id",  # Mantener temporalmente para compatibilidad
            "categorias",  # NUEVO: categorías múltiples
            "categorias_ids",  # NUEVO: escritura de categorías múltiples
            "nombre",
            "slug",
            "descripcion",
            "precio",
            "estado",
            "created_at",
            "updated_at",
            "producto_simple",  # NUEVO: tipo de producto
            "stock_general",  # NUEVO: stock para productos simples / total
            "imagenes_generales",  # NUEVO: imágenes para productos simples
            "variantes",
        ]
