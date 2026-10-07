import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState
} from "react";
import { CheckCircle2, AlertTriangle, Info, X, AlertCircle } from "lucide-react";

import "./Toast.css";

/**
 * Sistema de notificaciones in-app para el panel admin.
 * Mantiene el mismo lenguaje visual del resto de la app
 * (palette cyan #0ea5b5) y reemplaza al alert() nativo del navegador.
 *
 * Uso:
 *   const toast = useToast();
 *   toast.success("Oferta guardada");
 *   toast.error("No fue posible guardar la oferta");
 *
 * Variantes disponibles: success, error, warning, info.
 */

const ToastContext = createContext(null);

let _id = 0;
const nextId = () => {
    _id += 1;
    return _id;
};

const ICONS = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
};

const DEFAULTS = {
    success: { title: "Listo", duration: 3000 },
    error: { title: "Error", duration: 4500 },
    warning: { title: "Atención", duration: 4000 },
    info: { title: "Información", duration: 3500 }
};

function ToastItem({ toast, onDismiss }) {
    const Icon = ICONS[toast.variant] || Info;

    return (
        <div
            className={`toast toast-${toast.variant} ${toast.leaving ? "is-leaving" : ""}`}
            role={toast.variant === "error" ? "alert" : "status"}
            aria-live={toast.variant === "error" ? "assertive" : "polite"}
        >
            <span className="toast-icon">
                <Icon size={18} strokeWidth={2.2} />
            </span>
            <div className="toast-body">
                {toast.title && <span className="toast-title">{toast.title}</span>}
                {toast.message && (
                    <span className="toast-message">{toast.message}</span>
                )}
            </div>
            <button
                type="button"
                className="toast-close"
                onClick={() => onDismiss(toast.id)}
                aria-label="Cerrar notificación"
            >
                <X size={14} strokeWidth={2.4} />
            </button>
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef(new Map());

    const dismiss = useCallback((id) => {
        // Marca como "leaving" para animar la salida y limpia al terminar.
        setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
        );
        const timeout = setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
            timersRef.current.delete(id);
        }, 220);
        timersRef.current.set(`leave-${id}`, timeout);
    }, []);

    const push = useCallback(
        (variant, message, options = {}) => {
            const id = nextId();
            const defaults = DEFAULTS[variant] || DEFAULTS.info;
            const item = {
                id,
                variant,
                title: options.title ?? defaults.title,
                message,
                duration: options.duration ?? defaults.duration,
                leaving: false
            };
            setToasts((prev) => [...prev, item]);
            if (item.duration > 0) {
                const timeout = setTimeout(() => dismiss(id), item.duration);
                timersRef.current.set(id, timeout);
            }
            return id;
        },
        [dismiss]
    );

    const api = useMemo(
        () => ({
            success: (message, options) => push("success", message, options),
            error: (message, options) => push("error", message, options),
            warning: (message, options) => push("warning", message, options),
            info: (message, options) => push("info", message, options),
            dismiss
        }),
        [push, dismiss]
    );

    // Limpia timers pendientes al desmontar para evitar fugas.
     
    useMemo(() => () => {
        timersRef.current.forEach((t) => clearTimeout(t));
        timersRef.current.clear();
    }, []);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="toast-container" aria-live="polite" aria-atomic="false">
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        // Si por error se usa fuera del provider, devuelve un fallback
        // basado en console para no romper la app, pero permite migrar
        // componentes poco a poco sin que fallen los imports.
        return {
            success: console.log,
            error: console.error,
            warning: console.warn,
            info: console.info,
            dismiss: () => {}
        };
    }
    return ctx;
}
