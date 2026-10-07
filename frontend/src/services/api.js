import axios from "axios";

/*
=====================================================
 CLIENTE HTTP ÚNICO
=====================================================
- Usa la URL de VITE_API_URL en producción.
- Usa localhost en desarrollo.
- Envía cookies de sesión Django.
- Envía automáticamente CSRF.
- Mantiene compatibilidad con endpoints existentes.
=====================================================
*/

/*
=====================================================
 CACHÉ DE CSRF EN MEMORIA
=====================================================
Fallback cuando la cookie csrftoken no es accesible desde
document.cookie (caso típico: cross-site en Vercel, donde
SameSite=None + Secure puede ser bloqueado por el navegador
o por políticas de third-party cookies del browser).

El backend siempre devuelve el token en `response.data.csrfToken`
cuando llamas GET /api/users/csrf/. Lo cacheamos en memoria y
el interceptor lo usa si la cookie no está disponible.
=====================================================
*/
let csrfTokenCache = null;

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "/api/";

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,

    xsrfCookieName: "csrftoken",
    xsrfHeaderName: "X-CSRFToken",
});

/*
=====================================================
 LEER COOKIE
=====================================================
*/
function readCookie(name) {
    if (
        typeof document === "undefined" ||
        !document.cookie
    ) {
        return null;
    }

    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {
        const [key, ...valueParts] = cookie.trim().split("=");

        if (key === name) {
            return decodeURIComponent(valueParts.join("="));
        }
    }

    return null;
}

/*
=====================================================
 REQUEST INTERCEPTOR
=====================================================
*/

api.interceptors.request.use(
    (config) => {

        const method =
            (config.method || "get").toLowerCase();

        /*
        ---------------------------------------------
        CSRF
        ---------------------------------------------
        Prioridad:
          1) header ya puesto en config
          2) cookie csrftoken (caso normal same-origin)
          3) cache en memoria (fallback cross-site Vercel
             donde document.cookie puede estar vacía aunque
             la cookie exista a nivel de navegador)
        */

    if (
        ["post", "put", "patch", "delete"].includes(method)
    ) {
        config.headers =
            config.headers || {};

        if (!config.headers["X-CSRFToken"]) {
            const fromCache = csrfTokenCache;
            const fromCookie = readCookie("csrftoken");
            const token = fromCache || fromCookie;

            if (token) {
                config.headers["X-CSRFToken"] = token;
            }
        }
    }
        /*
        ---------------------------------------------
        USUARIO_ID: eliminado.

        Los endpoints admin se autentican por sesión Django
        (request.user.is_staff), NO por ?usuario_id. Mete el
        id_usuario como query param solo si el endpoint lo pide
        explícitamente en su llamada (ej. /api/cart/?usuario_id=…).
        ---------------------------------------------
        */

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);

/*
=====================================================
 RESPONSE INTERCEPTOR
=====================================================
*/

api.interceptors.response.use(

    (response) => response,

    async (error) => {

        const response = error?.response;
        const config = error?.config;

        if (response) {

            const status = response.status;
            const data = response.data;

            if (status === 401) {

                console.warn(
                    "[api] 401 - Usuario no autenticado",
                    {
                        url: config?.url,
                    }
                );
            }

            if (status === 403) {

                const detail =
                    data?.detail ||
                    data?.error ||
                    "Sin detalle";

                console.warn(
                    "[api] 403 - Sin permisos / CSRF",
                    {
                        url: config?.url,
                        detail,
                    }
                );

                /*
                --------------------------------------------------
                RETRY ÚNICO ANTE CSRF

                Si el 403 viene por token CSRF inválido/expirado
                (rotación de Django, cookie perdida por ngrok,
                prefetch, race condition post-reload), refrescamos
                el token y reintentamos la petición UNA sola vez.

                El flag `_csrfRetried` en config evita loops
                infinitos: si el segundo intento también falla,
                dejamos pasar el error al componente.
                --------------------------------------------------
                */
                const isCsrf =
                    typeof detail === "string" &&
                    /csrf/i.test(detail);

                const isStateMutating = ["post", "put", "patch", "delete"]
                    .includes(
                        (config?.method || "get").toLowerCase()
                    );

                if (
                    isCsrf &&
                    isStateMutating &&
                    config &&
                    !config._csrfRetried
                ) {
                    config._csrfRetried = true;

                    try {
                        await getCsrfToken();

                        // Reintentamos pasando el config modificado
                        // para que axios re-inyecte X-CSRFToken
                        // con la cookie nueva.
                        return api.request(config);
                    } catch (retryError) {

                        console.error(
                            "[api] Reintento CSRF falló:",
                            retryError
                        );

                        return Promise.reject(retryError);
                    }
                }
            }
        }

        return Promise.reject(error);
    }
);

/*
=====================================================
 AUTENTICACIÓN
=====================================================
*/

export const register = (data) => {
    return api.post(
        "users/register/",
        data
    );
};

export const login = (data) => {
    return api.post(
        "users/login/",
        data
    );
};

export const logout = () => {
    return api.post(
        "users/logout/"
    );
};

export const me = () => {
    return api.get(
        "users/me/"
    );
};

/*
=====================================================
 USUARIOS
=====================================================
*/

export const getUsers = () => {
    return api.get(
        "users/"
    );
};

export const getUser = (id) => {
    return api.get(
        `users/${id}/`
    );
};

export const updateUser = (id, data) => {
    return api.put(
        `users/${id}/`,
        data
    );
};

export const deleteUser = (id) => {
    return api.delete(
        `users/${id}/`
    );
};

/*
=====================================================
 DASHBOARD
=====================================================
*/

export const getLowStockVariants = () => {
    return api.get(
        "products/low-stock/"
    );
};

/*
=====================================================
 CSRF TOKEN
=====================================================
Obtiene el token CSRF del backend. Es necesario llamar
esto antes de hacer peticiones POST/PUT/DELETE para
asegurarse de tener el token válido.
=====================================================
*/
export const getCsrfToken = async () => {
    const response = await api.get("users/csrf/");

    const token = response.data?.csrfToken;

    if (!token) {
        throw new Error("El backend no devolvió el token CSRF");
    }

    // Cacheamos el token en memoria como fallback para cuando
    // la cookie no es accesible desde document.cookie (caso
    // típico cross-site en Vercel: SameSite=None + Secure puede
    // ser bloqueado por el navegador y axios no encuentra la
    // cookie aunque el backend sí la haya emitido).
    csrfTokenCache = token;

    // No tocamos api.defaults.headers.common["X-CSRFToken"]:
    // el request interceptor lee (cookie || cache) en cada
    // POST/PUT/PATCH/DELETE. Mantener el cache separado evita
    // desincronización con la cookie real si Django la rota.

    return response;
};

/*
=====================================================
 ENSURE CSRF
=====================================================
Helper proactivo para componentes que disparan un POST/PUT/
DELETE sensible (admin product-form, etc.) justo
después de un cold reload.

En la mayoría de casos NO es necesario: el response
interceptor (líneas 115-202) ya reintenta una vez ante 403
por CSRF. Úsalo solo si:
  - quieres evitar el round-trip extra del retry
  - el POST es idempotente-caro (multipart upload grande)
  - quieres garantizar CSRF antes de deshabilitar un botón
    de submit

Devuelve true si hay cookie, false si falló el refresh.
=====================================================
*/
export const ensureCsrf = async () => {
    try {
        await getCsrfToken();
        return true;
    } catch (err) {
        console.warn(
            "[api] ensureCsrf: no se pudo refrescar el token",
            err
        );
        return false;
    }
};

export default api;