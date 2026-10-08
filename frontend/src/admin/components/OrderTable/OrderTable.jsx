import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
    AlertCircle,
    AlertTriangle,
    Banknote,
    Calendar,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    CreditCard,
    Eye,
    Filter,
    Landmark,
    MessageCircle,
    Package,
    Pencil,
    Search,
    SlidersHorizontal,
    Sparkles,
    Trash2,
    Truck,
    Wallet,
    X,
    XCircle
} from "lucide-react";

import "./OrderTable.css";
import {
    getOrders,
    updateOrderStatus,
    deleteOrder,
    createOrder
} from "../../../services/adminService";
import { useToast } from "../Toast/ToastHost";

/* =====================================================
   UTILIDADES DE FORMATEO Y ESTADOS
   ===================================================== */

const formatearPesos = (valor) => {
    const numero = Number(valor);
    if (Number.isNaN(numero)) {
        return "$0";
    }
    return `$${numero.toLocaleString("es-CO")}`;
};

const formatearCodigoPedido = (id) => {
    const numero = Number(id);
    if (Number.isNaN(numero)) {
        return `#${id}`;
    }
    return `#MVC-${String(numero).padStart(5, "0")}`;
};

const formatearFechaHora = (iso) => {
    if (!iso) return { fecha: "—", hora: "" };
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return { fecha: iso, hora: "" };

    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const anio = date.getFullYear();
    const fecha = `${dia}/${mes}/${anio}`;

    let horas = date.getHours();
    const minutos = String(date.getMinutes()).padStart(2, "0");
    const ampm = horas >= 12 ? "p. m." : "a. m.";
    horas = horas % 12;
    horas = horas ? horas : 12;
    const hora = `${String(horas).padStart(2, "0")}:${minutos} ${ampm}`;

    return { fecha, hora };
};

const normalizarEstado = (estadoRaw) => {
    const est = String(estadoRaw || "").toLowerCase().trim();
    if (est === "pendiente") return "pendiente";
    if (est === "entregado") return "entregado";
    if (est === "cancelado") return "cancelado";
    if (["en proceso", "en_proceso", "pagado", "enviado"].includes(est)) {
        return "en_proceso";
    }
    return "pendiente";
};

const getDetalleEstado = (estadoRaw) => {
    const norm = normalizarEstado(estadoRaw);
    switch (norm) {
        case "pendiente":
            return {
                label: "Pendiente",
                className: "status-pill--pendiente",
                dotColor: "#f59e0b"
            };
        case "en_proceso":
            return {
                label: "En proceso",
                className: "status-pill--proceso",
                dotColor: "#3b82f6"
            };
        case "entregado":
            return {
                label: "Entregado",
                className: "status-pill--entregado",
                dotColor: "#22c55e"
            };
        case "cancelado":
            return {
                label: "Cancelado",
                className: "status-pill--cancelado",
                dotColor: "#ef4444"
            };
        default:
            return {
                label: "Pendiente",
                className: "status-pill--pendiente",
                dotColor: "#f59e0b"
            };
    }
};

const obtenerInfoMetodoPago = (pedido) => {
    const tipo =
        pedido?.metodo_pago_info?.tipo ||
        pedido?.metodo_pago_tipo ||
        (typeof pedido?.metodo_pago === "object" ? pedido?.metodo_pago?.tipo : String(pedido?.metodo_pago || ""));
    const detalle =
        pedido?.metodo_pago_info?.detalle ||
        (typeof pedido?.metodo_pago === "object" ? pedido?.metodo_pago?.detalle : "");

    const lowerTipo = (tipo || "").toLowerCase();
    const lowerDet = (detalle || "").toLowerCase();

    if (
        lowerTipo.includes("tarjeta") ||
        lowerTipo.includes("wompi") ||
        lowerTipo.includes("credito") ||
        lowerTipo.includes("debito")
    ) {
        return {
            icono: CreditCard,
            titulo: "Tarjeta de crédito",
            subtitulo: detalle || "Wompi"
        };
    }
    if (
        lowerTipo.includes("transferencia") ||
        lowerTipo.includes("banco") ||
        lowerTipo.includes("bancolombia") ||
        lowerTipo.includes("daviplata") ||
        lowerTipo.includes("pse")
    ) {
        return {
            icono: Landmark,
            titulo: "Transferencia bancaria",
            subtitulo: detalle || "Manual"
        };
    }
    if (
        lowerTipo.includes("efectivo") ||
        lowerTipo.includes("contra entrega") ||
        lowerTipo.includes("contraentrega")
    ) {
        return {
            icono: Banknote,
            titulo: "Efectivo",
            subtitulo: detalle || "Contra entrega"
        };
    }
    if (lowerTipo.includes("whatsapp")) {
        return {
            icono: MessageCircle,
            titulo: "WhatsApp",
            subtitulo: detalle || "Directo"
        };
    }

    return {
        icono: CreditCard,
        titulo: tipo || "Tarjeta de crédito",
        subtitulo: detalle || "Manual"
    };
};

/* =====================================================
   COMPONENTE PRINCIPAL
   ===================================================== */

