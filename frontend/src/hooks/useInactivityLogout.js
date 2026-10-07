import { useEffect, useRef, useState, useCallback } from "react";

import { logout as apiLogout } from "../services/api";

/*
=====================================================
 AUTO-LOGOUT POR INACTIVIDAD
=====================================================
Cierra la sesión del usuario si no interactúa con la
página durante `timeoutMs` milisegundos.

Cuando faltan `warningMs` milisegundos para expirar,
muestra un modal con countdown. El usuario puede:
  - Pulsar "Seguir conectado" → resetea el timer.
  - No hacer nada → se llama POST /api/users/logout/ y
    se limpia localStorage.

IMPORTANTE: este hook NO usa useAuth() internamente.
AuthProvider lo invoca desde su propio body, y en ese
momento useContext(AuthContext) devuelve undefined (el
Provider todavía no está en el árbol durante su
propio render). El hook recibe `enabled` y
`clearLocalAuth` por props.

Eventos que cuentan como actividad:
  mousedown, keydown, scroll, touchstart, mousemove
  (throttle 1s para no saturar).

Pausa por pestaña oculta:
  Si document.visibilityState pasa a "hidden", congelamos
  el reloj. Al volver a "visible":
    - Si aún no se venció → seguimos con el tiempo
      restante real (no se consumió tiempo mientras
      estaba oculta).
    - Si ya se venció mientras estaba oculta → logout
      silencioso, sin mostrar el modal.

NO se monta el listener si `enabled` es false (usuario
no autenticado) → sin overhead en rutas públicas.
=====================================================
*/

const ACTIVITY_EVENTS = [
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
    "mousemove",
];

const ACTIVITY_THROTTLE_MS = 1000;

