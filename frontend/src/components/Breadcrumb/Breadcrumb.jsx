import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import "./Breadcrumb.css";

/*
   ============================================================
   BREADCRUMB (migas de pan) — miVenta.co

   - items: array de { label, to? }
       · Si `to` existe, se renderiza como Link.
       · Si no, se renderiza como texto plano (último elemento).
   - Si `items` está vacío, no se renderiza nada.
   ============================================================
*/

function Breadcrumb({ items = [] }) {
    if (!items || items.length === 0) {
        return null;
    }

    return (
        <nav
            className="breadcrumb"
            aria-label="Ruta de navegación"
        >
            <Link
                to="/"
                className="breadcrumb-link breadcrumb-home"
            >
                Inicio
            </Link>

            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <span
                        key={`${item.label}-${index}`}
                        className="breadcrumb-segment"
                    >
                        <span className="breadcrumb-sep" aria-hidden="true">
                            <ChevronRight size={13} />
                        </span>

                        {item.to && !isLast ? (
                            <Link
                                to={item.to}
                                className="breadcrumb-link"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span
                                className={
                                    isLast
                                        ? "breadcrumb-current"
                                        : "breadcrumb-link"
                                }
                                aria-current={isLast ? "page" : undefined}
                            >
                                {item.label}
                            </span>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}

export default Breadcrumb;