function OrderTable({
    refreshKey,
    onAction,
    openNewOrderModal,
    onCloseNewOrder
}) {
    const toast = useToast?.();

    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtros principales
    const [activeCardFilter, setActiveCardFilter] = useState("all");
    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("");
    const [filtroRangoFecha, setFiltroRangoFecha] = useState("");

    // Selección múltiple
    const [selectedIds, setSelectedIds] = useState([]);

    // Modales
    const [detallePedido, setDetallePedido] = useState(null);
    const [orderToEditStatus, setOrderToEditStatus] = useState(null);
    const [nuevoEstadoSeleccionado, setNuevoEstadoSeleccionado] = useState("pendiente");
    const [orderToDelete, setOrderToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Formulario de nuevo pedido manual
    const [newOrderForm, setNewOrderForm] = useState({
        nombre_cliente: "",
        telefono_contacto: "",
        total: "",
        estado_compra: "pendiente",
        metodo_pago: 1
    });
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);

    // Paginación (6 por página como en el mockup)
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 6;

    // Cargar pedidos desde API
    const cargarPedidos = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data } = await getOrders();
            setPedidos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error cargando pedidos:", err);
            setError("No fue posible cargar los pedidos de la tienda.");
            setPedidos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarPedidos();
    }, [refreshKey]);

    // Métricas para las 5 tarjetas KPI
    const metrics = useMemo(() => {
        const total = pedidos.length;
        let pendientes = 0;
        let enProceso = 0;
        let entregados = 0;
        let cancelados = 0;

        pedidos.forEach((p) => {
            const estadoNorm = normalizarEstado(p.estado_compra);
            if (estadoNorm === "pendiente") pendientes += 1;
            else if (estadoNorm === "en_proceso") enProceso += 1;
            else if (estadoNorm === "entregado") entregados += 1;
            else if (estadoNorm === "cancelado") cancelados += 1;
        });

        return {
            total,
            pendientes,
            enProceso,
            entregados,
            cancelados
        };
    }, [pedidos]);

    // Filtrado de pedidos
    const pedidosFiltrados = useMemo(() => {
        return pedidos.filter((pedido) => {
            const estadoNorm = normalizarEstado(pedido.estado_compra);

            // Filtro por tarjeta activa
            if (activeCardFilter === "pendiente" && estadoNorm !== "pendiente") return false;
            if (activeCardFilter === "en_proceso" && estadoNorm !== "en_proceso") return false;
            if (activeCardFilter === "entregado" && estadoNorm !== "entregado") return false;
            if (activeCardFilter === "cancelado" && estadoNorm !== "cancelado") return false;

            // Filtro por selector de estado
            if (filtroEstado) {
                if (filtroEstado === "pendiente" && estadoNorm !== "pendiente") return false;
                if (filtroEstado === "en_proceso" && estadoNorm !== "en_proceso") return false;
                if (filtroEstado === "entregado" && estadoNorm !== "entregado") return false;
                if (filtroEstado === "cancelado" && estadoNorm !== "cancelado") return false;
            }

            // Filtro por rango de fechas
            if (filtroRangoFecha && pedido.fecha_compra) {
                const fechaPedido = new Date(pedido.fecha_compra);
                const ahora = new Date();
                if (filtroRangoFecha === "hoy") {
                    if (fechaPedido.toDateString() !== ahora.toDateString()) return false;
                } else if (filtroRangoFecha === "7dias") {
                    const limite = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (fechaPedido < limite) return false;
                } else if (filtroRangoFecha === "30dias") {
                    const limite = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
                    if (fechaPedido < limite) return false;
                } else if (filtroRangoFecha === "mes") {
                    if (
                        fechaPedido.getMonth() !== ahora.getMonth() ||
                        fechaPedido.getFullYear() !== ahora.getFullYear()
                    ) {
                        return false;
                    }
                }
            }

            // Filtro por texto de búsqueda
            if (busqueda.trim()) {
                const term = busqueda.trim().toLowerCase();
                const codigo = formatearCodigoPedido(pedido.id_compra).toLowerCase();
                const idRaw = String(pedido.id_compra).toLowerCase();

                const nombreCliente = pedido.usuario_info
                    ? `${pedido.usuario_info.nombres || ""} ${pedido.usuario_info.apellidos || ""}`.toLowerCase()
                    : (pedido.nombre_cliente || "").toLowerCase();

                const emailCliente = (pedido.usuario_info?.email || "").toLowerCase();
                const telefono = (pedido.telefono_contacto || "").toLowerCase();

                // Buscar dentro de los productos del pedido
                let productosTexto = "";
                if (Array.isArray(pedido.detalles)) {
                    productosTexto = pedido.detalles
                        .map((d) => `${d.producto_nombre || ""} ${d.variante_info || ""}`)
                        .join(" ")
                        .toLowerCase();
                }

                const coincide =
                    codigo.includes(term) ||
                    idRaw.includes(term) ||
                    nombreCliente.includes(term) ||
                    emailCliente.includes(term) ||
                    telefono.includes(term) ||
                    productosTexto.includes(term);

                if (!coincide) return false;
            }

            return true;
        });
    }, [
        pedidos,
        activeCardFilter,
        filtroEstado,
        filtroRangoFecha,
        busqueda
    ]);

    // Resetea a página 1 al cambiar filtros
    useEffect(() => {
        setPaginaActual(1);
    }, [
        activeCardFilter,
        busqueda,
        filtroEstado,
        filtroRangoFecha
    ]);

    // Paginación
    const totalPaginas = Math.ceil(pedidosFiltrados.length / elementosPorPagina) || 1;
    const pedidosPaginados = useMemo(() => {
        const start = (paginaActual - 1) * elementosPorPagina;
        return pedidosFiltrados.slice(start, start + elementosPorPagina);
    }, [pedidosFiltrados, paginaActual, elementosPorPagina]);

    // Manejo de selecciones
    const allOnPageSelected =
        pedidosPaginados.length > 0 &&
        pedidosPaginados.every((p) => selectedIds.includes(p.id_compra));

    const toggleSelectAll = () => {
        if (allOnPageSelected) {
            setSelectedIds((prev) =>
                prev.filter((id) => !pedidosPaginados.some((p) => p.id_compra === id))
            );
        } else {
            const pageIds = pedidosPaginados.map((p) => p.id_compra);
            setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
        }
    };

    const toggleSelectRow = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    // Manejo de clicks en tarjetas KPI
    const handleCardFilterClick = (filterType) => {
        if (activeCardFilter === filterType) {
            setActiveCardFilter("all");
            setFiltroEstado("");
        } else {
            setActiveCardFilter(filterType);
            setFiltroEstado(filterType === "all" ? "" : filterType);
        }
    };

    // Limpiar todos los filtros
    const handleClearFilters = () => {
        setActiveCardFilter("all");
        setBusqueda("");
        setFiltroEstado("");
        setFiltroRangoFecha("");
    };

    const hasActiveFilters =
        activeCardFilter !== "all" ||
        busqueda.trim() !== "" ||
        filtroEstado !== "" ||
        filtroRangoFecha !== "";

    // Guardar nuevo estado de un pedido
    const handleGuardarEstado = async () => {
        if (!orderToEditStatus) return;
        try {
            setIsUpdatingStatus(true);
            // El backend acepta 'enviado' o 'pagado' para en_proceso
            const estadoParaBackend =
                nuevoEstadoSeleccionado === "en_proceso"
                    ? "enviado"
                    : nuevoEstadoSeleccionado;

            await updateOrderStatus(orderToEditStatus.id_compra, {
                estado_compra: estadoParaBackend
            });

            // Actualizar localmente
            setPedidos((prev) =>
                prev.map((p) =>
                    p.id_compra === orderToEditStatus.id_compra
                        ? { ...p, estado_compra: estadoParaBackend }
                        : p
                )
            );

            if (detallePedido && detallePedido.id_compra === orderToEditStatus.id_compra) {
                setDetallePedido((prev) => ({
                    ...prev,
                    estado_compra: estadoParaBackend
                }));
            }

            toast?.success?.("Estado del pedido actualizado correctamente");
            setOrderToEditStatus(null);
            if (onAction) onAction();
        } catch (err) {
            console.error("Error al actualizar estado:", err);
            toast?.error?.("No fue posible actualizar el estado del pedido");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Eliminar pedido
    const handleConfirmDelete = async () => {
        if (!orderToDelete) return;
        try {
            setIsDeleting(true);
            await deleteOrder(orderToDelete.id_compra);

            setPedidos((prev) =>
                prev.filter((p) => p.id_compra !== orderToDelete.id_compra)
            );
            setSelectedIds((prev) =>
                prev.filter((id) => id !== orderToDelete.id_compra)
            );

            if (detallePedido && detallePedido.id_compra === orderToDelete.id_compra) {
                setDetallePedido(null);
            }

            toast?.success?.("Pedido eliminado exitosamente");
            setOrderToDelete(null);
            if (onAction) onAction();
        } catch (err) {
            console.error("Error al eliminar pedido:", err);
            toast?.error?.("No fue posible eliminar el pedido");
        } finally {
            setIsDeleting(false);
        }
    };

    // Crear pedido manual
    const handleCreateOrderSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsCreatingOrder(true);
            const payload = {
                nombre_cliente: newOrderForm.nombre_cliente || "Cliente manual",
                telefono_contacto: newOrderForm.telefono_contacto || "",
                total: parseFloat(newOrderForm.total) || 0,
                estado_compra:
                    newOrderForm.estado_compra === "en_proceso"
                        ? "enviado"
                        : newOrderForm.estado_compra,
                metodo_pago: parseInt(newOrderForm.metodo_pago) || 1
            };

            await createOrder(payload);
            toast?.success?.("Pedido creado con éxito");
            if (onCloseNewOrder) onCloseNewOrder();
            cargarPedidos();
            if (onAction) onAction();
        } catch (err) {
            console.error("Error al registrar pedido:", err);
            toast?.error?.("No fue posible registrar el nuevo pedido");
        } finally {
            setIsCreatingOrder(false);
        }
    };

    return (
        <div className="orders-module-container">
            {/* =====================================================
                5 TARJETAS KPI (ESTADÍSTICAS DEL MOCKUP)
                ===================================================== */}
            <div className="orders-kpi-grid">
                {/* 1. TOTAL PEDIDOS */}
                <div
                    className={`order-kpi-card kpi--total ${activeCardFilter === "all" && hasActiveFilters ? "" : activeCardFilter === "all" ? "kpi--active" : ""}`}
                    onClick={() => handleCardFilterClick("all")}
                    role="button"
                    tabIndex={0}
                >
                    <div className="kpi-main-row">
                        <div className="kpi-icon-squircle icon--purple">
                            <Package size={20} color="#7c3aed" />
                        </div>
                        <div className="kpi-info">
                            <span className="kpi-label">Total pedidos</span>
                            <div className="kpi-value">{metrics.total}</div>
                            <span className="kpi-subtitle">Todos los pedidos</span>
                        </div>
                    </div>
                    <div className="kpi-arrow">
                        <ChevronRight size={18} />
                    </div>
                </div>

                {/* 2. PENDIENTES */}
                <div
                    className={`order-kpi-card kpi--pendientes ${activeCardFilter === "pendiente" ? "kpi--active" : ""}`}
                    onClick={() => handleCardFilterClick("pendiente")}
                    role="button"
                    tabIndex={0}
                >
                    <div className="kpi-main-row">
                        <div className="kpi-icon-squircle icon--amber">
                            <Clock size={20} color="#d97706" />
                        </div>
                        <div className="kpi-info">
                            <span className="kpi-label">Pendientes</span>
                            <div className="kpi-value">{metrics.pendientes}</div>
                            <span className="kpi-subtitle">En espera de confirmación</span>
                        </div>
                    </div>
                    <div className="kpi-arrow">
                        <ChevronRight size={18} />
                    </div>
                </div>

                {/* 3. EN PROCESO */}
                <div
                    className={`order-kpi-card kpi--proceso ${activeCardFilter === "en_proceso" ? "kpi--active" : ""}`}
                    onClick={() => handleCardFilterClick("en_proceso")}
                    role="button"
                    tabIndex={0}
                >
                    <div className="kpi-main-row">
                        <div className="kpi-icon-squircle icon--blue">
                            <Truck size={20} color="#2563eb" />
                        </div>
                        <div className="kpi-info">
                            <span className="kpi-label">En proceso</span>
                            <div className="kpi-value">{metrics.enProceso}</div>
                            <span className="kpi-subtitle">En preparación o envío</span>
                        </div>
                    </div>
                    <div className="kpi-arrow">
                        <ChevronRight size={18} />
                    </div>
                </div>

                {/* 4. ENTREGADOS */}
                <div
                    className={`order-kpi-card kpi--entregados ${activeCardFilter === "entregado" ? "kpi--active" : ""}`}
                    onClick={() => handleCardFilterClick("entregado")}
                    role="button"
                    tabIndex={0}
                >
                    <div className="kpi-main-row">
                        <div className="kpi-icon-squircle icon--green">
                            <CheckCircle2 size={20} color="#16a34a" />
                        </div>
                        <div className="kpi-info">
                            <span className="kpi-label">Entregados</span>
                            <div className="kpi-value">{metrics.entregados}</div>
                            <span className="kpi-subtitle">Completados</span>
                        </div>
                    </div>
                    <div className="kpi-arrow">
                        <ChevronRight size={18} />
                    </div>
                </div>

                {/* 5. CANCELADOS */}
                <div
                    className={`order-kpi-card kpi--cancelados ${activeCardFilter === "cancelado" ? "kpi--active" : ""}`}
                    onClick={() => handleCardFilterClick("cancelado")}
                    role="button"
                    tabIndex={0}
                >
                    <div className="kpi-main-row">
                        <div className="kpi-icon-squircle icon--rose">
                            <XCircle size={20} color="#e11d48" />
                        </div>
                        <div className="kpi-info">
                            <span className="kpi-label">Cancelados</span>
                            <div className="kpi-value">{metrics.cancelados}</div>
                            <span className="kpi-subtitle">No completados</span>
                        </div>
                    </div>
                    <div className="kpi-arrow">
                        <ChevronRight size={18} />
                    </div>
                </div>
            </div>

            {/* =====================================================
                CONTENEDOR BLANCO PRINCIPAL (TABLA Y FILTROS)
                ===================================================== */}
            <div className="orders-table-card">
                {/* BARRA DE HERRAMIENTAS / FILTROS */}
                <div className="orders-toolbar-wrapper">
                    {/* Búsqueda */}
                    <div className="orders-search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar por # de pedido, cliente o producto..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        {busqueda && (
                            <button
                                type="button"
                                className="search-clear-btn"
                                onClick={() => setBusqueda("")}
                                title="Borrar búsqueda"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    {/* Controles de filtro a la derecha */}
                    <div className="orders-filter-controls">
                        {/* 1. Selector de Estado */}
                        <div className="filter-select-wrapper">
                            <select
                                value={filtroEstado}
                                onChange={(e) => {
                                    setFiltroEstado(e.target.value);
                                    setActiveCardFilter(e.target.value || "all");
                                }}
                            >
                                <option value="">Todos los estados</option>
                                <option value="pendiente">Pendientes</option>
                                <option value="en_proceso">En proceso</option>
                                <option value="entregado">Entregados</option>
                                <option value="cancelado">Cancelados</option>
                            </select>
                        </div>

                        {/* 2. Selector Rango de Fechas */}
                        <div className="filter-select-wrapper select-date-range">
                            <Calendar size={16} className="date-icon" />
                            <select
                                value={filtroRangoFecha}
                                onChange={(e) => setFiltroRangoFecha(e.target.value)}
                            >
                                <option value="">Rango de fechas</option>
                                <option value="hoy">Hoy</option>
                                <option value="7dias">Últimos 7 días</option>
                                <option value="30dias">Últimos 30 días</option>
                                <option value="mes">Este mes</option>
                            </select>
                        </div>

                        {/* 4. Botón Filtros (Reset / Activo) */}
                        <button
                            type="button"
                            className={`orders-filters-btn ${hasActiveFilters ? "btn-filters-active" : ""}`}
                            onClick={handleClearFilters}
                            title={hasActiveFilters ? "Limpiar todos los filtros" : "Filtros"}
                        >
                            <SlidersHorizontal size={16} />
                            <span>Filtros</span>
                            {hasActiveFilters && <span className="filters-badge" />}
                        </button>
                    </div>
                </div>

                {/* TABLA DE DATOS */}
                <div className="orders-table-responsive-wrapper">
                    <table className="orders-table-element">
                        <thead>
                            <tr>
                                <th className="th-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={allOnPageSelected}
                                        onChange={toggleSelectAll}
                                        aria-label="Seleccionar todos los pedidos"
                                    />
                                </th>
                                <th className="th-id"># Pedido</th>
                                <th className="th-client">Cliente</th>
                                <th className="th-date">Fecha</th>
                                <th className="th-total">Total</th>
                                <th className="th-payment">Método de pago</th>
                                <th className="th-status">Estado</th>
                                <th className="th-actions">Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="orders-table-loading-cell">
                                        <div className="loading-spinner" />
                                        <span>Cargando pedidos...</span>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="8" className="orders-table-error-cell">
                                        <AlertTriangle size={24} color="#ef4444" />
                                        <span>{error}</span>
                                        <button
                                            type="button"
                                            onClick={cargarPedidos}
                                            className="btn-retry"
                                        >
                                            Reintentar
                                        </button>
                                    </td>
                                </tr>
                            ) : pedidosPaginados.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="orders-empty-state-cell">
                                        <div className="orders-empty-state-content">
                                            <div className="empty-state-illustration">
                                                <div className="empty-squircle-icon">
                                                    <Package size={34} color="#6A2CA0" />
                                                    <Sparkles size={16} className="sparkle-top" />
                                                    <Sparkles size={14} className="sparkle-bottom" />
                                                </div>
                                            </div>
                                            <h3 className="empty-state-title">
                                                No hay pedidos que coincidan con los filtros.
                                            </h3>
                                            <p className="empty-state-description">
                                                Intenta con otros criterios de búsqueda o registra un nuevo pedido.
                                            </p>
                                            {hasActiveFilters && (
                                                <button
                                                    type="button"
                                                    className="empty-state-clear-btn"
                                                    onClick={handleClearFilters}
                                                >
                                                    Limpiar filtros
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                pedidosPaginados.map((pedido) => {
                                    const id = pedido.id_compra;
                                    const codigoFormateado = formatearCodigoPedido(id);
                                    const isSelected = selectedIds.includes(id);

                                    // Cliente
                                    const nombreCliente = pedido.usuario_info
                                        ? `${pedido.usuario_info.nombres || ""} ${pedido.usuario_info.apellidos || ""}`.trim()
                                        : pedido.nombre_cliente || "Cliente";

                                    const emailCliente =
                                        pedido.usuario_info?.email ||
                                        pedido.telefono_contacto ||
                                        "Sin email registrado";

                                    // Fecha y hora
                                    const { fecha, hora } = formatearFechaHora(pedido.fecha_compra);

                                    // Método de pago
                                    const metodoInfo = obtenerInfoMetodoPago(pedido);
                                    const MetodoIcon = metodoInfo.icono;

                                    // Estado
                                    const estadoInfo = getDetalleEstado(pedido.estado_compra);

                                    return (
                                        <tr
                                            key={id}
                                            className={`orders-table-row ${isSelected ? "row-selected" : ""}`}
                                        >
                                            {/* Checkbox */}
                                            <td className="td-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectRow(id)}
                                                    aria-label={`Seleccionar pedido ${codigoFormateado}`}
                                                />
                                            </td>

                                            {/* # Pedido */}
                                            <td className="td-id">
                                                <span
                                                    className="order-code-badge"
                                                    onClick={() => setDetallePedido(pedido)}
                                                    title="Ver detalle del pedido"
                                                >
                                                    {codigoFormateado}
                                                </span>
                                            </td>

                                            {/* Cliente */}
                                            <td className="td-client">
                                                <div className="client-info-block">
                                                    <span className="client-name">{nombreCliente}</span>
                                                    <span className="client-email">{emailCliente}</span>
                                                </div>
                                            </td>

                                            {/* Fecha */}
                                            <td className="td-date">
                                                <div className="date-info-block">
                                                    <span className="date-day">{fecha}</span>
                                                    <span className="date-time">{hora}</span>
                                                </div>
                                            </td>

                                            {/* Total */}
                                            <td className="td-total">
                                                <span className="order-total-price">
                                                    {formatearPesos(pedido.total)}
                                                </span>
                                            </td>

                                            {/* Método de pago */}
                                            <td className="td-payment">
                                                <div className="payment-info-block">
                                                    <div className="payment-icon-squircle">
                                                        <MetodoIcon size={16} />
                                                    </div>
                                                    <div className="payment-texts">
                                                        <span className="payment-title">
                                                            {metodoInfo.titulo}
                                                        </span>
                                                        <span className="payment-subtitle">
                                                            {metodoInfo.subtitulo}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Estado */}
                                            <td className="td-status">
                                                <span
                                                    className={`order-status-pill ${estadoInfo.className}`}
                                                    onClick={() => {
                                                        setOrderToEditStatus(pedido);
                                                        setNuevoEstadoSeleccionado(
                                                            normalizarEstado(pedido.estado_compra)
                                                        );
                                                    }}
                                                    title="Clic para cambiar estado"
                                                >
                                                    <span
                                                        className="status-bullet"
                                                        style={{ backgroundColor: estadoInfo.dotColor }}
                                                    />
                                                    {estadoInfo.label}
                                                </span>
                                            </td>

                                            {/* Acciones */}
                                            <td className="td-actions">
                                                <div className="order-actions-group">
                                                    {/* 1. Ver detalle */}
                                                    <button
                                                        type="button"
                                                        className="order-action-icon-btn btn-view"
                                                        onClick={() => setDetallePedido(pedido)}
                                                        title="Ver detalle completo"
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    {/* 2. Editar estado */}
                                                    <button
                                                        type="button"
                                                        className="order-action-icon-btn btn-edit"
                                                        onClick={() => {
                                                            setOrderToEditStatus(pedido);
                                                            setNuevoEstadoSeleccionado(
                                                                normalizarEstado(pedido.estado_compra)
                                                            );
                                                        }}
                                                        title="Cambiar estado"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>

                                                    {/* 3. Eliminar */}
                                                    <button
                                                        type="button"
                                                        className="order-action-icon-btn btn-delete"
                                                        onClick={() => setOrderToDelete(pedido)}
                                                        title="Eliminar pedido"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN INFERIOR */}
                <div className="orders-pagination-bar">
                    <span className="orders-pagination-info">
                        Mostrando {pedidosPaginados.length} de {pedidosFiltrados.length} pedidos
                    </span>

                    <div className="orders-pagination-controls">
                        <button
                            type="button"
                            className="pagination-btn pagination-arrow"
                            disabled={paginaActual <= 1}
                            onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
                            title="Página anterior"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                            <button
                                key={num}
                                type="button"
                                className={`pagination-btn pagination-number ${paginaActual === num ? "pagination-active" : ""}`}
                                onClick={() => setPaginaActual(num)}
                            >
                                {num}
                            </button>
                        ))}

                        <button
                            type="button"
                            className="pagination-btn pagination-arrow"
                            disabled={paginaActual >= totalPaginas}
                            onClick={() =>
                                setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))
                            }
                            title="Página siguiente"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* =====================================================
                MODAL 1: DETALLE DEL PEDIDO
                ===================================================== */}
            {detallePedido &&
                createPortal(
                    <div
                        className="orders-modal-overlay"
                        onClick={() => setDetallePedido(null)}
                    >
                        <div
                            className="orders-modal-card modal-detail"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="orders-modal-header">
                                <div className="modal-header-left">
                                    <div className="modal-header-icon">
                                        <Package size={22} color="#6A2CA0" />
                                    </div>
                                    <div>
                                        <div className="modal-title-row">
                                            <h2>
                                                Pedido {formatearCodigoPedido(detallePedido.id_compra)}
                                            </h2>
                                            <span
                                                className={`order-status-pill ${getDetalleEstado(detallePedido.estado_compra).className}`}
                                            >
                                                <span
                                                    className="status-bullet"
                                                    style={{
                                                        backgroundColor: getDetalleEstado(
                                                            detallePedido.estado_compra
                                                        ).dotColor
                                                    }}
                                                />
                                                {getDetalleEstado(detallePedido.estado_compra).label}
                                            </span>
                                        </div>
                                        <p className="modal-subtitle">
                                            Fecha: {formatearFechaHora(detallePedido.fecha_compra).fecha} ·{" "}
                                            {formatearFechaHora(detallePedido.fecha_compra).hora}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="modal-close-btn"
                                    onClick={() => setDetallePedido(null)}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Contenido en dos columnas */}
                            <div className="orders-modal-body">
                                <div className="detail-cards-grid">
                                    {/* Datos del Cliente */}
                                    <div className="detail-info-card">
                                        <h4>Información del Cliente</h4>
                                        <div className="detail-field">
                                            <span className="field-label">Nombre:</span>
                                            <span className="field-val font-semibold">
                                                {detallePedido.usuario_info
                                                    ? `${detallePedido.usuario_info.nombres || ""} ${detallePedido.usuario_info.apellidos || ""}`.trim()
                                                    : detallePedido.nombre_cliente || "Cliente"}
                                            </span>
                                        </div>
                                        <div className="detail-field">
                                            <span className="field-label">Email:</span>
                                            <span className="field-val">
                                                {detallePedido.usuario_info?.email || "Sin email"}
                                            </span>
                                        </div>
                                        <div className="detail-field">
                                            <span className="field-label">Teléfono:</span>
                                            <span className="field-val">
                                                {detallePedido.telefono_contacto ||
                                                    detallePedido.usuario_info?.telefono ||
                                                    "Sin teléfono"}
                                            </span>
                                        </div>
                                        {detallePedido.direccion && (
                                            <div className="detail-field">
                                                <span className="field-label">Dirección:</span>
                                                <span className="field-val">
                                                    {typeof detallePedido.direccion === "object"
                                                        ? `${detallePedido.direccion.direccion_linea || ""}, ${detallePedido.direccion.ciudad || ""}`
                                                        : detallePedido.direccion}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Resumen del Pago */}
                                    <div className="detail-info-card">
                                        <h4>Pago y Estado</h4>
                                        <div className="detail-field">
                                            <span className="field-label">Método:</span>
                                            <span className="field-val font-semibold">
                                                {obtenerInfoMetodoPago(detallePedido).titulo} (
                                                {obtenerInfoMetodoPago(detallePedido).subtitulo})
                                            </span>
                                        </div>
                                        <div className="detail-field">
                                            <span className="field-label">Total a pagar:</span>
                                            <span className="field-val font-bold text-purple">
                                                {formatearPesos(detallePedido.total)}
                                            </span>
                                        </div>

                                        {/* Selector rápido de estado dentro del modal */}
                                        <div className="detail-status-changer">
                                            <span className="field-label">Actualizar estado:</span>
                                            <div className="status-buttons-row">
                                                {[
                                                    { key: "pendiente", label: "Pendiente" },
                                                    { key: "en_proceso", label: "En proceso" },
                                                    { key: "entregado", label: "Entregado" },
                                                    { key: "cancelado", label: "Cancelado" }
                                                ].map((est) => {
                                                    const esActivo =
                                                        normalizarEstado(detallePedido.estado_compra) ===
                                                        est.key;
                                                    return (
                                                        <button
                                                            key={est.key}
                                                            type="button"
                                                            className={`status-chip-btn ${esActivo ? "active" : ""}`}
                                                            onClick={async () => {
                                                                const backendVal =
                                                                    est.key === "en_proceso"
                                                                        ? "enviado"
                                                                        : est.key;
                                                                try {
                                                                    await updateOrderStatus(
                                                                        detallePedido.id_compra,
                                                                        { estado_compra: backendVal }
                                                                    );
                                                                    setDetallePedido((prev) => ({
                                                                        ...prev,
                                                                        estado_compra: backendVal
                                                                    }));
                                                                    setPedidos((prev) =>
                                                                        prev.map((p) =>
                                                                            p.id_compra ===
                                                                            detallePedido.id_compra
                                                                                ? {
                                                                                      ...p,
                                                                                      estado_compra:
                                                                                          backendVal
                                                                                  }
                                                                                : p
                                                                        )
                                                                    );
                                                                    toast?.success?.(
                                                                        `Estado actualizado a ${est.label}`
                                                                    );
                                                                } catch (err) {
                                                                    toast?.error?.(
                                                                        "Error actualizando estado"
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            {est.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Lista de Productos del Pedido */}
                                <div className="detail-items-section">
                                    <h4>Artículos del Pedido</h4>
                                    {Array.isArray(detallePedido.detalles) &&
                                    detallePedido.detalles.length > 0 ? (
                                        <div className="detail-items-table-wrapper">
                                            <table className="detail-items-table">
                                                <thead>
                                                    <tr>
                                                        <th>Producto</th>
                                                        <th>Variante</th>
                                                        <th className="text-center">Cantidad</th>
                                                        <th className="text-right">Precio unitario</th>
                                                        <th className="text-right">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {detallePedido.detalles.map((det) => (
                                                        <tr key={det.id_detalle}>
                                                            <td className="item-product-name font-semibold">
                                                                {det.producto_nombre ||
                                                                    `Producto #${det.variante || det.id_detalle}`}
                                                            </td>
                                                            <td className="item-variant text-muted">
                                                                {det.variante_info ||
                                                                    `Variante #${det.variante}`}
                                                            </td>
                                                            <td className="text-center font-semibold">
                                                                {det.cantidad}
                                                            </td>
                                                            <td className="text-right">
                                                                {formatearPesos(det.precio_unitario)}
                                                            </td>
                                                            <td className="text-right font-bold text-dark">
                                                                {formatearPesos(det.subtotal)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="no-items-text">
                                            No hay detalles de artículos disponibles para este pedido.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="orders-modal-footer">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    onClick={() => setDetallePedido(null)}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {/* =====================================================
                MODAL 2: CAMBIAR ESTADO RÁPIDO
                ===================================================== */}
            {orderToEditStatus &&
                createPortal(
                    <div
                        className="orders-modal-overlay"
                        onClick={() => setOrderToEditStatus(null)}
                    >
                        <div
                            className="orders-modal-card modal-edit-status"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="orders-modal-header">
                                <div>
                                    <h2>Actualizar estado del pedido</h2>
                                    <p className="modal-subtitle">
                                        Pedido {formatearCodigoPedido(orderToEditStatus.id_compra)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="modal-close-btn"
                                    onClick={() => setOrderToEditStatus(null)}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="orders-modal-body">
                                <label className="input-group-label">
                                    Selecciona el nuevo estado:
                                </label>
                                <div className="status-selection-options">
                                    {[
                                        {
                                            key: "pendiente",
                                            label: "Pendiente",
                                            desc: "En espera de confirmación o pago.",
                                            icon: Clock,
                                            colorClass: "option--amber"
                                        },
                                        {
                                            key: "en_proceso",
                                            label: "En proceso",
                                            desc: "En preparación o camino al cliente.",
                                            icon: Truck,
                                            colorClass: "option--blue"
                                        },
                                        {
                                            key: "entregado",
                                            label: "Entregado",
                                            desc: "El cliente ha recibido su pedido con éxito.",
                                            icon: CheckCircle2,
                                            colorClass: "option--green"
                                        },
                                        {
                                            key: "cancelado",
                                            label: "Cancelado",
                                            desc: "Pedido anulado o rechazado.",
                                            icon: XCircle,
                                            colorClass: "option--rose"
                                        }
                                    ].map((opt) => {
                                        const isSelected =
                                            nuevoEstadoSeleccionado === opt.key;
                                        const OptIcon = opt.icon;
                                        return (
                                            <div
                                                key={opt.key}
                                                className={`status-option-item ${opt.colorClass} ${isSelected ? "selected" : ""}`}
                                                onClick={() => setNuevoEstadoSeleccionado(opt.key)}
                                            >
                                                <div className="option-icon-box">
                                                    <OptIcon size={18} />
                                                </div>
                                                <div className="option-texts">
                                                    <span className="option-label">
                                                        {opt.label}
                                                    </span>
                                                    <span className="option-desc">
                                                        {opt.desc}
                                                    </span>
                                                </div>
                                                <div className="option-radio-indicator">
                                                    {isSelected && <Check size={14} />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="orders-modal-footer">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    onClick={() => setOrderToEditStatus(null)}
                                    disabled={isUpdatingStatus}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="btn-modal-save"
                                    onClick={handleGuardarEstado}
                                    disabled={isUpdatingStatus}
                                >
                                    {isUpdatingStatus ? "Guardando..." : "Guardar cambios"}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {/* =====================================================
                MODAL 3: CONFIRMAR ELIMINACIÓN
                ===================================================== */}
            {orderToDelete &&
                createPortal(
                    <div
                        className="orders-modal-overlay"
                        onClick={() => !isDeleting && setOrderToDelete(null)}
                    >
                        <div
                            className="orders-modal-card modal-delete-confirm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="delete-modal-icon-container">
                                <div className="delete-modal-squircle">
                                    <Trash2 size={28} color="#ef4444" />
                                </div>
                            </div>

                            <h3 className="delete-modal-title">¿Eliminar pedido?</h3>
                            <p className="delete-modal-desc">
                                Estás a punto de eliminar el pedido{" "}
                                <strong>
                                    {formatearCodigoPedido(orderToDelete.id_compra)}
                                </strong>
                                . Esta acción es definitiva y no se puede deshacer.
                            </p>

                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    onClick={() => setOrderToDelete(null)}
                                    disabled={isDeleting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="btn-modal-danger"
                                    onClick={handleConfirmDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? "Eliminando..." : "Sí, eliminar"}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {/* =====================================================
                MODAL 4: CREAR NUEVO PEDIDO MANUAL
                ===================================================== */}
            {openNewOrderModal &&
                createPortal(
                    <div
                        className="orders-modal-overlay"
                        onClick={onCloseNewOrder}
                    >
                        <div
                            className="orders-modal-card modal-new-order"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="orders-modal-header">
                                <div>
                                    <h2>Registrar nuevo pedido</h2>
                                    <p className="modal-subtitle">
                                        Crea un pedido manualmente en el sistema
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="modal-close-btn"
                                    onClick={onCloseNewOrder}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateOrderSubmit}>
                                <div className="orders-modal-body form-grid">
                                    <div className="form-group">
                                        <label>Nombre del Cliente *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej. Carlos Mendoza"
                                            value={newOrderForm.nombre_cliente}
                                            onChange={(e) =>
                                                setNewOrderForm((prev) => ({
                                                    ...prev,
                                                    nombre_cliente: e.target.value
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Teléfono de Contacto</label>
                                        <input
                                            type="tel"
                                            placeholder="Ej. 300 123 4567"
                                            value={newOrderForm.telefono_contacto}
                                            onChange={(e) =>
                                                setNewOrderForm((prev) => ({
                                                    ...prev,
                                                    telefono_contacto: e.target.value
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Total del Pedido (COP) *</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="100"
                                            placeholder="Ej. 160000"
                                            value={newOrderForm.total}
                                            onChange={(e) =>
                                                setNewOrderForm((prev) => ({
                                                    ...prev,
                                                    total: e.target.value
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Estado Inicial</label>
                                        <select
                                            value={newOrderForm.estado_compra}
                                            onChange={(e) =>
                                                setNewOrderForm((prev) => ({
                                                    ...prev,
                                                    estado_compra: e.target.value
                                                }))
                                            }
                                        >
                                            <option value="pendiente">Pendiente</option>
                                            <option value="en_proceso">En proceso</option>
                                            <option value="entregado">Entregado</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="orders-modal-footer">
                                    <button
                                        type="button"
                                        className="btn-modal-cancel"
                                        onClick={onCloseNewOrder}
                                        disabled={isCreatingOrder}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-modal-save"
                                        disabled={isCreatingOrder}
                                    >
                                        {isCreatingOrder ? "Guardando..." : "Crear pedido"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}

export default OrderTable;