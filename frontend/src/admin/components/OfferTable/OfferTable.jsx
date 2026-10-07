import { useEffect, useMemo, useState } from "react";
import {
    Search,
    Pencil,
    Trash2,
    Calendar,
    ArrowRight,
    ArrowUpDown,
    SlidersHorizontal,
    ChevronDown,
    CheckCircle2,
    Flag,
    Tag,
    X,
    AlertTriangle,
    RefreshCw,
    Sparkles
} from "lucide-react";

import {
    getOffers,
    deleteOffer,
    getCategories
} from "../../../services/adminService";

import { useToast } from "../Toast/ToastHost";
import "./OfferTable.css";

/* =====================================================
   HELPERS DE FORMATEO
   ===================================================== */
const formatearFechaCorta = (iso) => {
    if (!iso) return "—";
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return iso;

    return fecha.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};

const formatearDescuento = (oferta) => {
    const numero = Number(oferta.valor);
    if (Number.isNaN(numero)) return "—";

    if (oferta.tipo_descuento === "porcentaje") {
        return `${numero}%`;
    }

    return `$${Math.round(numero).toLocaleString("es-CO")}`;
};

const obtenerNombreProducto = (oferta) => {
    if (oferta.producto_detalle?.nombre) {
        return oferta.producto_detalle.nombre;
    }
    if (typeof oferta.producto === "string") {
        return oferta.producto;
    }
    if (oferta.producto?.nombre) {
        return oferta.producto.nombre;
    }
    if (oferta.producto_id) {
        return `Producto #${oferta.producto_id}`;
    }
    return "Todos los productos";
};

const obtenerSkuVariante = (oferta) => {
    if (oferta.variante_detalle?.sku) {
        return oferta.variante_detalle.sku;
    }
    if (oferta.producto && typeof oferta.producto === "object" && oferta.producto.sku) {
        return oferta.producto.sku;
    }
    if (oferta.sku) {
        return oferta.sku;
    }
    return null;
};

const nombresCategorias = (oferta) => {
    const detalle = Array.isArray(oferta.categorias_detalle)
        ? oferta.categorias_detalle
        : null;

    if (detalle && detalle.length > 0) {
        return detalle.map((c) => c?.nombre).filter(Boolean);
    }

    if (Array.isArray(oferta.categorias) && oferta.categorias.length > 0) {
        return oferta.categorias
            .map((c) => (typeof c === "string" ? c : c?.nombre))
            .filter(Boolean);
    }

    return [];
};

const obtenerEstadoVisual = (oferta) => {
    const ahora = new Date();
    const inicio = oferta.fecha_inicio ? new Date(oferta.fecha_inicio) : null;
    const fin = oferta.fecha_fin ? new Date(oferta.fecha_fin) : null;

    if (fin && !Number.isNaN(fin.getTime()) && ahora > fin) {
        return "finalizada";
    }

    if (inicio && !Number.isNaN(inicio.getTime()) && ahora < inicio) {
        return "programada";
    }

    if (oferta.activa) {
        return "activa";
    }

    return "finalizada";
};

const ESTADO_LABELS = {
    activa: "Activa",
    programada: "Programada",
    finalizada: "Finalizada"
};

/* =====================================================
   COMPONENTE PRINCIPAL
   ===================================================== */
