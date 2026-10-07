import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'confiig.settings')
django.setup()

from apps.orders.models import MetodoPago

def crear_metodos_pago():
    metodos = [
        {
            "tipo": "WhatsApp",
            "detalle": "Envía tu pedido directamente por WhatsApp"
        },
        {
            "tipo": "Contra entrega",
            "detalle": "Pagar al recibir el pedido en efectivo"
        },
        {
            "tipo": "Transferencia bancaria",
            "detalle": "Transferencia directa a cuenta bancaria"
        }
    ]

    for metodo_data in metodos:
        metodo, created = MetodoPago.objects.get_or_create(
            tipo=metodo_data["tipo"],
            defaults={"detalle": metodo_data["detalle"]}
        )
        if created:
            print(f"Creado: {metodo.tipo} (ID: {metodo.id_metodo_pago})")
        else:
            print(f"Ya existe: {metodo.tipo} (ID: {metodo.id_metodo_pago})")

    print("\nMétodos de pago creados exitosamente.")

if __name__ == "__main__":
    crear_metodos_pago()
