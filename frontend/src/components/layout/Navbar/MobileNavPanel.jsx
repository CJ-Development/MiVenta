import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    X,
    Home,
    Package,
    User,
    Heart,
    Baby,
    PawPrint,
    Laptop,
    Watch,
    Shirt,
    ShoppingBag,
    ChevronDown,
    ShoppingCart,
    LogOut,
    LayoutDashboard,
    Info,
} from "lucide-react";

import api from "../../../services/api";
import { useAuth } from "../../../hooks/useAuth";

import { esAdmin } from "../../../utils/esAdmin";
import Logo from "./Logo";

/* ── Icono por nombre de categoría ── */
const getCategoryIcon = (nombre = "") => {
    const n = nombre.toLowerCase();
    if (n.includes("hombre") || n.includes("caballero")) return User;
    if (n.includes("mujer") || n.includes("dama") || n.includes("señora")) return Heart;
    if (n.includes("niñ") || n.includes("bebé") || n.includes("bebe")) return Baby;
    if (n.includes("mascot") || n.includes("perro") || n.includes("gato")) return PawPrint;
    if (n.includes("tecnolog") || n.includes("electrónic") || n.includes("laptop")) return Laptop;
    if (n.includes("accesorio") || n.includes("reloj") || n.includes("gafas")) return Watch;
    if (n.includes("ropa") || n.includes("vestido") || n.includes("camisa")) return Shirt;
    if (n.includes("calzado") || n.includes("zapato")) return ShoppingBag;
    return Package;
};

const itemHref = (slug, id) => (slug ? `/categoria/${slug}` : `/categoria/${id}`);

