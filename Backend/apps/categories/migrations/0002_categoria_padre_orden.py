from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("categories", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="categoria",
            name="id_categoria_padre",
            field=models.ForeignKey(
                blank=True,
                db_column="id_categoria_padre",
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="subcategorias",
                to="categories.categoria",
            ),
        ),
        migrations.AddField(
            model_name="categoria",
            name="orden",
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AlterModelOptions(
            name="categoria",
            options={
                "ordering": ["orden", "nombre"],
            },
        ),
    ]
