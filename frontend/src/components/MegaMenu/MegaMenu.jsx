import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, X, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./MegaMenu.css";

const itemHref = (slug, id) => {
    if (slug) return `/categoria/${slug}`;
    return `/categoria/${id}`;
};

const getChildren = (category) => {
    if (!category) return [];
    if (Array.isArray(category.subcategorias))
        return category.subcategorias.filter((i) => i?.estado !== "archivado");
    if (Array.isArray(category.hijos))
        return category.hijos.filter((i) => i?.estado !== "archivado");
    return [];
};

function MegaMenu({
    category = null,
    categories = [],
    anchorElement = null,
    onNavigate,
    isMore = false,
    onClose = null,
    isMobile = false,
}) {
    const menuRef = useRef(null);
    const [position, setPosition] = useState({ left: 16, top: 0 });

    // columna activa en el panel izquierdo
    const [activeColId, setActiveColId] = useState(null);

    const roots = useMemo(() => {
        if (category) return [category];
        return Array.isArray(categories) ? categories : [];
    }, [category, categories]);

    const columns = useMemo(() => {
        if (category) return getChildren(category);
        return roots;
    }, [category, roots]);

    // Solo resetea el panel activo si la columna actual ya no existe en la lista
    // (ej: cuando el usuario abre un megamenú de otra categoría)
    // NO resetea si el usuario está haciendo hover — eso causaba el bug de "se traba"
    useEffect(() => {
        if (columns.length === 0) return;
        const stillValid = columns.some(c => c.id_categoria === activeColId);
        if (!stillValid) {
            setActiveColId(columns[0].id_categoria);
        }
    }, [columns, activeColId]);

    const activeColumn = useMemo(
        () => columns.find((c) => c.id_categoria === activeColId) || columns[0],
        [columns, activeColId]
    );

    const activeChildren = useMemo(
        () => (activeColumn ? getChildren(activeColumn) : []),
        [activeColumn]
    );

    // Posicionamiento
    const updatePosition = () => {
        if (!anchorElement || !menuRef.current) return;
        const rect = anchorElement.getBoundingClientRect();
        const menuRect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const safeMargin = 16;
        const idealLeft = rect.left;
        const maxLeft = Math.max(safeMargin, viewportWidth - menuRect.width - safeMargin);
        const finalLeft = Math.min(Math.max(idealLeft, safeMargin), maxLeft);
        setPosition({ left: finalLeft, top: rect.bottom + 6 });
    };

    useLayoutEffect(() => {
        updatePosition();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchorElement, columns.length]);

    useEffect(() => {
        const handle = () => updatePosition();
        window.addEventListener("resize", handle);
        window.addEventListener("scroll", handle, true);
        return () => {
            window.removeEventListener("resize", handle);
            window.removeEventListener("scroll", handle, true);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchorElement]);

    if (!columns.length) return null;

    return (
        <div
            ref={menuRef}
            className={`mm-root ${isMore ? "mm-root--more" : ""} ${isMobile ? "mm-root--mobile" : ""}`}
            style={
                isMobile
                    ? {}
                    : { left: `${position.left}px`, top: `${position.top}px` }
            }
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Header móvil */}
            {isMobile && (
                <div className="mm-mobile-header">
                    <span>{category ? category.nombre : "Categorías"}</span>
                    <button onClick={onClose} aria-label="Cerrar">
                        <X size={20} />
                    </button>
                </div>
            )}

            <div className="mm-body">
                {/* ── PANEL IZQUIERDO: columnas como tabs ── */}
                <nav className="mm-sidebar">
                    {/* "Ver todo" de la categoría raíz */}
                    {category && (
                        <Link
                            to={itemHref(category.slug, category.id_categoria)}
                            className="mm-sidebar-all"
                            onClick={onNavigate}
                        >
                            Ver todo en {category.nombre}
                            <ArrowRight size={13} />
                        </Link>
                    )}

                    {columns.map((col) => (
                        <button
                            key={col.id_categoria}
                            className={`mm-sidebar-item ${
                                activeColId === col.id_categoria ? "active" : ""
                            }`}
                            onMouseEnter={() => setActiveColId(col.id_categoria)}
                            onClick={() => setActiveColId(col.id_categoria)}
                            aria-expanded={activeColId === col.id_categoria}
                        >
                            <span>{col.nombre}</span>
                            <ChevronRight size={14} className="mm-sidebar-arrow" />
                        </button>
                    ))}
                </nav>

                {/* ── PANEL DERECHO: hijos de la columna activa ── */}
                <div className="mm-content" key={activeColId}>
                    {activeColumn && (
                        <>
                            {/* Encabezado del panel */}
                            <div className="mm-content-header">
                                <Link
                                    to={itemHref(activeColumn.slug, activeColumn.id_categoria)}
                                    className="mm-content-title"
                                    onClick={onNavigate}
                                >
                                    {activeColumn.nombre}
                                    <ArrowRight size={15} />
                                </Link>
                                {activeChildren.length > 0 && (
                                    <span className="mm-content-count">
                                        {activeChildren.length} subcategorías
                                    </span>
                                )}
                            </div>

                            {/* Grid de hijos */}
                            {activeChildren.length > 0 ? (
                                <div className="mm-items-grid">
                                    {activeChildren.map((item) => (
                                        <Link
                                            key={item.id_categoria}
                                            to={itemHref(item.slug, item.id_categoria)}
                                            className="mm-item"
                                            onClick={onNavigate}
                                        >
                                            <span className="mm-item-dot" />
                                            <span className="mm-item-name">{item.nombre}</span>
                                            <ChevronRight size={13} className="mm-item-arrow" />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="mm-empty">
                                    <Link
                                        to={itemHref(activeColumn.slug, activeColumn.id_categoria)}
                                        className="mm-empty-link"
                                        onClick={onNavigate}
                                    >
                                        Ver todos los productos
                                        <ArrowRight size={14} />
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MegaMenu;