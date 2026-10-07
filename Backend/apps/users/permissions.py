from rest_framework.permissions import BasePermission


class IsAdministrador(BasePermission):

    def has_permission(self, request, view):

        return (
            request.user.is_authenticated
            and request.user.rol.nombre_rol == "administrador"
        )