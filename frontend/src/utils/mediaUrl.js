/*
 * Helper para resolver URLs de imágenes del backend.
 * - Si el valor es null/undefined, devuelve el fallback.
 * - Si ya es una URL absoluta (http/https/data), se devuelve tal cual.
 * - Si es una URL relativa (ej. "/media/productos/xxx.jpeg"),
 *   se le antepone el origen del backend para que el navegador
 *   pueda cargarla cuando el frontend corre en otro host/puerto.
 */

const getApiOrigin = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && apiUrl.startsWith("http")) {
        try {
            return new URL(apiUrl).origin;
        } catch {
            return "http://127.0.0.1:8000";
        }
    }
    return "http://127.0.0.1:8000";
};

const API_ORIGIN = getApiOrigin();

export const mediaUrl = (value, fallback = null) => {
    if (!value) return fallback;

    if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("data:") ||
        value.startsWith("blob:")
    ) {
        return value;
    }

    return `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
};

export default mediaUrl;
