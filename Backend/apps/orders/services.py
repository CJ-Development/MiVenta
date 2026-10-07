from .models import Compra


class CompraService:

    @staticmethod
    def listar():

        return Compra.objects.select_related(
            "usuario",
            "direccion",
            "metodo_pago"
        ).prefetch_related(
            "detalles__variante__producto"
        ).order_by("-fecha_compra")

    @staticmethod
    def obtener(id_compra):

        return (
            Compra.objects
            .select_related("usuario", "direccion", "metodo_pago")
            .prefetch_related("detalles__variante__producto")
            .get(id_compra=id_compra)
        )

    @staticmethod
    def actualizar(id_compra, data):

        compra = Compra.objects.get(id_compra=id_compra)

        for campo, valor in data.items():
            setattr(compra, campo, valor)

        compra.save()
        return compra

    @staticmethod
    def crear(data):

        return Compra.objects.create(
            **data
        )

    @staticmethod
    def eliminar(id_compra):

        Compra.objects.filter(
            id_compra=id_compra
        ).delete()