export const useInactivityLogout = ({
    timeoutMs = 15 * 60 * 1000,
    warningMs = 60 * 1000,
    enabled = true,
    onExpire,
    onWarning,
    clearLocalAuth,
    usuario = null,
} = {}) => {

    const [showWarning, setShowWarning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(
        Math.ceil(warningMs / 1000)
    );

    // Timestamp absoluto en el que se vence la sesión.
    // Se "congela" cuando la pestaña está oculta.
    const expiresAtRef = useRef(null);

    const warningTimerRef = useRef(null);
    const logoutTimerRef = useRef(null);
    const countdownRef = useRef(null);
    const throttleRef = useRef(0);

    // Guardamos los callbacks en refs para que el listener
    // de visibilitychange no necesite re-registrarse.
    const onExpireRef = useRef(onExpire);
    const onWarningRef = useRef(onWarning);

    useEffect(() => {
        onExpireRef.current = onExpire;
        onWarningRef.current = onWarning;
    }, [onExpire, onWarning]);

    const clearAllTimers = useCallback(() => {

        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
            warningTimerRef.current = null;
        }
        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    }, []);

    const performLogout = useCallback(async () => {

        clearAllTimers();
        setShowWarning(false);
        expiresAtRef.current = null;

        // Limpiamos sesión local primero. Si el POST falla
        // (cookie expirada, red caída), el usuario igual
        // sale de la app.
        clearLocalAuth();

        try {
            await apiLogout();
        } catch {
            /* el catch es deliberado: ya cerramos localmente */
        }

        if (onExpireRef.current) {
            onExpireRef.current();
        }
    }, [clearLocalAuth, clearAllTimers]);

    /*
    -----------------------------------------------------
    Arma el countdown + el logoutTimer con el tiempo
    restante hasta expiresAtRef. Se llama tanto al
    montar/resetear como al volver de pestaña oculta.
    -----------------------------------------------------
    */
    const scheduleCountdown = useCallback(() => {

        if (!expiresAtRef.current) return;

        const remainingMs = expiresAtRef.current - Date.now();
        const warningSecs = Math.ceil(warningMs / 1000);

        // Si ya entró a la ventana de warning (o sea,
        // ya mostramos modal) pero los timers están vivos,
        // seguimos el countdown sin volver a abrir el modal.
        const alreadyInWarning = showWarning;

        if (remainingMs <= 0) {
            // Ya venció mientras la pestaña estaba oculta.
            // Logout silencioso.
            performLogout();
            return;
        }

        if (remainingMs <= warningMs) {

            if (!alreadyInWarning) {

                setShowWarning(true);
                setSecondsLeft(
                    Math.max(
                        1,
                        Math.ceil(remainingMs / 1000)
                    )
                );

                if (onWarningRef.current) {
                    onWarningRef.current();
                }
            }

            // Countdown: se actualiza cada segundo restando
            // del expiresAt absoluto. Así no se desfasa si
            // el navegador throttlea los intervals.
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }

            countdownRef.current = setInterval(() => {

                if (!expiresAtRef.current) {
                    clearInterval(countdownRef.current);
                    countdownRef.current = null;
                    return;
                }

                const secs = Math.max(
                    0,
                    Math.ceil(
                        (expiresAtRef.current - Date.now()) /
                            1000
                    )
                );

                setSecondsLeft(secs);

                if (secs <= 0) {
                    clearInterval(countdownRef.current);
                    countdownRef.current = null;
                }

            }, 1000);

            if (logoutTimerRef.current) {
                clearTimeout(logoutTimerRef.current);
            }
            logoutTimerRef.current = setTimeout(
                () => {
                    performLogout();
                },
                remainingMs
            );

            return;
        }

        // Aún no entramos en warning. Programamos el
        // warningTimer para dentro de (remaining - warning).
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
        }

        warningTimerRef.current = setTimeout(() => {

            if (!expiresAtRef.current) return;

            const newRemaining =
                expiresAtRef.current - Date.now();

            if (newRemaining <= 0) {
                performLogout();
                return;
            }

            setShowWarning(true);
            setSecondsLeft(
                Math.max(
                    1,
                    Math.ceil(newRemaining / 1000)
                )
            );

            if (onWarningRef.current) {
                onWarningRef.current();
            }

            // Re-llamamos a scheduleCountdown con el
            // remaining real para arrancar el interval
            // y el logoutTimer finales.
            scheduleCountdown();

        }, remainingMs - warningMs);

    }, [warningMs, showWarning, performLogout]);

    const resetTimers = useCallback(() => {

        clearAllTimers();
        setShowWarning(false);
        setSecondsLeft(Math.ceil(warningMs / 1000));

        expiresAtRef.current = Date.now() + timeoutMs;

        scheduleCountdown();
    }, [timeoutMs, warningMs, clearAllTimers, scheduleCountdown]);

    const handleActivity = useCallback(() => {

        const now = Date.now();

        if (
            now - throttleRef.current <
            ACTIVITY_THROTTLE_MS
        ) {
            return;
        }

        throttleRef.current = now;

        // Si el modal ya está abierto, no reseteamos
        // (el usuario debe pulsar el botón o dejar
        // que expire). Si no, reseteamos.
        if (!showWarning) {
            resetTimers();
        }

    }, [resetTimers, showWarning]);

    const stayConnected = useCallback(() => {
        resetTimers();
    }, [resetTimers]);

    /*
    -----------------------------------------------------
    Visibilidad de la pestaña
    -----------------------------------------------------
    Al ocultarse: limpiamos timers (no los dejamos correr
    en background) y guardamos expiresAt tal cual.

    Al mostrarse: reprogramamos con el remaining real.
    Si el tiempo ya pasó mientras estaba oculta,
    performLogout() sin mostrar modal.
    -----------------------------------------------------
    */
    useEffect(() => {

        if (!enabled || !usuario) return undefined;

        const handleVisibilityChange = () => {

            if (document.visibilityState === "hidden") {

                clearAllTimers();

            } else if (document.visibilityState === "visible") {

                if (!expiresAtRef.current) {
                    // Sin expiresAt: el hook no estaba
                    // activo o ya cerró sesión.
                    return;
                }

                // Si el modal está abierto, el countdown
                // sigue siendo válido. Solo reprogramamos
                // el logoutTimer por si quedó desfasado.
                scheduleCountdown();
            }
        };

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };

    }, [enabled, usuario, clearAllTimers, scheduleCountdown]);

    /*
    -----------------------------------------------------
    Setup principal: timers + listeners de actividad
    -----------------------------------------------------
    */
    useEffect(() => {

        if (!enabled || !usuario) {

            clearAllTimers();
            expiresAtRef.current = null;
            setShowWarning(false);
            return undefined;
        }

        expiresAtRef.current = Date.now() + timeoutMs;
        setSecondsLeft(Math.ceil(warningMs / 1000));
        setShowWarning(false);
        scheduleCountdown();

        ACTIVITY_EVENTS.forEach((ev) => {
            window.addEventListener(
                ev,
                handleActivity,
                { passive: true }
            );
        });

        return () => {

            ACTIVITY_EVENTS.forEach((ev) => {
                window.removeEventListener(
                    ev,
                    handleActivity
                );
            });

            clearAllTimers();

        };

    }, [
        enabled,
        usuario,
        timeoutMs,
        warningMs,
        handleActivity,
        scheduleCountdown,
        clearAllTimers,
    ]);

    return {
        showWarning,
        secondsLeft,
        stayConnected,
    };
};