/* ── Item de categoría (expandible si tiene subcategorías) ── */
function CategoryItem({ cat, onClose, level = 1 }) {
    const [open, setOpen] = useState(false);
    const hasChildren = Array.isArray(cat.subcategorias) && cat.subcategorias.length > 0;
    const Icon = getCategoryIcon(cat.nombre);

    return (
        <div className={`mobile-nav-category-group mobile-nav-category-group--level-${level}`}>
            {hasChildren ? (
                <>
                    <button
                        className={`mobile-nav-category-toggle mobile-nav-category-toggle--level-${level}`}
                        onClick={() => setOpen((v) => !v)}
                        aria-expanded={open}
                    >
                        <span className="mobile-nav-category-toggle-inner">
                            {level === 1 && <Icon size={16} color="var(--color-primary)" />}
                            {cat.nombre}
                        </span>
                        <ChevronDown
                            size={16}
                            className={`mobile-nav-category-chevron${
                                open ? " mobile-nav-category-chevron--open" : ""
                            }`}
                        />
                    </button>

                    {open && (
                        <div className={`mobile-nav-subcats mobile-nav-subcats--level-${level}`}>
                            {level === 1 && (
                                <Link
                                    to={itemHref(cat.slug, cat.id_categoria)}
                                    className="mobile-nav-subcat-link mobile-nav-subcat-link--all"
                                    onClick={onClose}
                                >
                                    Ver todo en {cat.nombre}
                                </Link>
                            )}
                            {cat.subcategorias.map((sub) => (
                                <SubCategoryItem
                                    key={sub.id_categoria}
                                    sub={sub}
                                    onClose={onClose}
                                    level={level + 1}
                                />
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <Link
                    to={itemHref(cat.slug, cat.id_categoria)}
                    className={`mobile-nav-item mobile-nav-item--level-${level}`}
                    onClick={onClose}
                >
                    {level === 1 && <Icon size={16} />}
                    {cat.nombre}
                </Link>
            )}
        </div>
    );
}

/* ── Item de subcategoría (expandible si tiene sub-subcategorías) ── */
function SubCategoryItem({ sub, onClose, level }) {
    const [open, setOpen] = useState(false);
    const hasChildren = Array.isArray(sub.subcategorias) && sub.subcategorias.length > 0;

    return (
        <div className={`mobile-nav-category-group mobile-nav-category-group--level-${level}`}>
            {hasChildren ? (
                <>
                    <button
                        className={`mobile-nav-category-toggle mobile-nav-category-toggle--level-${level}`}
                        onClick={() => setOpen((v) => !v)}
                        aria-expanded={open}
                    >
                        <span className="mobile-nav-category-toggle-inner">
                            {sub.nombre}
                        </span>
                        <ChevronDown
                            size={16}
                            className={`mobile-nav-category-chevron${
                                open ? " mobile-nav-category-chevron--open" : ""
                            }`}
                        />
                    </button>

                    {open && (
                        <div className={`mobile-nav-subcats mobile-nav-subcats--level-${level}`}>
                            <Link
                                to={itemHref(sub.slug, sub.id_categoria)}
                                className="mobile-nav-subcat-link mobile-nav-subcat-link--all"
                                onClick={onClose}
                            >
                                Ver todo en {sub.nombre}
                            </Link>
                            {sub.subcategorias.map((subsub) => (
                                <Link
                                    key={subsub.id_categoria}
                                    to={itemHref(subsub.slug, subsub.id_categoria)}
                                    className="mobile-nav-subcat-link mobile-nav-subcat-link--level-3"
                                    onClick={onClose}
                                >
                                    {subsub.nombre}
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <Link
                    to={itemHref(sub.slug, sub.id_categoria)}
                    className={`mobile-nav-subcat-link mobile-nav-subcat-link--level-${level}`}
                    onClick={onClose}
                >
                    {sub.nombre}
                </Link>
            )}
        </div>
    );
}

/* ── Panel principal ── */
function MobileNavPanel({ open, onClose }) {
    const { usuario, logout } = useAuth();

    const isAdmin = esAdmin(usuario);
    const [categorias, setCategorias] = useState([]);

    /* Cargar categorías solo cuando el panel se abre */
    useEffect(() => {
        if (!open) return;
        let cancelado = false;

        api.get("/categories/")
            .then((res) => {
                if (cancelado) return;
                const data = Array.isArray(res.data) ? res.data : [];
                const raices = data.filter(
                    (c) =>
                        c?.estado !== "archivado" &&
                        c?.id_categoria_padre == null &&
                        (c?.categoria_padre == null || c?.categoria_padre === "")
                );
                setCategorias(raices);
            })
            .catch(() => {});

        return () => {
            cancelado = true;
        };
    }, [open]);

    /* Bloquear scroll del body mientras el panel está abierto */
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!open) return null;

    return (
        <>
            {/* Overlay oscuro */}
            <div
                className="mobile-nav-overlay"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel lateral */}
            <aside className="mobile-nav-panel" aria-label="Menú de navegación">

                {/* ── Header ── */}
                <div className="mobile-nav-header">
                    <Logo />
                    <button
                        className="mobile-nav-close"
                        onClick={onClose}
                        aria-label="Cerrar menú"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── Cuerpo ── */}
                <nav className="mobile-nav-body">

                    {/* Inicio */}
                    <Link
                        to="/"
                        className="mobile-nav-item mobile-nav-item--home"
                        onClick={onClose}
                    >
                        <Home size={16} />
                        Inicio
                    </Link>

                    {/* Todos los productos */}
                    <Link
                        to="/products"
                        className="mobile-nav-item"
                        onClick={onClose}
                    >
                        <Package size={16} />
                        Todos los productos
                    </Link>

                    {/* Carrito */}
                    <Link
                        to="/cart"
                        className="mobile-nav-item"
                        onClick={onClose}
                    >
                        <ShoppingCart size={16} />
                        Mi carrito
                    </Link>

                    {/* Categorías dinámicas */}
                    {categorias.length > 0 && (
                        <>
                            <div className="mobile-nav-section-title">Categorías</div>
                            {categorias.map((cat) => (
                                <CategoryItem
                                    key={cat.id_categoria}
                                    cat={cat}
                                    onClose={onClose}
                                    level={1}
                                />
                            ))}
                        </>
                    )}

                    {/* Nosotros */}
                    <div className="mobile-nav-section-title">Información</div>
                    <Link
                        to="/nosotros"
                        className="mobile-nav-item"
                        onClick={onClose}
                    >
                        <Info size={16} />
                        Nosotros
                    </Link>

                    {/* Panel admin — solo para administradores */}
                    {isAdmin && (
                        <>
                            <div className="mobile-nav-section-title">Administración</div>
                            <Link
                                to="/admin"
                                className="mobile-nav-item"
                                onClick={onClose}
                            >
                                <LayoutDashboard size={16} />
                                Panel administrativo
                            </Link>
                        </>
                    )}

                </nav>

                {/* ── Footer — solo si el usuario está logueado ── */}
                {usuario && (
                    <div className="mobile-nav-footer">
                        <Link
                            to="/perfil"
                            className="mobile-nav-auth-link"
                            onClick={onClose}
                        >
                            <User size={16} />
                            Mi perfil
                        </Link>



                        <button
                            className="mobile-nav-auth-link mobile-nav-auth-link--danger"
                            onClick={() => {
                                logout();
                                onClose();
                            }}
                        >
                            <LogOut size={16} />
                            Cerrar sesión
                        </button>
                    </div>
                )}

            </aside>
        </>
    );
}

export default MobileNavPanel;
