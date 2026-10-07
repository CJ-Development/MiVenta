import { createContext, useEffect, useState } from "react";

import { getCsrfToken, login as apiLogin } from "../services/api";

import { useInactivityLogout } from "../hooks/useInactivityLogout";

import InactivityModal from "../components/InactivityModal/InactivityModal";

export const AuthContext = createContext();

function AuthProvider({ children }) {

    const [usuario, setUsuario] = useState(null);

    const [loading, setLoading] = useState(true);

    /*
    -----------------------------------------------------
    IMPORTANTE: estas funciones (logout, login, updateUsuario)
    se declaran ANTES de useInactivityLogout porque ese hook
    recibe `logout` por prop. Si las declaráramos después,
    el primer render del Provider evaluaría `logout` antes
    de su inicialización → TDZ ("Cannot access 'logout' before
    initialization") y la app no carga.
    -----------------------------------------------------
    */

    const login = async (email, password) => {

        try {
            const response = await apiLogin({ email, password });
            const userData = response.data;

            localStorage.setItem(
                "usuario",
                JSON.stringify(userData)
            );

            setUsuario(userData);

            // =================================================
            // OBTENER TOKEN CSRF DESPUÉS DEL LOGIN
            // =================================================

            try {
                await getCsrfToken();
            } catch (csrfError) {
                console.warn(
                    "[AuthProvider] Error obteniendo CSRF token después del login:",
                    csrfError
                );
                // Continuamos aunque falle el CSRF
            }

            return userData;
        } catch (error) {
            console.error("Error en login:", error);
            throw error;
        }

    };

    const updateUsuario = (data) => {
        const merged = { ...(usuario || {}), ...data };
        localStorage.setItem("usuario", JSON.stringify(merged));
        setUsuario(merged);
    };

    const logout = () => {

        localStorage.removeItem("usuario");

        setUsuario(null);

    };

    /*
    -----------------------------------------------------
    AUTO-LOGOUT POR INACTIVIDAD

    Solo se activa cuando hay un usuario autenticado
    (enabled = !!usuario). Cierra sesión a los 15 min sin
    actividad. Muestra un modal 60s antes con un botón
    "Seguir conectado" para que el usuario pueda extender
    la sesión sin reiniciar manualmente.
    -----------------------------------------------------
    */
    const {
        showWarning,
        secondsLeft,
        stayConnected,
    } = useInactivityLogout({
        enabled: !!usuario,
        // Importante: pasamos `logout` y `usuario` por
        // prop en vez de hacer que el hook use useAuth()
        // internamente. AuthProvider es quien provee el
        // AuthContext, y durante su propio render
        // useContext(AuthContext) devuelve undefined → el
        // hook reventaría con "Cannot destructure property
        // 'usuario' of undefined".
        clearLocalAuth: logout,
        usuario,
        onExpire: () => {
            // Forzamos navegación a /admin/login al expirar (solo para admin).
            // Usamos location en lugar de useNavigate para
            // evitar añadir otro import + re-render.
            if (
                typeof window !== "undefined" &&
                !window.location.pathname.startsWith(
                    "/admin/login"
                )
            ) {
                window.location.href = "/admin/login?expired=1";
            }
        },
    });

    useEffect(() => {

        const usuarioGuardado = localStorage.getItem("usuario");

        if (usuarioGuardado) {

            setUsuario(JSON.parse(usuarioGuardado));

        }

        // Refrescamos CSRF al montar. La cookie csrftoken es
        // HTTP-only de sesión: tras un reload el frontend no la
        // tiene garantizada hasta hacer un GET que la emita.
        // Si el primer POST tras reload es contra un endpoint
        // protegido, axios lee la cookie antes de que exista y
        // el backend responde 403.
        getCsrfToken().catch((err) => {
            console.warn(
                "[AuthProvider] No se pudo refrescar CSRF al montar:",
                err
            );
        });

        setLoading(false);

    }, []);

    return (

        <AuthContext.Provider

            value={{

                usuario,

                loading,

                login,

                logout,

                updateUsuario,

            }}

        >

            {children}

            <InactivityModal
                open={showWarning}
                secondsLeft={secondsLeft}
                onStay={stayConnected}
            />

        </AuthContext.Provider>

    );

}

export default AuthProvider;