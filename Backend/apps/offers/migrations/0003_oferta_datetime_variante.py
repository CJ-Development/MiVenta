from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    - fecha_inicio / fecha_fin pasan de DateField a DateTimeField.
      Los datos existentes quedan con hora 00:00:00 (la oferta
      comienza/finaliza a medianoche).
    - Se agrega la FK opcional a Variante (SET_NULL para no perder
      ofertas si se elimina la variante).
    """

    dependencies = [
        ('offers', '0002_oferta_categorias'),
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='oferta',
            name='fecha_inicio',
            field=models.DateTimeField(),
        ),
        migrations.AlterField(
            model_name='oferta',
            name='fecha_fin',
            field=models.DateTimeField(),
        ),
        migrations.AddField(
            model_name='oferta',
            name='variante',
            field=models.ForeignKey(
                blank=True,
                db_column='id_variante',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='ofertas',
                to='products.variante',
            ),
        ),
    ]
