import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
    Search,
    Bell,
    Settings,
    ChevronDown,
    LayoutDashboard,
    Package,
    FolderTree,
    Percent,
    ShoppingCart,
    Users,
    Store,
    LogOut,
    Check,
    X,
    Menu,
    User,
    Shield,
    Trash2,
    AlertTriangle,
    UserPlus,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import api, { getLowStockVariants } from "../../../services/api";
import logoImg from "../../../assets/images/Logo miVenta.co con bolsa y envío.png";
import "./AdminTopNav.css";

const DISMISSED_KEY = "admin_dismissed_notifications";

function AdminTopNav() {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Notificaciones reales
    const [notifications, setNotifications] = useState([]);
    const [dismissedIds, setDismissedIds] = useState(() => {
        try {
            const saved = localStorage.getItem(DISMISSED_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const userDropdownRef = useRef(null);
    const settingsDropdownRef = useRef(null);
    const notifDropdownRef = useRef(null);

    // Cargar notificaciones reales del backend
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const [ordersRes, stockRes, usersRes] = await Promise.all([
                    api.get("orders/").catch(() => ({ data: [] })),
                    getLowStockVariants().catch(() => ({ data: [] })),
                    api.get("users/").catch(() => ({ data: [] })),
                ]);

                const items = [];

                // 1. Pedidos pendientes o recientes
                const orders = ordersRes.data || [];
                const pendingOrders = orders.filter((o) => o.estado_compra === "pendiente");
                pendingOrders.slice(0, 5).forEach((p) => {
                    const id = `order-${p.id_compra}`;
                    items.push({
                        id,
                        type: "order",
                        icon: <ShoppingCart size={15} color="#FF4F9A" />,
                        title: `Nuevo pedido ${p.referencia ? (p.referencia.startsWith("#") ? p.referencia : `#${p.referencia}`) : `#MVC-${String(p.id_compra).padStart(5, "0")}`}`,
                        subtitle: `${p.nombre_cliente || "Cliente"} - $${Number(p.total || 0).toLocaleString("es-CO")}`,
                        time: p.fecha_compra ? formatRelative(p.fecha_compra) : "Reciente",
                        link: "/admin/orders",
                    });
                });

                // 2. Variantes con bajo stock (<= 5)
                const lowStock = stockRes.data || [];
                lowStock.slice(0, 4).forEach((v) => {
                    const id = `stock-${v.id_variante}`;
                    items.push({
                        id,
                        type: "stock",
                        icon: <AlertTriangle size={15} color="#d97706" />,
                        title: `Stock bajo: ${v.producto_nombre || "Producto"}`,
                        subtitle: `Quedan ${v.stock} uds (${v.talla ? "Talla " + v.talla : ""} ${v.color ? "· " + v.color : ""})`,
                        time: "Atención requerida",
                        link: "/admin/products",
                    });
                });

                // 3. Usuarios registrados recientemente
                const users = usersRes.data || [];
                users.slice(0, 3).forEach((u) => {
                    const id = `user-${u.id_usuario}`;
                    items.push({
                        id,
                        type: "user",
                        icon: <UserPlus size={15} color="#6A2CA0" />,
                        title: `Nuevo usuario registrado`,
                        subtitle: `${u.nombres || "Usuario"} (${u.email || ""})`,
                        time: "Reciente",
                        link: "/admin/users",
                    });
                });

                setNotifications(items);
            } catch (err) {
                console.error("Error cargando notificaciones:", err);
            }
        };

        fetchNotifications();
    }, []);

    const formatRelative = (dateStr) => {
        const diffMs = new Date() - new Date(dateStr);
        const mins = Math.floor(diffMs / 60000);
        if (mins < 60) return `Hace ${mins || 1} min`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `Hace ${hrs} h`;
        return `Hace ${Math.floor(hrs / 24)} d`;
    };

    // Descartar una notificación individual
    const dismissNotification = (id, e) => {
        if (e) e.stopPropagation();
        const updated = [...dismissedIds, id];
        setDismissedIds(updated);
        try {
            localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
        } catch {
            /* ignore */
        }
    };

    // Descartar todas las notificaciones
    const dismissAllNotifications = () => {
        const allIds = notifications.map((n) => n.id);
        const updated = [...new Set([...dismissedIds, ...allIds])];
        setDismissedIds(updated);
        try {
            localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
        } catch {
            /* ignore */
        }
    };

    // Notificaciones visibles no descartadas
    const activeNotifications = notifications.filter((n) => !dismissedIds.includes(n.id));

    // Cerrar dropdowns al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
                setUserDropdownOpen(false);
            }
            if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(e.target)) {
                setSettingsDropdownOpen(false);
            }
            if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Cerrar menú móvil al cambiar de ruta
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate("/admin/login");
    };

    // Navegación: "Configuración" ELIMINADA de la lista según requerimiento 1
    const navLinks = [
        { to: "/admin", label: "Resumen", icon: <LayoutDashboard size={16} />, end: true },
        { to: "/admin/products", label: "Productos", icon: <Package size={16} /> },
        { to: "/admin/categories", label: "Categorías", icon: <FolderTree size={16} /> },
        { to: "/admin/offers", label: "Ofertas", icon: <Percent size={16} /> },
        { to: "/admin/orders", label: "Pedidos", icon: <ShoppingCart size={16} /> },
        { to: "/admin/users", label: "Usuarios", icon: <Users size={16} /> },
    ];

    const userName = usuario?.nombres || "Jhon Jairo";
    const initial = userName.charAt(0).toUpperCase();

    return (
        <header className="admin-topnav-container">
            {/* BARRA SUPERIOR PRINCIPAL */}
            <div className="admin-topnav-main">
                {/* LOGO */}
                <div className="admin-topnav-left">
                    <button
                        type="button"
                        className="admin-mobile-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Abrir menú"
                    >
                        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <Link to="/admin" className="admin-topnav-logo" title="miVenta.co Panel de Administración">
                        <img
                            src={logoImg}
                            alt="miVenta.co"
                            className="admin-topnav-logo-img"
                        />
                    </Link>
                </div>

                {/* BUSCADOR */}
                <div className="admin-topnav-center">
                    <div className="admin-search-wrapper">
                        <Search size={15} className="admin-search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar en el panel..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* ACCIONES Y PERFIL */}
                <div className="admin-topnav-right">
                    {/* NOTIFICACIONES DINÁMICAS (REQUERIMIENTO 2) */}
                    <div className="admin-notif-container" ref={notifDropdownRef}>
                        <button
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => {
                                setNotificationsOpen(!notificationsOpen);
                                setSettingsDropdownOpen(false);
                                setUserDropdownOpen(false);
                            }}
                            title="Notificaciones"
                            aria-label="Notificaciones"
                        >
                            <Bell size={18} />
                            {activeNotifications.length > 0 && (
                                <span className="admin-notif-badge">
                                    {activeNotifications.length}
                                </span>
                            )}
                        </button>

                        {notificationsOpen && (
                            <div className="admin-popover-dropdown notif-dropdown">
                                <div className="popover-header">
                                    <div>
                                        <strong>Notificaciones</strong>
                                        {activeNotifications.length > 0 && (
                                            <span className="unread-count">
                                                {activeNotifications.length} activas
                                            </span>
                                        )}
                                    </div>
                                    {activeNotifications.length > 0 && (
                                        <button
                                            type="button"
                                            className="clear-all-notif-btn"
                                            onClick={dismissAllNotifications}
                                            title="Limpiar todas"
                                        >
                                            <Trash2 size={13} />
                                            <span>Limpiar</span>
                                        </button>
                                    )}
                                </div>

                                <div className="popover-list">
                                    {activeNotifications.length === 0 ? (
                                        <div className="notif-empty-state">
                                            <Check size={22} className="notif-empty-check" />
                                            <p>No tienes notificaciones pendientes</p>
                                            <small>Tu tienda está al día</small>
                                        </div>
                                    ) : (
                                        activeNotifications.map((n) => (
                                            <div
                                                key={n.id}
                                                className="popover-item dismissible"
                                                onClick={() => {
                                                    if (n.link) navigate(n.link);
                                                    setNotificationsOpen(false);
                                                }}
                                            >
                                                <div className="popover-icon-box">{n.icon}</div>
                                                <div className="popover-item-content">
                                                    <p className="popover-item-title">{n.title}</p>
                                                    <span className="popover-item-sub">{n.subtitle}</span>
                                                    <small className="popover-item-time">{n.time}</small>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="dismiss-notif-btn"
                                                    onClick={(e) => dismissNotification(n.id, e)}
                                                    title="Descartar notificación"
                                                    aria-label="Descartar"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CONFIGURACIÓN CON PERFIL Y SEGURIDAD (REQUERIMIENTO 1) */}
                    <div className="admin-settings-container" ref={settingsDropdownRef}>
                        <button
                            type="button"
                            className={`admin-icon-btn ${settingsDropdownOpen ? "active" : ""}`}
                            onClick={() => {
                                setSettingsDropdownOpen(!settingsDropdownOpen);
                                setNotificationsOpen(false);
                                setUserDropdownOpen(false);
                            }}
                            title="Configuración de cuenta"
                            aria-label="Configuración de cuenta"
                        >
                            <Settings size={18} />
                        </button>

                        {settingsDropdownOpen && (
                            <div className="admin-popover-dropdown settings-dropdown">
                                <div className="popover-header">
                                    <strong>Configuración</strong>
                                    <small className="header-subtitle">Cuenta y acceso</small>
                                </div>
                                <div className="admin-popover-divider" />
                                <Link
                                    to="/admin/configuracion?tab=profile"
                                    className="admin-popover-item-link"
                                    onClick={() => setSettingsDropdownOpen(false)}
                                >
                                    <User size={16} />
                                    <div>
                                        <strong className="item-title">Mi perfil</strong>
                                        <small className="item-desc">Información personal y cuenta</small>
                                    </div>
                                </Link>
                                <Link
                                    to="/admin/configuracion?tab=security"
                                    className="admin-popover-item-link"
                                    onClick={() => setSettingsDropdownOpen(false)}
                                >
                                    <Shield size={16} />
                                    <div>
                                        <strong className="item-title">Seguridad</strong>
                                        <small className="item-desc">Cambio de contraseña y acceso</small>
                                    </div>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* PERFIL DE USUARIO CON CERRAR SESIÓN (REQUERIMIENTO 5) */}
                    <div className="admin-user-container" ref={userDropdownRef}>
                        <button
                            type="button"
                            className="admin-user-btn"
                            onClick={() => {
                                setUserDropdownOpen(!userDropdownOpen);
                                setSettingsDropdownOpen(false);
                                setNotificationsOpen(false);
                            }}
                        >
                            <div className="admin-user-avatar">{initial}</div>
                            <div className="admin-user-meta">
                                <span className="admin-user-name">{userName}</span>
                                <span className="admin-user-role">Administrador</span>
                            </div>
                            <ChevronDown
                                size={14}
                                className={`admin-chevron ${userDropdownOpen ? "open" : ""}`}
                            />
                        </button>

                        {userDropdownOpen && (
                            <div className="admin-popover-dropdown admin-user-popover">
                                <div className="admin-popover-brand-header">
                                    <img
                                        src={logoImg}
                                        alt="miVenta.co"
                                        className="admin-popover-brand-logo"
                                    />
                                    <span className="admin-popover-role-tag">Panel Administrativo</span>
                                </div>
                                <div className="admin-popover-user-header">
                                    <div className="admin-user-avatar large">{initial}</div>
                                    <div>
                                        <strong>{userName}</strong>
                                        <small>{usuario?.email || "admin@miventa.co"}</small>
                                    </div>
                                </div>
                                <div className="admin-popover-divider" />

                                <button
                                    type="button"
                                    className="admin-popover-item-link logout"
                                    onClick={handleLogout}
                                >
                                    <LogOut size={16} />
                                    <span>Cerrar sesión</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BARRA DE NAVEGACIÓN SECUNDARIA (PESTAÑAS SIN CONFIGURACIÓN) */}
            <nav className={`admin-topnav-bar ${mobileMenuOpen ? "mobile-open" : ""}`}>
                <div className="admin-topnav-bar-inner">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end}
                            className={({ isActive }) =>
                                `admin-nav-tab ${isActive ? "active" : ""}`
                            }
                        >
                            {link.icon}
                            <span>{link.label}</span>
                        </NavLink>
                    ))}

                    <Link to="/" className="admin-nav-tab store-tab" title="Ver tienda pública">
                        <Store size={16} />
                        <span>Ver tienda</span>
                    </Link>
                </div>
            </nav>
        </header>
    );
}

export default AdminTopNav;
