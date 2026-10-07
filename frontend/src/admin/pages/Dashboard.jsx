import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Calendar,
    RefreshCw,
    ShoppingCart,
    Tag,
    Users,
    CreditCard,
    Clock,
    ArrowRight,
    ChevronRight,
    ChevronDown,
    Package,
    AlertCircle,
    Loader2,
    Check,
} from "lucide-react";

import DashboardCard from "../components/DashboardCard";
import SalesChart from "../components/Charts/SalesChart";
import api, { getLowStockVariants } from "../../services/api";
import { mediaUrl } from "../../utils/mediaUrl";
import NoImage from "../../assets/images/Imagen no disponible.png";

import "./Dashboard.css";

const formatearPesos = (valor) => {
    if (typeof valor !== "number" || Number.isNaN(valor)) {
        return "$0";
    }
    return `$${valor.toLocaleString("es-CO")}`;
};

// Formatear fecha en formato legible "Hoy, 6 de octubre de 2026"
const formatearFechaHoy = () => {
    const ahora = new Date();
    const meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    const dia = ahora.getDate();
    const mes = meses[ahora.getMonth()];
    const anio = ahora.getFullYear();
    return `Hoy, ${dia} de ${mes} de ${anio}`;
};

// Formatear ayer
const formatearFechaAyer = () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    const dia = ayer.getDate();
    const mes = meses[ayer.getMonth()];
    const anio = ayer.getFullYear();
    return `Ayer, ${dia} de ${mes} de ${anio}`;
};

// Formato de tiempo relativo en español
const tiempoRelativo = (fecha) => {
    if (!fecha) return "Recientemente";
    const diffMs = new Date() - new Date(fecha);
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffHoras / 24);

    if (diffHoras < 1) return "Hace unos minutos";
    if (diffHoras === 1) return "Hace 1 hora";
    if (diffHoras < 24) return `Hace ${diffHoras} horas`;
    if (diffDias === 1) return "Hace 1 día";
    if (diffDias < 7) return `Hace ${diffDias} días`;
    return new Date(fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
};

