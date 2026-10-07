# Generated manually for BaulMagicoShop multi-category migration

from django.db import migrations, models
import django.db.models.deletion


def migrate_categoria_to_categorias(apps, schema_editor):
    """
    Migrar datos existentes de producto.categoria a producto.categorias
    para conservar todas las relaciones existentes.
    """
    Producto = apps.get_model('products', 'Producto')

    for producto in Producto.objects.all():
        if producto.categoria_id:
            # Migrar la categoría existente a la nueva relación M2M
            producto.categorias.add(producto.categoria_id)
            # El producto mantiene su categoría original en ambos campos


def reverse_migrate_categoria_to_categorias(apps, schema_editor):
    """
    Operación inversa: limpiar datos M2M en caso de rollback.
    """
    Producto = apps.get_model('products', 'Producto')

    for producto in Producto.objects.all():
        producto.categorias.clear()


class Migration(migrations.Migration):

    dependencies = [
        ('categories', '0003_categoria_slug_alter_categoria_nombre_and_more'),
        ('products', '0004_alter_variante_sku'),
    ]

    operations = [
        # FASE 1: Hacer nullable el ForeignKey existente (para prepararlo para eliminación futura)
        migrations.AlterField(
            model_name='producto',
            name='categoria',
            field=models.ForeignKey(
                db_column='id_categoria',
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                to='categories.categoria'
            ),
        ),

        # FASE 2: Agregar el ManyToManyField categorias
        migrations.AddField(
            model_name='producto',
            name='categorias',
            field=models.ManyToManyField(
                blank=True,
                related_name='productos',
                to='categories.categoria'
            ),
        ),

        # FASE 3: Migrar datos existentes del ForeignKey al ManyToMany
        migrations.RunPython(
            migrate_categoria_to_categorias,
            reverse_migrate_categoria_to_categorias
        ),
    ]
