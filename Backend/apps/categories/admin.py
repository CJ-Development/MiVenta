from django.contrib import admin
from .models import Categoria


class CategoriaAdmin(admin.ModelAdmin):
    """
    Admin personalizado para categorías con soporte de jerarquía.
    """
    list_display = ('nombre', 'slug', 'id_categoria_padre', 'orden', 'estado')
    list_filter = ('estado', 'id_categoria_padre')
    search_fields = ('nombre', 'slug')
    ordering = ('orden', 'nombre')
    
    fieldsets = (
        ('Información básica', {
            'fields': ('nombre', 'slug', 'descripcion')
        }),
        ('Jerarquía', {
            'fields': ('id_categoria_padre', 'orden')
        }),
        ('Estado', {
            'fields': ('estado',)
        }),
    )
    
    readonly_fields = ('slug',)  # Slug se genera automáticamente
    
    def get_form(self, request, obj=None, **kwargs):
        """
        Personalizar el formulario para mostrar claramente la jerarquía
        en el selector de categoría padre.
        """
        form = super().get_form(request, obj, **kwargs)
        if 'id_categoria_padre' in form.base_fields:
            # Obtener el campo de categoría padre
            padre_field = form.base_fields['id_categoria_padre']
            # Personalizar el queryset para mostrar jerarquía
            padre_field.queryset = Categoria.objects.filter(estado='activo').order_by('orden', 'nombre')
            padre_field.label_from_instance = self.label_categoria_jerarquica
        return form
    
    def label_categoria_jerarquica(self, obj):
        """
        Muestra la categoría con su ruta jerárquica completa.
        Ejemplo: "Hombre > Ropa > Pantalones"
        """
        if not obj:
            return '--- Sin padre ---'
        
        # Construir ruta jerárquica
        ruta = [obj.nombre]
        padre = obj.id_categoria_padre
        
        while padre:
            ruta.insert(0, padre.nombre)
            padre = padre.id_categoria_padre
        
        return ' > '.join(ruta)
    
    label_categoria_jerarquica.short_description = 'Categoría'


admin.site.register(Categoria, CategoriaAdmin)