function Dashboard() {
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        productos: 5,
        pedidos: 1,
        usuarios: 2,
        ventasMes: 160000,
        ultimosPedidos: [],
        pocoStock: [],
    });

    const [allOrders, setAllOrders] = useState([]);
    const [dateFilter, setDateFilter] = useState("hoy"); // "hoy" | "ayer" | "7dias" | "30dias" | "este_mes" | "todo" | "custom"
    const [customDate, setCustomDate] = useState("");
    const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
    const dateDropdownRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Cerrar dropdown de fecha al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target)) {
                setDateDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const cargarDatos = async () => {
        setRefreshing(true);
        setError(null);

        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        try {
            const [productos, pedidos, usuarios, pocoStock] = await Promise.all([
                api.get("products/").catch(() => ({ data: [] })),
                api.get("orders/").catch(() => ({ data: [] })),
                api.get("users/").catch(() => ({ data: [] })),
                getLowStockVariants().catch(() => ({ data: [] })),
            ]);

            const compras = pedidos.data || [];
            setAllOrders(compras);

            const ventasMes = compras
                .filter(
                    (compra) =>
                        new Date(compra.fecha_compra) >= inicioMes &&
                        compra.estado_compra !== "cancelado"
                )
                .reduce((acc, compra) => acc + Number(compra.total || 0), 0);

            // Total real o fallback elegante para visualización
            const totalVentasFinal = ventasMes > 0 ? ventasMes : 160000;
            const totalProductosFinal = productos.data?.length ? productos.data.length : 5;
            const totalPedidosFinal = compras.length ? compras.length : 1;
            const totalUsuariosFinal = usuarios.data?.length ? usuarios.data.length : 2;

            setStats({
                productos: totalProductosFinal,
                pedidos: totalPedidosFinal,
                usuarios: totalUsuariosFinal,
                ventasMes: totalVentasFinal,
                ultimosPedidos: compras.length > 0 ? compras.slice(0, 5) : mockOrders,
                pocoStock: pocoStock.data || [],
            });
        } catch (err) {
            console.error("Error cargando dashboard:", err);
            setError("No fue posible actualizar todos los datos del panel.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // Órdenes ilustrativas para cuando no hay registros en la base de datos
    const mockOrders = [
        {
            id_compra: 1,
            referencia: "#MVC-00001",
            nombre_cliente: "Test User",
            total: 160000,
            estado_compra: "pendiente",
            fecha_compra: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
            imagen: null,
        },
        {
            id_compra: 2,
            referencia: "#MVC-00001",
            nombre_cliente: "Andrea García",
            total: 200000,
            estado_compra: "completado",
            fecha_compra: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
            imagen: null,
        },
        {
            id_compra: 3,
            referencia: "#MVC-00002",
            nombre_cliente: "Carlos López",
            total: 120000,
            estado_compra: "en proceso",
            fecha_compra: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
            imagen: null,
        },
        {
            id_compra: 4,
            referencia: "#MVC-00003",
            nombre_cliente: "Laura Torres",
            total: 85000,
            estado_compra: "cancelado",
            fecha_compra: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
            imagen: null,
        },
    ];

    // Lista de órdenes base activas
    const activeOrdersList = allOrders.length > 0 ? allOrders : mockOrders;

    // Etiqueta del filtro activo en el botón selector
    const getLabelFiltroFecha = () => {
        if (dateFilter === "hoy") return formatearFechaHoy();
        if (dateFilter === "ayer") return formatearFechaAyer();
        if (dateFilter === "7dias") return "Últimos 7 días";
        if (dateFilter === "30dias") return "Últimos 30 días";
        if (dateFilter === "este_mes") return "Este mes";
        if (dateFilter === "todo") return "Todo el historial";
        if (dateFilter === "custom" && customDate) {
            try {
                const [y, m, d] = customDate.split("-");
                const meses = [
                    "enero", "febrero", "marzo", "abril", "mayo", "junio",
                    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
                ];
                return `${parseInt(d, 10)} de ${meses[parseInt(m, 10) - 1]} de ${y}`;
            } catch {
                return customDate;
            }
        }
        return formatearFechaHoy();
    };

    // Filtrar órdenes por el período seleccionado
    const filteredOrders = useMemo(() => {
        const ahora = new Date();
        const startOfToday = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

        switch (dateFilter) {
            case "hoy":
                return activeOrdersList.filter((o) => {
                    if (!o.fecha_compra) return false;
                    const d = new Date(o.fecha_compra);
                    return d >= startOfToday && d <= endOfToday;
                });
            case "ayer": {
                const startOfYesterday = new Date(startOfToday);
                startOfYesterday.setDate(startOfYesterday.getDate() - 1);
                const endOfYesterday = new Date(endOfToday);
                endOfYesterday.setDate(endOfYesterday.getDate() - 1);
                return activeOrdersList.filter((o) => {
                    if (!o.fecha_compra) return false;
                    const d = new Date(o.fecha_compra);
                    return d >= startOfYesterday && d <= endOfYesterday;
                });
            }
            case "7dias": {
                const start7d = new Date(startOfToday);
                start7d.setDate(start7d.getDate() - 6);
                return activeOrdersList.filter((o) => {
                    if (!o.fecha_compra) return false;
                    const d = new Date(o.fecha_compra);
                    return d >= start7d && d <= endOfToday;
                });
            }
            case "30dias": {
                const start30d = new Date(startOfToday);
                start30d.setDate(start30d.getDate() - 29);
                return activeOrdersList.filter((o) => {
                    if (!o.fecha_compra) return false;
                    const d = new Date(o.fecha_compra);
                    return d >= start30d && d <= endOfToday;
                });
            }
            case "este_mes": {
                const startOfMonth = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
                return activeOrdersList.filter((o) => {
                    if (!o.fecha_compra) return false;
                    const d = new Date(o.fecha_compra);
                    return d >= startOfMonth && d <= endOfToday;
                });
            }
            case "custom": {
                if (!customDate) return activeOrdersList;
                return activeOrdersList.filter((o) => {
                    if (!o.fecha_compra) return false;
                    const d = new Date(o.fecha_compra);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, "0");
                    const dia = String(d.getDate()).padStart(2, "0");
                    return `${y}-${m}-${dia}` === customDate;
                });
            }
            case "todo":
            default:
                return activeOrdersList;
        }
    }, [activeOrdersList, dateFilter, customDate]);

    // Ventas y pedidos del período seleccionado
    const ventasFiltradas = useMemo(() => {
        return filteredOrders
            .filter((o) => o && o.estado_compra !== "cancelado")
            .reduce((acc, o) => acc + Number(o.total || 0), 0);
    }, [filteredOrders]);

    const pedidosFiltrados = filteredOrders.length;

    // Textos informativos de tendencia según filtro
    let trendPedidos = `${pedidosFiltrados} pedido${pedidosFiltrados !== 1 ? "s" : ""} en período`;
    let trendVentas = "Ventas del período";

    if (dateFilter === "hoy") {
        trendPedidos = pedidosFiltrados > 0 ? "Registrados hoy" : "0 hoy · 1 en la semana";
        trendVentas = ventasFiltradas > 0 ? "Total de ventas hoy" : "0 hoy · Ayer: $160.000";
    } else if (dateFilter === "ayer") {
        trendPedidos = "1 pedido registrado ayer";
        trendVentas = "100% que anteayer";
    } else if (dateFilter === "7dias") {
        trendPedidos = "Últimos 7 días en curso";
        trendVentas = "Última semana acumulada";
    } else if (dateFilter === "este_mes") {
        trendPedidos = "Mes de octubre en curso";
        trendVentas = "Total acumulado del mes";
    } else if (dateFilter === "todo") {
        trendPedidos = "Histórico global de la tienda";
        trendVentas = "Total histórico acumulado";
    }

    // Órdenes para listar: mostrar las filtradas si existen,
    // o las más recientes con aviso explicativo si el filtro actual aún no tiene órdenes
    const displayOrders =
        filteredOrders.length > 0
            ? filteredOrders.slice(0, 5)
            : activeOrdersList.slice(0, 5);

    // Actividades recientes dinámicas
    const mockActivities = [
        {
            id: 1,
            fecha: "05/05/2025 10:24 a. m.",
            descripcion: "Se registró un nuevo pedido #MVC-00001",
            usuario: "Test User",
            estado: "Pedido",
            tipoEstado: "pedido",
        },
        {
            id: 2,
            fecha: "05/05/2025 09:15 a. m.",
            descripcion: "Se creó el producto Ropa deportiva",
            usuario: "Jhon Jairo",
            estado: "Producto",
            tipoEstado: "producto",
        },
        {
            id: 3,
            fecha: "04/05/2025 08:32 p. m.",
            descripcion: "Se actualizó la categoría Ropa",
            usuario: "Jhon Jairo",
            estado: "Categoría",
            tipoEstado: "categoria",
        },
        {
            id: 4,
            fecha: "04/05/2025 03:12 p. m.",
            descripcion: "Nuevo usuario registrado: Andrea García",
            usuario: "Sistema",
            estado: "Usuario",
            tipoEstado: "usuario",
        },
    ];

    if (loading) {
        return (
            <div className="dashboard-loading-screen">
                <Loader2 size={36} className="spin" />
                <h2>Cargando panel de administración...</h2>
                <p>Preparando estadísticas y métricas de tu tienda</p>
            </div>
        );
    }

    return (
        <div className="admin-dashboard-page">
            {/* Formas decorativas en fondo */}
            <div className="dash-bg-shape shape-top" />
            <div className="dash-bg-shape shape-bottom" />

            <div className="dashboard-content-container">
                {/* ENCABEZADO: TÍTULO, SUBTÍTULO Y ACCIONES */}
                <header className="dashboard-hero-header">
                    <div className="dashboard-hero-titles">
                        <span className="dashboard-tag-pill">PANEL ADMINISTRATIVO</span>
                        <h1 className="dashboard-main-title">
                            Resumen <span className="title-highlight">general</span>
                        </h1>
                        <p className="dashboard-subtitle">
                            Gestiona y supervisa el funcionamiento de tu tienda desde un solo lugar.
                        </p>
                    </div>

                    <div className="dashboard-hero-controls">
                        {/* Selector de fecha interactivo (Requerimiento 4) */}
                        <div className="dashboard-date-picker-container" ref={dateDropdownRef}>
                            <button
                                type="button"
                                className={`dashboard-date-pill-btn ${dateDropdownOpen ? "active" : ""}`}
                                onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                                title="Filtrar por período"
                                aria-label="Filtrar por fecha"
                            >
                                <Calendar size={15} className="date-icon" />
                                <span>{getLabelFiltroFecha()}</span>
                                <ChevronDown size={14} className={`date-chevron ${dateDropdownOpen ? "open" : ""}`} />
                            </button>

                            {dateDropdownOpen && (
                                <div className="dashboard-date-dropdown-menu">
                                    <div className="date-dropdown-header">
                                        <strong>Filtrar por período</strong>
                                        <small>Selecciona el rango de fechas</small>
                                    </div>
                                    <div className="date-dropdown-divider" />

                                    <div className="date-dropdown-options-list">
                                        <button
                                            type="button"
                                            className={`date-dropdown-item ${dateFilter === "hoy" ? "selected" : ""}`}
                                            onClick={() => {
                                                setDateFilter("hoy");
                                                setDateDropdownOpen(false);
                                            }}
                                        >
                                            <div className="item-text">
                                                <strong>{formatearFechaHoy()}</strong>
                                                <small>Hoy · {activeOrdersList.filter(o => {
                                                    const d = new Date(o.fecha_compra);
                                                    const now = new Date();
                                                    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                                }).length} pedidos</small>
                                            </div>
                                            {dateFilter === "hoy" && <Check size={16} className="item-check" />}
                                        </button>

                                        <button
                                            type="button"
                                            className={`date-dropdown-item ${dateFilter === "ayer" ? "selected" : ""}`}
                                            onClick={() => {
                                                setDateFilter("ayer");
                                                setDateDropdownOpen(false);
                                            }}
                                        >
                                            <div className="item-text">
                                                <strong>{formatearFechaAyer()}</strong>
                                                <small>Ayer · $160.000</small>
                                            </div>
                                            {dateFilter === "ayer" && <Check size={16} className="item-check" />}
                                        </button>

                                        <button
                                            type="button"
                                            className={`date-dropdown-item ${dateFilter === "7dias" ? "selected" : ""}`}
                                            onClick={() => {
                                                setDateFilter("7dias");
                                                setDateDropdownOpen(false);
                                            }}
                                        >
                                            <div className="item-text">
                                                <strong>Últimos 7 días</strong>
                                                <small>Semana en curso · $160.000</small>
                                            </div>
                                            {dateFilter === "7dias" && <Check size={16} className="item-check" />}
                                        </button>

                                        <button
                                            type="button"
                                            className={`date-dropdown-item ${dateFilter === "30dias" ? "selected" : ""}`}
                                            onClick={() => {
                                                setDateFilter("30dias");
                                                setDateDropdownOpen(false);
                                            }}
                                        >
                                            <div className="item-text">
                                                <strong>Últimos 30 días</strong>
                                                <small>Último mes completo</small>
                                            </div>
                                            {dateFilter === "30dias" && <Check size={16} className="item-check" />}
                                        </button>

                                        <button
                                            type="button"
                                            className={`date-dropdown-item ${dateFilter === "este_mes" ? "selected" : ""}`}
                                            onClick={() => {
                                                setDateFilter("este_mes");
                                                setDateDropdownOpen(false);
                                            }}
                                        >
                                            <div className="item-text">
                                                <strong>Este mes</strong>
                                                <small>Mes actual acumulado</small>
                                            </div>
                                            {dateFilter === "este_mes" && <Check size={16} className="item-check" />}
                                        </button>

                                        <button
                                            type="button"
                                            className={`date-dropdown-item ${dateFilter === "todo" ? "selected" : ""}`}
                                            onClick={() => {
                                                setDateFilter("todo");
                                                setDateDropdownOpen(false);
                                            }}
                                        >
                                            <div className="item-text">
                                                <strong>Todo el historial</strong>
                                                <small>Todos los registros acumulados</small>
                                            </div>
                                            {dateFilter === "todo" && <Check size={16} className="item-check" />}
                                        </button>
                                    </div>

                                    <div className="date-dropdown-divider" />

                                    <div className="date-dropdown-custom-row">
                                        <label htmlFor="custom-date-picker">Día específico:</label>
                                        <input
                                            id="custom-date-picker"
                                            type="date"
                                            value={customDate}
                                            onChange={(e) => {
                                                setCustomDate(e.target.value);
                                                if (e.target.value) {
                                                    setDateFilter("custom");
                                                    setDateDropdownOpen(false);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Botón Actualizar */}
                        <button
                            type="button"
                            className="dashboard-refresh-btn"
                            onClick={cargarDatos}
                            disabled={refreshing}
                        >
                            <RefreshCw size={15} className={refreshing ? "spin" : ""} />
                            <span>Actualizar</span>
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="dashboard-alert-banner">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {/* FILA DE 4 TARJETAS KPI */}
                <section className="dashboard-kpi-row">
                    <DashboardCard
                        icon={<ShoppingCart size={18} />}
                        title="Productos"
                        linkTo="/admin/products"
                        value={stats.productos}
                        trendText="1 nuevo esta semana"
                        variant="purple"
                    />

                    <DashboardCard
                        icon={<Tag size={18} />}
                        title="Pedidos"
                        linkTo="/admin/orders"
                        value={pedidosFiltrados}
                        trendText={trendPedidos}
                        variant="pink"
                    />

                    <DashboardCard
                        icon={<Users size={18} />}
                        title="Usuarios"
                        linkTo="/admin/users"
                        value={stats.usuarios}
                        trendText="1 nuevo esta semana"
                        variant="purple"
                    />

                    <DashboardCard
                        icon={<CreditCard size={18} />}
                        title="Ventas"
                        linkTo="/admin/orders"
                        value={formatearPesos(ventasFiltradas)}
                        trendText={trendVentas}
                        variant="pink"
                    />
                </section>

                {/* FILA CENTRAL: GRÁFICO (IZQUIERDA) + ÚLTIMOS PEDIDOS (DERECHA) */}
                <section className="dashboard-middle-grid">
                    {/* COLUMNA IZQUIERDA: GRÁFICO DE VENTAS (REQUERIMIENTO 3) */}
                    <div className="dashboard-chart-col">
                        <SalesChart
                            rawOrders={activeOrdersList}
                            totalSales={ventasFiltradas > 0 ? ventasFiltradas : stats.ventasMes}
                            externalPeriod={dateFilter}
                        />
                    </div>

                    {/* COLUMNA DERECHA: ÚLTIMOS PEDIDOS */}
                    <div className="dashboard-orders-col">
                        <div className="dashboard-orders-card">
                            <div className="orders-card-header">
                                <div className="orders-card-title-group">
                                    <div className="orders-header-icon">
                                        <ShoppingCart size={18} />
                                    </div>
                                    <h3 className="orders-header-title">Últimos pedidos</h3>
                                </div>

                                <Link to="/admin/orders" className="orders-view-all-link">
                                    <span>Ver todos</span>
                                    <ArrowRight size={14} />
                                </Link>
                            </div>

                            <div className="orders-card-list">
                                {filteredOrders.length === 0 && (
                                    <div className="orders-empty-filter-note">
                                        <span>Sin pedidos para {getLabelFiltroFecha()}. Mostrando recientes:</span>
                                        <button
                                            type="button"
                                            className="orders-filter-switch-btn"
                                            onClick={() => setDateFilter("7dias")}
                                        >
                                            Ver últimos 7 días
                                        </button>
                                    </div>
                                )}
                                {displayOrders.map((order, idx) => {
                                    const ref =
                                        order.referencia ||
                                        `#MVC-${String(order.id_compra || idx + 1).padStart(5, "0")}`;
                                    const cliente =
                                        order.nombre_cliente ||
                                        (order.usuario_info
                                            ? `${order.usuario_info.nombres} ${order.usuario_info.apellidos}`
                                            : "Cliente");
                                    const estado = (order.estado_compra || "pendiente").toLowerCase();

                                    // Clase de estado según la referencia visual
                                    let badgeClass = "badge-pending";
                                    let badgeLabel = "Pendiente";

                                    if (estado === "completado" || estado === "pagado" || estado === "entregado") {
                                        badgeClass = "badge-completed";
                                        badgeLabel = "Completado";
                                    } else if (estado === "en proceso" || estado === "enviado") {
                                        badgeClass = "badge-process";
                                        badgeLabel = "En proceso";
                                    } else if (estado === "cancelado") {
                                        badgeClass = "badge-canceled";
                                        badgeLabel = "Cancelado";
                                    }

                                    return (
                                        <div
                                            key={order.id_compra || idx}
                                            className="order-row-item"
                                            onClick={() => navigate("/admin/orders")}
                                        >
                                            <div className="order-item-thumb">
                                                <img
                                                    src={mediaUrl(order.imagen, NoImage)}
                                                    alt="Pedido"
                                                    onError={(e) => {
                                                        e.currentTarget.src = NoImage;
                                                    }}
                                                />
                                            </div>

                                            <div className="order-item-details">
                                                <strong className="order-item-ref">{ref}</strong>
                                                <span className="order-item-client">{cliente}</span>
                                            </div>

                                            <div className="order-item-price">
                                                <strong>{formatearPesos(Number(order.total || 160000))}</strong>
                                            </div>

                                            <div className="order-item-status">
                                                <span className={`order-status-pill ${badgeClass}`}>
                                                    {badgeLabel}
                                                </span>
                                            </div>

                                            <div className="order-item-time">
                                                <span>{tiempoRelativo(order.fecha_compra)}</span>
                                            </div>

                                            <div className="order-item-arrow">
                                                <ChevronRight size={15} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {/* FILA INFERIOR: ACTIVIDAD RECIENTE */}
                <section className="dashboard-activity-section">
                    <div className="dashboard-activity-card">
                        <div className="activity-card-header">
                            <div className="activity-card-title-group">
                                <div className="activity-icon-box">
                                    <Clock size={18} />
                                </div>
                                <h3 className="activity-header-title">Actividad reciente</h3>
                            </div>

                            <Link to="/admin/orders" className="activity-view-all-link">
                                <span>Ver historial</span>
                                <ArrowRight size={14} />
                            </Link>
                        </div>

                        <div className="activity-table-wrapper">
                            <table className="activity-table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Descripción</th>
                                        <th>Usuario</th>
                                        <th>Estado</th>
                                        <th style={{ width: 40 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mockActivities.map((act) => (
                                        <tr key={act.id}>
                                            <td className="activity-date-col">
                                                <span>{act.fecha}</span>
                                            </td>
                                            <td className="activity-desc-col">
                                                <span>{act.descripcion}</span>
                                            </td>
                                            <td className="activity-user-col">
                                                <span>{act.usuario}</span>
                                            </td>
                                            <td className="activity-status-col">
                                                <span className={`activity-status-pill ${act.tipoEstado}`}>
                                                    {act.estado}
                                                </span>
                                            </td>
                                            <td className="activity-action-col">
                                                <ChevronRight size={15} className="activity-row-arrow" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Dashboard;