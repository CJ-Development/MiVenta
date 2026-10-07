import api from "./api";

/* ===========================
   CARRITO
=========================== */

export const getMyCart = (usuarioId) =>
    api.get(`/cart/?usuario_id=${usuarioId}`);

export const addToCart = (usuarioId, varianteId, cantidad = 1) =>
    api.post(`/cart/`, {
        usuario_id: usuarioId,
        variante_id: varianteId,
        cantidad,
    });

export const updateCartItem = (itemId, cantidad) =>
    api.put(`/cart/items/${itemId}/`, { cantidad });

export const removeFromCart = (itemId) =>
    api.delete(`/cart/items/${itemId}/`);


/* ===========================
   PEDIDOS (cliente)
=========================== */

export const getMyOrders = (usuarioId) =>
    api.get(`/orders/mis-pedidos/?usuario_id=${usuarioId}`);

export const getOrderDetail = (id) =>
    api.get(`/orders/${id}/`);

export const createOrderFromCart = (data) =>
    api.post(`/orders/checkout/`, data);


/* ===========================
   OFERTAS
=========================== */

export const getOffers = () =>
    api.get(`/offers/`);


/* ===========================
   FAVORITOS
=========================== */

export const getMyFavorites = (usuarioId) =>
    api.get(`/favorites/?usuario_id=${usuarioId}`);

export const addFavorite = (usuarioId, productoId) =>
    api.post(`/favorites/`, { usuario_id: usuarioId, producto_id: productoId });

export const removeFavorite = (idFavorito) =>
    api.delete(`/favorites/${idFavorito}/`);


/* ===========================
   USUARIO (perfil / settings)
=========================== */

export const updateMyProfile = (id, data) =>
    api.put(`/users/${id}/`, data);

export const changePassword = (id, data) =>
    api.post(`/users/${id}/cambiar-password/`, data);