function OfferTable({ refreshKey, onEdit, onNewOffer }) {
    const toast = useToast();

    const [ofertas, setOfertas] = useState([]);
    const [categoriasList, setCategoriasList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtros y ordenamiento
    const [busqueda, setBusqueda] = useState("");
    const [filtroCategoria, setFiltroCategoria] = useState("all");
    const [filtroEstado, setFiltroEstado] = useState("todas");
    const [sortBy, setSortBy] = useState("recientes");

    // Modal de confirmación para eliminar
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [offerToDelete, setOfferToDelete] = useState(null);

    // Cargar datos
    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [offerRes, catRes] = await Promise.all([
                getOffers(),
                getCategories().catch(() => ({ data: [] }))
            ]);

            const offersData = Array.isArray(offerRes.data)
                ? offerRes.data
                : offerRes.data?.results || [];

            const catsData = Array.isArray(catRes.data)
                ? catRes.data
                : catRes.data?.results || [];

            setOfertas(offersData);
            setCategoriasList(catsData);
            setError(null);
        } catch (err) {
            console.error("Error al cargar ofertas:", err);
            setError("No fue posible cargar las promociones y ofertas del servidor.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [refreshKey]);

    // Procesar ofertas con su estado visual
    const ofertasConEstado = useMemo(() => {
        return ofertas.map((oferta) => ({
            ...oferta,
            estadoVisual: obtenerEstadoVisual(oferta)
        }));
    }, [ofertas]);

    // Estadísticas para las 4 KPI Cards
    const kpiStats = useMemo(() => {
        const total = ofertasConEstado.length;
        const activas = ofertasConEstado.filter((o) => o.estadoVisual === "activa").length;
        const programadas = ofertasConEstado.filter((o) => o.estadoVisual === "programada").length;
        const finalizadas = ofertasConEstado.filter((o) => o.estadoVisual === "finalizada").length;

        return { total, activas, programadas, finalizadas };
    }, [ofertasConEstado]);

    // Filtrar y ordenar ofertas
    const ofertasFiltradas = useMemo(() => {
        const q = busqueda.toLowerCase().trim();

        let filtradas = ofertasConEstado.filter((oferta) => {
            const prodNombre = obtenerNombreProducto(oferta).toLowerCase();
            const offerNombre = (oferta.nombre || "").toLowerCase();
            const sku = (obtenerSkuVariante(oferta) || "").toLowerCase();

            // 1. Búsqueda por texto
            const matchBusqueda =
                !q ||
                offerNombre.includes(q) ||
                prodNombre.includes(q) ||
                sku.includes(q);

            // 2. Filtro por estado
            const matchEstado =
                filtroEstado === "todas" || oferta.estadoVisual === filtroEstado;

            // 3. Filtro por categoría
            let matchCategoria = true;
            if (filtroCategoria !== "all") {
                const cats = nombresCategorias(oferta);
                matchCategoria = cats.some(
                    (c) => c.toLowerCase() === filtroCategoria.toLowerCase()
                );
            }

            return matchBusqueda && matchEstado && matchCategoria;
        });

        // Ordenamiento
        const sorted = [...filtradas];
        if (sortBy === "nombre_asc") {
            sorted.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
        } else if (sortBy === "nombre_desc") {
            sorted.sort((a, b) => (b.nombre || "").localeCompare(a.nombre || ""));
        } else if (sortBy === "descuento_desc") {
            sorted.sort((a, b) => (Number(b.valor) || 0) - (Number(a.valor) || 0));
        } else if (sortBy === "descuento_asc") {
            sorted.sort((a, b) => (Number(a.valor) || 0) - (Number(b.valor) || 0));
        } else {
            // Recientes (por id descendente)
            sorted.sort((a, b) => (b.id_oferta || 0) - (a.id_oferta || 0));
        }

        return sorted;
    }, [ofertasConEstado, busqueda, filtroEstado, filtroCategoria, sortBy]);

    // Eliminar oferta
    const handleRequestDelete = (oferta) => {
        setOfferToDelete(oferta);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!offerToDelete) return;
        const { id_oferta, nombre } = offerToDelete;
        setDeleteModalOpen(false);
        setOfferToDelete(null);

        try {
            await deleteOffer(id_oferta);
            await cargarDatos();
            if (toast?.success) {
                toast.success(`La oferta "${nombre}" fue eliminada correctamente.`, {
                    title: "Oferta eliminada"
                });
            }
        } catch (err) {
            console.error(err);
            if (toast?.error) {
                toast.error("No fue posible eliminar la oferta.", {
                    title: "Error al eliminar"
                });
            } else {
                alert("No fue posible eliminar la oferta.");
            }
        }
    };

    if (loading) {
        return (
            <div className="offer-loading-container">
                <div className="offer-spinner" />
                <p>Cargando promociones y ofertas...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="offer-error-container">
                <AlertTriangle size={32} color="#dc2626" />
                <h3>Error al cargar</h3>
                <p>{error}</p>
                <button type="button" className="retry-btn" onClick={cargarDatos}>
                    <RefreshCw size={16} />
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="offers-panel-wrapper">
            {/* =========================================================
               1. ROW DE 4 KPI STAT CARDS
               ========================================================= */}
            <div className="offers-kpi-grid">
                {/* CARD 1: TOTAL OFERTAS */}
                <div
                    className={`offer-kpi-card purple ${
                        filtroEstado === "todas" ? "active-kpi" : ""
                    }`}
                    onClick={() => setFiltroEstado("todas")}
                    title="Ver todas las ofertas"
                >
                    <div className="kpi-left">
                        <div className="kpi-icon-squircle purple">
                            <Tag size={20} />
                        </div>
                        <div className="kpi-details">
                            <span className="kpi-title">Total ofertas</span>
                            <strong className="kpi-number">{kpiStats.total}</strong>
                            <span className="kpi-subtext">Promociones activas</span>
                        </div>
                    </div>
                    <ArrowRight size={18} className="kpi-arrow" />
                </div>

                {/* CARD 2: ACTIVAS */}
                <div
                    className={`offer-kpi-card green ${
                        filtroEstado === "activa" ? "active-kpi" : ""
                    }`}
                    onClick={() => setFiltroEstado("activa")}
                    title="Filtrar ofertas activas"
                >
                    <div className="kpi-left">
                        <div className="kpi-icon-squircle green">
                            <CheckCircle2 size={20} />
                        </div>
                        <div className="kpi-details">
                            <span className="kpi-title">Activas</span>
                            <strong className="kpi-number">{kpiStats.activas}</strong>
                            <span className="kpi-subtext">Ofertas en curso</span>
                        </div>
                    </div>
                    <ArrowRight size={18} className="kpi-arrow" />
                </div>

                {/* CARD 3: PROGRAMADAS */}
                <div
                    className={`offer-kpi-card blue ${
                        filtroEstado === "programada" ? "active-kpi" : ""
                    }`}
                    onClick={() => setFiltroEstado("programada")}
                    title="Filtrar ofertas programadas"
                >
                    <div className="kpi-left">
                        <div className="kpi-icon-squircle blue">
                            <Calendar size={20} />
                        </div>
                        <div className="kpi-details">
                            <span className="kpi-title">Programadas</span>
                            <strong className="kpi-number">{kpiStats.programadas}</strong>
                            <span className="kpi-subtext">Por iniciar</span>
                        </div>
                    </div>
                    <ArrowRight size={18} className="kpi-arrow" />
                </div>

                {/* CARD 4: FINALIZADAS */}
                <div
                    className={`offer-kpi-card rose ${
                        filtroEstado === "finalizada" ? "active-kpi" : ""
                    }`}
                    onClick={() => setFiltroEstado("finalizada")}
                    title="Filtrar ofertas finalizadas"
                >
                    <div className="kpi-left">
                        <div className="kpi-icon-squircle rose">
                            <Flag size={20} />
                        </div>
                        <div className="kpi-details">
                            <span className="kpi-title">Finalizadas</span>
                            <strong className="kpi-number">{kpiStats.finalizadas}</strong>
                            <span className="kpi-subtext">Sin vigencia</span>
                        </div>
                    </div>
                    <ArrowRight size={18} className="kpi-arrow" />
                </div>
            </div>

            {/* =========================================================
               2. CONTENEDOR PRINCIPAL BLANCO: TOOLBAR + TABLA
               ========================================================= */}
            <div className="offers-main-card">
                {/* TOOLBAR SUPERIOR */}
                <div className="offers-toolbar">
                    <div className="offers-search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar oferta por nombre o producto..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        {busqueda && (
                            <button
                                type="button"
                                className="search-clear-btn"
                                onClick={() => setBusqueda("")}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="offers-filter-actions">
                        {/* SELECTOR CATEGORÍAS */}
                        <div className="offer-select-wrap">
                            <select
                                value={filtroCategoria}
                                onChange={(e) => setFiltroCategoria(e.target.value)}
                                className="offer-select"
                            >
                                <option value="all">Todas las categorías</option>
                                {categoriasList.map((cat) => (
                                    <option key={cat.id_categoria} value={cat.nombre}>
                                        {cat.nombre}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="select-chevron" />
                        </div>

                        {/* SELECTOR ESTADOS */}
                        <div className="offer-select-wrap">
                            <select
                                value={filtroEstado}
                                onChange={(e) => setFiltroEstado(e.target.value)}
                                className="offer-select"
                            >
                                <option value="todas">Todos los estados</option>
                                <option value="activa">Activas</option>
                                <option value="programada">Programadas</option>
                                <option value="finalizada">Finalizadas</option>
                            </select>
                            <ChevronDown size={14} className="select-chevron" />
                        </div>

                        {/* SELECTOR ORDENAR POR */}
                        <div className="offer-select-wrap">
                            <ArrowUpDown size={14} className="sort-icon-prefix" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="offer-select with-prefix"
                            >
                                <option value="recientes">Ordenar por</option>
                                <option value="nombre_asc">Nombre (A-Z)</option>
                                <option value="nombre_desc">Nombre (Z-A)</option>
                                <option value="descuento_desc">Mayor descuento</option>
                                <option value="descuento_asc">Menor descuento</option>
                            </select>
                            <ChevronDown size={14} className="select-chevron" />
                        </div>

                        {/* BOTÓN FILTROS */}
                        <button
                            type="button"
                            className="offers-btn-filtros"
                            onClick={() => {
                                // Toggle entre todas o solo activas
                                setFiltroEstado((prev) => (prev === "activa" ? "todas" : "activa"));
                            }}
                            title="Opciones de filtro"
                        >
                            <SlidersHorizontal size={15} />
                            <span>Filtros</span>
                        </button>
                    </div>
                </div>

                {/* CABECERA DE LA TABLA */}
                <div className="offers-table-header">
                    <div className="col-offer">Oferta</div>
                    <div className="col-product">Producto</div>
                    <div className="col-categories">Categorías</div>
                    <div className="col-discount">Descuento</div>
                    <div className="col-period">Periodo</div>
                    <div className="col-status">Estado</div>
                    <div className="col-actions">Acciones</div>
                </div>

                {/* CUERPO DE LA TABLA O EMPTY STATE */}
                {ofertasFiltradas.length === 0 ? (
                    <div className="offers-empty-state">
                        <div className="empty-tag-illustration">
                            <Tag size={38} className="empty-tag-icon" />
                            <Sparkles size={16} className="sparkle sparkle-1" />
                            <Sparkles size={14} className="sparkle sparkle-2" />
                        </div>
                        <h4 className="empty-title">
                            No hay ofertas que coincidan con los filtros.
                        </h4>
                        <p className="empty-subtitle">
                            Intenta con otros criterios de búsqueda o crea una nueva oferta.
                        </p>
                    </div>
                ) : (
                    <div className="offers-table-body">
                        {ofertasFiltradas.map((oferta) => {
                            const productoNombre = obtenerNombreProducto(oferta);
                            const sku = obtenerSkuVariante(oferta);
                            const cats = nombresCategorias(oferta);
                            const estado = oferta.estadoVisual;

                            return (
                                <div key={oferta.id_oferta} className="offer-row">
                                    {/* COLUMNA 1: OFERTA */}
                                    <div className="col-offer offer-left-block">
                                        <div className="offer-tag-squircle">
                                            <span>%</span>
                                        </div>
                                        <div className="offer-titles">
                                            <span className="offer-name">{oferta.nombre}</span>
                                            <span className="offer-desc">
                                                {oferta.descripcion || "Promoción especial"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* COLUMNA 2: PRODUCTO */}
                                    <div className="col-product offer-product-block">
                                        <span className="product-title">{productoNombre}</span>
                                        <span className="product-subtext">
                                            {sku ? `Variante: ${sku}` : "Todas las variantes"}
                                        </span>
                                    </div>

                                    {/* COLUMNA 3: CATEGORÍAS */}
                                    <div className="col-categories offer-cat-block">
                                        {cats.length === 0 ? (
                                            <span className="cat-all-text">Todas las categorías</span>
                                        ) : (
                                            <div className="cat-pill-wrap">
                                                {cats.slice(0, 2).map((c, i) => (
                                                    <span key={i} className="offer-cat-pill">
                                                        {c}
                                                    </span>
                                                ))}
                                                {cats.length > 2 && (
                                                    <span className="offer-cat-pill more">
                                                        +{cats.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* COLUMNA 4: DESCUENTO */}
                                    <div className="col-discount offer-discount-block">
                                        <strong className="discount-number">
                                            {formatearDescuento(oferta)}
                                        </strong>
                                        <small className="discount-type">
                                            {oferta.tipo_descuento === "porcentaje"
                                                ? "Porcentaje"
                                                : "Valor fijo"}
                                        </small>
                                    </div>

                                    {/* COLUMNA 5: PERIODO */}
                                    <div className="col-period offer-period-block">
                                        <span className="period-dates">
                                            {formatearFechaCorta(oferta.fecha_inicio)} –{" "}
                                            {formatearFechaCorta(oferta.fecha_fin)}
                                        </span>
                                    </div>

                                    {/* COLUMNA 6: ESTADO */}
                                    <div className="col-status offer-status-block">
                                        <span className={`offer-status-badge ${estado}`}>
                                            <span className="status-dot" />
                                            {ESTADO_LABELS[estado] || "Activa"}
                                        </span>
                                    </div>

                                    {/* COLUMNA 7: ACCIONES */}
                                    <div className="col-actions offer-actions-block">
                                        <button
                                            type="button"
                                            className="offer-action-btn edit"
                                            onClick={() => onEdit(oferta)}
                                            title="Editar oferta"
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            className="offer-action-btn delete"
                                            onClick={() => handleRequestDelete(oferta)}
                                            title="Eliminar oferta"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* PAGINACIÓN INFERIOR */}
                <div className="offers-pagination-bar">
                    <span className="pagination-info-text">
                        Mostrando {ofertasFiltradas.length} de {ofertas.length} ofertas
                    </span>

                    <div className="pagination-nav-group">
                        <button type="button" className="pag-btn" disabled>
                            ‹
                        </button>
                        <button type="button" className="pag-btn active">
                            1
                        </button>
                        <button type="button" className="pag-btn" disabled>
                            ›
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
            {deleteModalOpen && offerToDelete && (
                <div
                    className="modal-overlay"
                    onClick={() => {
                        setDeleteModalOpen(false);
                        setOfferToDelete(null);
                    }}
                >
                    <div
                        className="offer-delete-modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-danger-header">
                            <div className="danger-icon-squircle">
                                <Trash2 size={22} />
                            </div>
                            <div>
                                <h3>Eliminar oferta</h3>
                                <p>Esta acción removerá el descuento del catálogo</p>
                            </div>
                            <button
                                type="button"
                                className="modal-close-icon"
                                onClick={() => {
                                    setDeleteModalOpen(false);
                                    setOfferToDelete(null);
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-danger-body">
                            <p className="warning-text">
                                ¿Estás seguro de que deseas eliminar la oferta{" "}
                                <strong>"{offerToDelete.nombre}"</strong>?
                            </p>
                            <div className="warning-banner">
                                <AlertTriangle size={18} />
                                <span>
                                    Los productos vinculados volverán a mostrarse con su precio regular sin
                                    este descuento aplicado.
                                </span>
                            </div>
                            <div className="modal-btn-row">
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => {
                                        setDeleteModalOpen(false);
                                        setOfferToDelete(null);
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="danger-btn"
                                    onClick={handleConfirmDelete}
                                >
                                    Sí, eliminar oferta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OfferTable;