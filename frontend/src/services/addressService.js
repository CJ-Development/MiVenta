import api from "./api";


/* ===========================
   DIRECCIONES DEL CLIENTE
=========================== */

export const getMisDirecciones = (usuarioId) =>
    api.get(`/users/direcciones/?usuario_id=${usuarioId}`);

export const crearDireccion = (payload) =>
    api.post(`/users/direcciones/`, payload);

export const actualizarDireccion = (id, payload) =>
    api.put(`/users/direcciones/${id}/`, payload);

export const eliminarDireccion = (id) =>
    api.delete(`/users/direcciones/${id}/`);

export const marcarPredeterminada = (id, usuarioId) =>
    api.put(`/users/direcciones/${id}/`, {
        usuario: usuarioId,
        predeterminada: true,
    });
