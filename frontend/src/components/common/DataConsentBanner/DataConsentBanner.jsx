import { useState, useEffect } from "react";
import { ShieldCheck, ExternalLink, X, Check, Ban } from "lucide-react";
import "./DataConsentBanner.css";

const CONSENT_STORAGE_KEY = "miventa_data_consent";
const PRIVACY_PDF_URL = "/Legal/Politica%20de%20Privacidad.pdf";

function DataConsentBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        // Verificar si el usuario ya tomó una decisión previamente
        try {
            const savedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
            if (!savedConsent) {
                // Mostrar con un breve retardo para que la animación de entrada sea suave
                const timer = setTimeout(() => {
                    setIsVisible(true);
                }, 700);
                return () => clearTimeout(timer);
            }
        } catch (e) {
            console.warn("No se pudo acceder a localStorage:", e);
        }
    }, []);

    const handleAccept = () => {
        try {
            localStorage.setItem(CONSENT_STORAGE_KEY, "accepted");
        } catch (e) {
            console.warn("Error al guardar consentimiento:", e);
        }
        closeBanner();
    };

    const handleDecline = () => {
        try {
            localStorage.setItem(CONSENT_STORAGE_KEY, "declined");
        } catch (e) {
            console.warn("Error al guardar consentimiento:", e);
        }
        closeBanner();
    };

    const closeBanner = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsClosing(false);
        }, 300);
    };

    if (!isVisible) return null;

    return (
        <aside
            className={`data-consent-overlay ${isClosing ? "is-closing" : ""}`}
            role="region"
            aria-label="Aviso de privacidad y tratamiento de datos"
        >
            <div className="data-consent-card">
                {/* BOTÓN CERRAR RÁPIDO */}
                <button
                    type="button"
                    className="data-consent-close-btn"
                    onClick={closeBanner}
                    aria-label="Cerrar aviso"
                    title="Cerrar"
                >
                    <X size={18} />
                </button>

                <div className="data-consent-body">
                    {/* ICONO DESTACADO */}
                    <div className="data-consent-icon-box" aria-hidden="true">
                        <ShieldCheck size={26} strokeWidth={2.2} />
                    </div>

                    {/* CONTENIDO PRINCIPAL */}
                    <div className="data-consent-text-wrap">
                        <div className="data-consent-tag">
                            <span>Aviso Legal y Habeas Data</span>
                        </div>

                        <p className="data-consent-main-statement">
                            &ldquo;El cliente autoriza el tratamiento de sus datos conforme a la política
                            de privacidad publicada en{" "}
                            <span className="data-consent-domain">www.miVenta.co</span>.&rdquo;
                        </p>

                        <p className="data-consent-subtext">
                            Utilizamos cookies y tecnologías seguras para garantizar el correcto
                            funcionamiento de la tienda, procesar tus pedidos y brindarte una mejor
                            experiencia de compra según la Ley 1581 de 2012.{" "}
                            <a
                                href={PRIVACY_PDF_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="data-consent-pdf-link"
                                title="Abrir Política de Privacidad en PDF"
                            >
                                <span>Ver Política de Privacidad</span>
                                <ExternalLink size={12} />
                            </a>
                        </p>
                    </div>

                    {/* BOTONES DE DECISIÓN: ACEPTAR O RECHAZAR */}
                    <div className="data-consent-actions">
                        <button
                            type="button"
                            className="data-consent-btn data-consent-btn-accept"
                            onClick={handleAccept}
                            title="Aceptar y autorizar el tratamiento de datos"
                        >
                            <Check size={16} strokeWidth={2.4} />
                            <span>Aceptar</span>
                        </button>

                        <button
                            type="button"
                            className="data-consent-btn data-consent-btn-decline"
                            onClick={handleDecline}
                            title="Rechazar el tratamiento de datos no esenciales"
                        >
                            <Ban size={15} strokeWidth={2} />
                            <span>Rechazar</span>
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default DataConsentBanner;
