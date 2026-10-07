from .models import Oferta


class OfertaService:

    @staticmethod
    def listar():
        return (
            Oferta.objects
            .select_related("producto")
            .prefetch_related("categorias")
            .order_by("-fecha_inicio")
        )

    @staticmethod
    def obtener(id_oferta):
        return OfertaService.listar().get(id_oferta=id_oferta)

    @staticmethod
    def crear(data):
        # Las relaciones M2M no se pueden asignar con create(**data);
        # hay que extraerlas, crear la instancia y setearlas después.
        categorias = data.pop("categorias", None)

        oferta = Oferta.objects.create(**data)

        if categorias is not None:
            oferta.categorias.set(categorias)

        return oferta

    @staticmethod
    def actualizar(id_oferta, data):
        oferta = Oferta.objects.get(id_oferta=id_oferta)

        # Misma idea: separamos las M2M antes de hacer el save()
        # para no terminar haciendo setattr(categorias=...) sobre
        # el manager.
        categorias = data.pop("categorias", None)

        for campo, valor in data.items():
            setattr(oferta, campo, valor)

        oferta.save()

        if categorias is not None:
            oferta.categorias.set(categorias)

        return oferta

    @staticmethod
    def eliminar(id_oferta):
        Oferta.objects.filter(id_oferta=id_oferta).delete()
