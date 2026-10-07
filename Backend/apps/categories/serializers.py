from rest_framework import serializers

from .models import Categoria


class CategoriaSerializer(serializers.ModelSerializer):
    """
    Serializer principal de categorías.

    Expone:
      · categoria_padre_id  → PK de la categoría padre (writable).
      · categoria_padre     → objeto anidado de solo lectura.
      · subcategorias       → lista anidada de solo lectura.
      · slug                → slug jerárquico único.
      · profundidad         → nivel en la jerarquía (1-3).
    """

    categoria_padre_id = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all(),
        source="id_categoria_padre",
        required=False,
        allow_null=True,
    )

    categoria_padre = serializers.SerializerMethodField()

    subcategorias = serializers.SerializerMethodField()

    slug = serializers.CharField(read_only=True)
    
    profundidad = serializers.SerializerMethodField()

    class Meta:
        model = Categoria
        fields = [
            "id_categoria",
            "nombre",
            "slug",
            "descripcion",
            "estado",
            "orden",
            "categoria_padre_id",
            "categoria_padre",
            "subcategorias",
            "profundidad",
        ]

    def get_categoria_padre(self, obj):
        padre = obj.id_categoria_padre
        if not padre:
            return None
        return {
            "id_categoria": padre.id_categoria,
            "nombre": padre.nombre,
            "slug": padre.slug,
        }

    def get_subcategorias(self, obj):
        # Usar subcategorías precargadas del prefetch_related
        qs = getattr(obj, "subcategorias", None)
        if qs is None:
            # Si no están precargadas, cargarlas
            qs = obj.subcategorias.all()
        
        subcategorias_data = []
        # Convertir a lista para evitar queries adicionales
        subcategorias_list = list(qs.all()) if hasattr(qs, 'all') else list(qs)
        
        for sub in subcategorias_list:
            sub_data = {
                "id_categoria": sub.id_categoria,
                "nombre": sub.nombre,
                "slug": sub.slug,
                "estado": sub.estado,
                "orden": sub.orden,
                "subcategorias": []  # Sub-subcategorías
            }
            
            # Usar sub-subcategorías precargadas del prefetch_related (3 niveles)
            subsubs_qs = getattr(sub, "subcategorias", None)
            if subsubs_qs is not None:
                # Convertir a lista para evitar queries adicionales
                subsubs_list = list(subsubs_qs.all()) if hasattr(subsubs_qs, 'all') else list(subsubs_qs)
            else:
                # Si no están precargadas, cargarlas
                subsubs_list = list(sub.subcategorias.all())
                
            for subsub in subsubs_list:
                sub_data["subcategorias"].append({
                    "id_categoria": subsub.id_categoria,
                    "nombre": subsub.nombre,
                    "slug": subsub.slug,
                    "estado": subsub.estado,
                    "orden": subsub.orden,
                })
            
            subcategorias_data.append(sub_data)
        
        return subcategorias_data
    
    def get_profundidad(self, obj):
        # Usar el método del modelo pero con caché para evitar consultas repetidas
        # La caché se mantiene a nivel de instancia del serializer
        if not hasattr(self, '_profundidad_cache'):
            self._profundidad_cache = {}
        
        categoria_id = obj.id_categoria
        if categoria_id not in self._profundidad_cache:
            self._profundidad_cache[categoria_id] = obj.obtener_profundidad()
        
        return self._profundidad_cache[categoria_id]

    def validate(self, attrs):
        instancia = self.instance
        nuevo_padre = attrs.get("id_categoria_padre")
        nombre = attrs.get("nombre")

        # Validación de duplicados por mismo padre
        if nombre:
            # Si estamos editando, excluir la instancia actual de la búsqueda
            queryset = Categoria.objects.filter(
                nombre=nombre,
                id_categoria_padre=nuevo_padre
            )
            
            if instancia:
                queryset = queryset.exclude(id_categoria=instancia.id_categoria)
            
            if queryset.exists():
                raise serializers.ValidationError(
                    {"nombre": "Ya existe una categoría con este nombre bajo el mismo padre."}
                )

        # Si es creación y no llega categoria_padre_id, no hay padre.
        if instancia is None:
            # Validar profundidad para creación (límite de seguridad 10 niveles)
            if nuevo_padre:
                profundidad_padre = nuevo_padre.obtener_profundidad()
                if profundidad_padre >= 10:
                    raise serializers.ValidationError(
                        {"categoria_padre_id": "No se pueden crear categorías de nivel 11 o superior."}
                    )
            return attrs

        if nuevo_padre is None:
            return attrs

        if nuevo_padre.id_categoria == instancia.id_categoria:
            raise serializers.ValidationError(
                {"categoria_padre_id": "Una categoría no puede ser su propia padre."}
            )

        if nuevo_padre.es_descendiente_de(instancia):
            raise serializers.ValidationError(
                {"categoria_padre_id": "La categoría padre seleccionada crearía un ciclo."}
            )
        
        # Validar profundidad al cambiar de padre (límite de seguridad 10 niveles)
        profundidad_nueva = 1
        temp = nuevo_padre
        while temp:
            profundidad_nueva += 1
            if profundidad_nueva > 10:
                raise serializers.ValidationError(
                    {"categoria_padre_id": "El cambio de padre excedería la profundidad máxima de 10 niveles."}
                )
            temp = temp.id_categoria_padre

        return attrs
