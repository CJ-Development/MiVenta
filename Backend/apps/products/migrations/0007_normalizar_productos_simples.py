# Migration para normalizar productos simples existentes
# Basado en producto_simple como fuente de verdad única
# NO infiere tipo de producto de estructura de variantes

from django.db import migrations


def normalizar_productos_simples(apps, schema_editor):
    """
    Normalizar productos simples existentes basado en producto_simple == True.
    
    Regla:
    - producto_simple == True → normalizar variante interna (color/diseño/talla = NULL)
    - producto_simple == False → NO modificar variantes (ningún cambio)
    
    NO inferir producto_simple de estructura de variantes.
    """
    Producto = apps.get_model('products', 'Producto')
    Variante = apps.get_model('products', 'Variante')
    
    # Solo procesar productos marcados como simple
    productos_simples = Producto.objects.filter(producto_simple=True)
    
    for producto in productos_simples:
        variantes = producto.variante_set.all()
        
        # Producto simple debe tener exactamente 1 variante
        if variantes.count() == 1:
            variante = variantes.first()
            # Limpiar atributos sin importar valores actuales
            variante.color_id = None
            variante.diseño_id = None
            variante.talla_id = None
            variante.save(update_fields=['color', 'diseño', 'talla'])
        else:
            # Caso inesperado: producto_simple=True pero no tiene 1 variante
            # Loggear pero no romper migración
            print(f"WARNING: Producto {producto.id_producto} marcado como simple pero tiene {variantes.count()} variantes")


def reverse_normalizar_productos_simples(apps, schema_editor):
    """
    Operación inversa: limpiar producto_simple (no reversible perfecto).
    Los atributos de variantes no se pueden reconstruir automáticamente.
    """
    Producto = apps.get_model('products', 'Producto')
    Producto.objects.update(producto_simple=False)


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0006_add_producto_simple'),
    ]

    operations = [
        migrations.RunPython(
            normalizar_productos_simples,
            reverse_normalizar_productos_simples
        ),
    ]
