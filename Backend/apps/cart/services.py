from .models import Carrito, ItemCarrito


class CarritoService:

    @staticmethod
    def obtener(usuario):

        carrito, created = Carrito.objects.get_or_create(
            usuario=usuario
        )

        return carrito

    @staticmethod
    def agregar(carrito, variante, cantidad):
        # Validar que la variante tenga stock disponible
        if not variante.stock_infinito and variante.stock <= 0:
            raise ValueError("Esta variante no tiene stock disponible.")

        # Validar que el producto esté activo
        if variante.producto.estado != "activo":
            raise ValueError("Este producto no está disponible.")

        item, created = ItemCarrito.objects.get_or_create(
            carrito=carrito,
            variante=variante
        )

        nueva_cantidad = item.cantidad + cantidad if not created else cantidad

        if not variante.stock_infinito and nueva_cantidad > variante.stock:
            raise ValueError(f"No hay suficiente stock. Disponible: {variante.stock}.")

        item.cantidad = nueva_cantidad
        item.save()

        return item

    @staticmethod
    def eliminar(id_item):

        ItemCarrito.objects.filter(
            id_item=id_item
        ).delete()

    @staticmethod
    def vaciar(carrito):

        carrito.items.all().delete()