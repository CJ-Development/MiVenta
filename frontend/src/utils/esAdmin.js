/**
 * Determina si un usuario es administrador.
 *
 * El backend (`apps.users.serializers.UsuarioSerializer`) expone:
 *   - is_superuser (bool)
 *   - is_staff     (bool)
 *   - tipo_usuario ("admin" | "cliente")
 *
 * Importante: NO existe un campo `rol` numérico. Cualquier código que
 * consulte `usuario.rol === 2` siempre devolverá `false`, que es justo
 * el bug que hacía que TODOS los usuarios se vieran como cliente.
 */
export function esAdmin(usuario) {
    if (!usuario) return false;
    return (
        usuario.is_superuser === true ||
        usuario.is_staff === true ||
        usuario.tipo_usuario === "admin"
    );
}
