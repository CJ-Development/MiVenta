import { Clock, ShieldCheck } from "lucide-react";

import "./InactivityModal.css";

/*
=====================================================
 MODAL DE INACTIVIDAD
=====================================================
Se muestra cuando el usuario está a punto de ser
desconectado por inactividad. Ofrece un botón para
permanecer conectado y reinicia el temporizador.

Props:
  - open: boolean
  - secondsLeft: número entero (cuenta regresiva)
  - onStay: callback al pulsar "Seguir conectado"
=====================================================
*/

const InactivityModal = ({
    open,
    secondsLeft,
    onStay,
}) => {

    if (!open) return null;

    return (
        <div
            className="inactivity-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inactivity-title"
        >
            <div className="inactivity-modal">

                <div className="inactivity-icon">
                    <Clock size={36} />
                </div>

                <h2 id="inactivity-title">
                    ¿Sigues ahí?
                </h2>

                <p>
                    Por tu seguridad cerraremos tu sesión
                    en <strong>{secondsLeft}</strong>{" "}
                    {secondsLeft === 1
                        ? "segundo"
                        : "segundos"}{" "}
                    si no detectamos actividad.
                </p>

                <div className="inactions">
                    <button
                        type="button"
                        className="inaction-primary"
                        onClick={onStay}
                        autoFocus
                    >
                        <ShieldCheck size={18} />
                        Seguir conectado
                    </button>
                </div>

            </div>
        </div>
    );
};

export default InactivityModal;
