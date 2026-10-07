from .models import Favorito


class FavoritoService:

    @staticmethod
    def listar(usuario):

        return Favorito.objects.filter(
            usuario=usuario
        )

    @staticmethod
    def agregar(data):

        return Favorito.objects.create(
            **data
        )

    @staticmethod
    def eliminar(id_favorito):

        Favorito.objects.filter(
            id_favorito=id_favorito
        ).delete()