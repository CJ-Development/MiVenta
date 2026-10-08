import { useState, useRef, useEffect, useMemo } from "react";
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
    Folder,
    Loader2,
    ArrowRight,
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
    const [searchResultsOpen, setSearchResultsOpen] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [searchCatalog, setSearchCatalog] = useState({
        products: [],
        categories: [],
        orders: [],
        users: [],
        offers: [],
    });
    const searchDataLoaded = useRef(false);
    const searchRef = useRef(null);

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

    // Carga de catálogo para búsqueda en tiempo real
    const ensureSearchData = async () => {
        if (searchDataLoaded.current) return;
        setIsSearchLoading(true);
        try {
            const [prodsRes, catsRes, ordersRes, usersRes, offersRes] = await Promise.all([
                api.get("products/").catch(() => ({ data: [] })),
                api.get("categories/").catch(() => ({ data: [] })),
                api.get("orders/").catch(() => ({ data: [] })),
                api.get("users/").catch(() => ({ data: [] })),
                api.get("offers/").catch(() => ({ data: [] })),
            ]);
            setSearchCatalog({
                products: Array.isArray(prodsRes.data) ? prodsRes.data : [],
                categories: Array.isArray(catsRes.data) ? catsRes.data : [],
                orders: Array.isArray(ordersRes.data) ? ordersRes.data : [],
                users: Array.isArray(usersRes.data) ? usersRes.data : [],
                offers: Array.isArray(offersRes.data) ? offersRes.data : [],
            });
            searchDataLoaded.current = true;
        } catch (err) {
            console.error("Error cargando catálogo de búsqueda:", err);
        } finally {
            setIsSearchLoading(false);
        }
    };

    // Búsqueda en tiempo real sobre datos reales
    const searchResults = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query || query.length < 1) return null;

        const res = {
            productos: [],
            categorias: [],
            pedidos: [],
            ofertas: [],
            usuarios: [],
        };

        // 1. Productos (nombre, SKU/slug, categoría)
        (searchCatalog.products || []).forEach((p) => {
            const matchNombre = p.nombre?.toLowerCase().includes(query);
            const matchSlug = p.slug?.toLowerCase().includes(query);
            const matchSku = String(p.id_producto).includes(query);
            const matchCat = p.categoria?.nombre?.toLowerCase().includes(query);
            if (matchNombre || matchSlug || matchSku || matchCat) {
                res.productos.push({
                    id: p.id_producto,
                    title: p.nombre,
                    subtitle: `SKU: ${p.slug || `PRO-${p.id_producto}`} · $${Number(p.precio || 0).toLocaleString("es-CO")}`,
                    path: `/admin/products`,
                });
            }
        });

        // 2. Categorías (nombre)
        (searchCatalog.categories || []).forEach((c) => {
            if (c.nombre?.toLowerCase().includes(query)) {
                res.categorias.push({
                    id: c.id_categoria,
                    title: c.nombre,
                    subtitle: c.categoria_padre ? `Subcategoría de ${c.categoria_padre.nombre}` : "Categoría principal",
                    path: `/admin/categories`,
                });
            }
        });

        // 3. Pedidos (referencia, cliente, id)
        (searchCatalog.orders || []).forEach((o) => {
            const matchRef = o.referencia?.toLowerCase().includes(query);
            const matchId = String(o.id_compra).includes(query);
            const matchClient = o.nombre_cliente?.toLowerCase().includes(query);
            const matchEmail = o.correo_cliente?.toLowerCase().includes(query);
            if (matchRef || matchId || matchClient || matchEmail) {
                res.pedidos.push({
                    id: o.id_compra,
                    title: o.referencia || `#MVC-${String(o.id_compra).padStart(5, "0")}`,
                    subtitle: `${o.nombre_cliente || "Cliente"} · $${Number(o.total || 0).toLocaleString("es-CO")} · ${o.estado_compra || "Pendiente"}`,
                    path: `/admin/orders`,
                });
            }
        });

        // 4. Ofertas (nombre, descripción)
        (searchCatalog.offers || []).forEach((of) => {
            if (of.nombre?.toLowerCase().includes(query) || of.descripcion?.toLowerCase().includes(query)) {
                res.ofertas.push({
                    id: of.id_oferta,
                    title: of.nombre,
                    subtitle: `${of.tipo_descuento === "porcentaje" ? `${of.valor}%` : `$${Number(of.valor).toLocaleString("es-CO")}`} · ${of.activa ? "Activa" : "Inactiva"}`,
                    path: `/admin/offers`,
                });
            }
        });

        // 5. Usuarios (nombre, email, teléfono)
        (searchCatalog.users || []).forEach((u) => {
            const nombreCompleto = `${u.nombres || ""} ${u.apellidos || ""}`.toLowerCase();
            const matchNombre = nombreCompleto.includes(query);
            const matchEmail = u.email?.toLowerCase().includes(query);
            const matchTel = u.telefono?.includes(query);
            if (matchNombre || matchEmail || matchTel) {
                res.usuarios.push({
                    id: u.id_usuario,
                    title: `${u.nombres} ${u.apellidos}`.trim() || u.email,
                    subtitle: `${u.email} · ${u.is_staff ? "Administrador" : "Cliente"}`,
                    path: `/admin/users`,
                });
            }
        });

        return res;
    }, [searchQuery, searchCatalog]);

    const totalResultados = searchResults
        ? searchResults.productos.length +
          searchResults.categorias.length +
          searchResults.pedidos.length +
          searchResults.ofertas.length +
          searchResults.usuarios.length
        : 0;

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
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchResultsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Cerrar menú móvil al cambiar de ruta
    useEffect(() => {
        setMobileMenuOpen(false);
        setSearchResultsOpen(false);
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

                {/* BUSCADOR REAL */}
                <div className="admin-topnav-center" ref={searchRef}>
                    <div className="admin-search-wrapper">
                        <Search size={15} className="admin-search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar productos, categorías, pedidos, usuarios..."
                            value={searchQuery}
                            onFocus={() => {
                                ensureSearchData();
                                setSearchResultsOpen(true);
                            }}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                ensureSearchData();
                                setSearchResultsOpen(true);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                    setSearchResultsOpen(false);
                                }
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="admin-search-clear-btn"
                                onClick={() => setSearchQuery("")}
                                aria-label="Limpiar búsqueda"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* DROPDOWN DE RESULTADOS EN TIEMPO REAL */}
                    {searchResultsOpen && searchQuery.trim().length >= 1 && (
                        <div className="admin-search-results-dropdown">
                            <div className="search-results-header">
                                <span>Resultados para "{searchQuery}"</span>
                                {isSearchLoading ? (
                                    <span className="search-loading-tag">
                                        <Loader2 size={12} className="spin" /> Buscando...
                                    </span>
                                ) : (
                                    <span className="search-results-count">
                                        {totalResultados} encontrado{totalResultados !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>

                            <div className="search-results-scrollable">
                                {totalResultados === 0 && !isSearchLoading ? (
                                    <div className="search-empty-results">
                                        <p>No se encontraron resultados en el panel administrativo</p>
                                        <small>Prueba buscando por nombre de producto, SKU, categoría, pedido o usuario</small>
                                    </div>
                                ) : (
                                    <>
                                        {/* 1. PRODUCTOS */}
                                        {searchResults?.productos.length > 0 && (
                                            <div className="search-results-group">
                                                <div className="search-group-title">
                                                    <Package size={13} />
                                                    <span>Productos ({searchResults.productos.length})</span>
                                                </div>
                                                {searchResults.productos.map((item) => (
                                                    <div
                                                        key={`prod-${item.id}`}
                                                        className="search-result-item"
                                                        onClick={() => {
                                                            navigate(item.path);
                                                            setSearchResultsOpen(false);
                                                            setSearchQuery("");
                                                        }}
                                                    >
                                                        <div className="item-info">
                                                            <strong className="item-title">{item.title}</strong>
                                                            <span className="item-sub">{item.subtitle}</span>
                                                        </div>
                                                        <ArrowRight size={13} className="item-arrow" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* 2. CATEGORÍAS */}
                                        {searchResults?.categorias.length > 0 && (
                                            <div className="search-results-group">
                                                <div className="search-group-title">
                                                    <FolderTree size={13} />
                                                    <span>Categorías ({searchResults.categorias.length})</span>
                                                </div>
                                                {searchResults.categorias.map((item) => (
                                                    <div
                                                        key={`cat-${item.id}`}
                                                        className="search-result-item"
                                                        onClick={() => {
                                                            navigate(item.path);
                                                            setSearchResultsOpen(false);
                                                            setSearchQuery("");
                                                        }}
                                                    >
                                                        <div className="item-info">
                                                            <strong className="item-title">{item.title}</strong>
                                                            <span className="item-sub">{item.subtitle}</span>
                                                        </div>
                                                        <ArrowRight size={13} className="item-arrow" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* 3. PEDIDOS */}
                                        {searchResults?.pedidos.length > 0 && (
                                            <div className="search-results-group">
                                                <div className="search-group-title">
                                                    <ShoppingCart size={13} />
                                                    <span>Pedidos ({searchResults.pedidos.length})</span>
                                                </div>
                                                {searchResults.pedidos.map((item) => (
                                                    <div
                                                        key={`order-${item.id}`}
                                                        className="search-result-item"
                                                        onClick={() => {
                                                            navigate(item.path);
                                                            setSearchResultsOpen(false);
                                                            setSearchQuery("");
                                                        }}
                                                    >
                                                        <div className="item-info">
                                                            <strong className="item-title">{item.title}</strong>
                                                            <span className="item-sub">{item.subtitle}</span>
                                                        </div>
                                                        <ArrowRight size={13} className="item-arrow" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* 4. OFERTAS */}
                                        {searchResults?.ofertas.length > 0 && (
                                            <div className="search-results-group">
                                                <div className="search-group-title">
                                                    <Percent size={13} />
                                                    <span>Ofertas ({searchResults.ofertas.length})</span>
                                                </div>
                                                {searchResults.ofertas.map((item) => (
                                                    <div
                                                        key={`offer-${item.id}`}
                                                        className="search-result-item"
                                                        onClick={() => {
                                                            navigate(item.path);
                                                            setSearchResultsOpen(false);
                                                            setSearchQuery("");
                                                        }}
                                                    >
                                                        <div className="item-info">
                                                            <strong className="item-title">{item.title}</strong>
                                                            <span className="item-sub">{item.subtitle}</span>
                                                        </div>
                                                        <ArrowRight size={13} className="item-arrow" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* 5. USUARIOS */}
                                        {searchResults?.usuarios.length > 0 && (
                                            <div className="search-results-group">
                                                <div className="search-group-title">
                                                    <Users size={13} />
                                                    <span>Usuarios ({searchResults.usuarios.length})</span>
                                                </div>
                                                {searchResults.usuarios.map((item) => (
                                                    <div
                                                        key={`user-${item.id}`}
                                                        className="search-result-item"
                                                        onClick={() => {
                                                            navigate(item.path);
                                                            setSearchResultsOpen(false);
                                                            setSearchQuery("");
                                                        }}
                                                    >
                                                        <div className="item-info">
                                                            <strong className="item-title">{item.title}</strong>
                                                            <span className="item-sub">{item.subtitle}</span>
                                                        </div>
                                                        <ArrowRight size={13} className="item-arrow" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
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
