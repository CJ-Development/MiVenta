import api from "./api";

/* ===========================
   PRODUCTOS
=========================== */

export const getProducts = (params = {}) => {
    const { signal, ...filters } = params || {};
    const config = {};
    if (Object.keys(filters).length > 0) config.params = filters;
    if (signal) config.signal = signal;
    return api.get("/products/", config);
};

export const getProduct = (id) => api.get(`/products/${id}/`);
export const createProduct = (data) => api.post("/products/", data);
export const updateProduct = (id, data) => api.put(`/products/${id}/`, data);

export const saveProductComplete = (productId, formData) =>
    productId
        ? api.put(`/products/${productId}/completo/`, formData)
        : api.post("/products/completo/", formData);

export const archiveProduct = (id) => api.delete(`/products/${id}/`);
export const reactivateProduct = (id) => api.post(`/products/${id}/reactivar/`);
export const reactivateProductById = reactivateProduct;

/* Variantes: se conservan para operaciones puntuales fuera del formulario completo. */
export const getVariants = (productId) => api.get(`/products/${productId}/variantes/`);
export const createVariant = (productId, data) => api.post(`/products/${productId}/variantes/`, data);
export const updateVariant = (variantId, data) => api.put(`/products/variantes/${variantId}/`, data);
export const deleteVariant = (variantId) => api.delete(`/products/variantes/${variantId}/`);

/* Imágenes: se conservan para operaciones puntuales. */
export const addVariantImage = (variantId, data) => api.post(`/products/variantes/${variantId}/imagenes/`, data);
export const updateVariantImage = (imageId, data) => api.put(`/products/imagenes/${imageId}/`, data);
export const deleteVariantImage = (imageId) => api.delete(`/products/imagenes/${imageId}/`);
export const uploadVariantImage = (variantId, formData) =>
    api.post(`/products/variantes/${variantId}/imagenes/`, formData);

/* Colores y tallas */
export const getColors = () => api.get("/products/colores/");
export const createColor = (data) => api.post("/products/colores/", data);
export const updateColor = (id, data) => api.put(`/products/colores/${id}/`, data);
export const deleteColor = (id) => api.delete(`/products/colores/${id}/`);
export const getTallas = () => api.get("/products/tallas/");
export const createTalla = (data) => api.post("/products/tallas/", data);
export const updateTalla = (id, data) => api.put(`/products/tallas/${id}/`, data);
export const deleteTalla = (id) => api.delete(`/products/tallas/${id}/`);

/* Diseños */
export const getDesigns = () => api.get("/products/disenos/");
export const createDesign = (data) => api.post("/products/disenos/", data);
export const updateDesign = (id, data) => api.put(`/products/disenos/${id}/`, data);
export const deleteDesign = (id) => api.delete(`/products/disenos/${id}/`);

/* =====================================================
   CATEGORÍAS
===================================================== */

export const getCategories = (params = {}) => {
    return api.get(
        "/categories/",
        {
            params
        }
    );
};

export const getCategory = (id) => {
    return api.get(
        `/categories/${id}/`
    );
};

export const createCategory = (data) => {
    return api.post(
        "/categories/",
        data
    );
};

export const updateCategory = (id, data) => {
    return api.put(
        `/categories/${id}/`,
        data
    );
};

export const deleteCategory = (
    id,
    { cascade = false } = {}
) => {

    const params = cascade
        ? { cascade: true }
        : {};

    return api.delete(
        `/categories/${id}/`,
        {
            params
        }
    );
};

export const reactivateCategory = (id) => {
    return api.post(
        `/categories/${id}/reactivar/`
    );
};
/* ===========================
   OFERTAS
=========================== */
export const getOffers = () => api.get("/offers/");

/* El backend espera categorias_ids (lista de PKs) para crear/actualizar
 * la relación M2M con categorías. Si no viene, mandamos lista vacía
 * para que el servidor desarme la relación anterior sin errores. */
export const createOffer = (data) => {
    const payload = {
        ...data,
        categorias_ids: Array.isArray(data.categorias_ids) ? data.categorias_ids : [],
    };
    return api.post("/offers/", payload);
};

export const updateOffer = (id, data) => {
    const payload = {
        ...data,
        categorias_ids: Array.isArray(data.categorias_ids) ? data.categorias_ids : [],
    };
    return api.put(`/offers/${id}/`, payload);
};

export const deleteOffer = (id) => api.delete(`/offers/${id}/`);

/* ===========================
   PEDIDOS
=========================== */
export const getOrders = () => api.get("/orders/");
export const getOrder = (id) => api.get(`/orders/${id}/`);
export const createOrder = (data) => api.post("/orders/", data);
export const updateOrderStatus = (id, data) => api.put(`/orders/${id}/`, data);
export const deleteOrder = (id) => api.delete(`/orders/${id}/`);

/* ===========================
   USUARIOS
=========================== */
export const getUsers = () => api.get("/users/");
export const getUser = (id) => api.get(`/users/${id}/`);
export const createUser = (data) => api.post("/users/", data);
export const updateUser = (id, data) => api.put(`/users/${id}/`, data);
export const deleteUser = (id) => api.delete(`/users/${id}/`);
export const changePassword = (id, data) => api.post(`/users/${id}/cambiar-password/`, data);
