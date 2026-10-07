import {
    User,
    Heart,
    Package,
    SignOut,
    Gear,
    LayoutDashboard,
    Users,
    PackagePlus,
    Storefront
} from "@phosphor-icons/react";

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

function UserMenu() {
    const { usuario, logout } = useAuth();

    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    /* ==========================================
       USUARIO NO AUTENTICADO
       ========================================== */
    // Clientes compran como invitados, no hay login público
    if (!usuario) {
        return null;
    }

    // El backend envía is_superuser / is_staff / tipo_usuario.
    // El campo `rol` no existe, por eso siempre daba cliente.
    const esAdmin =
        usuario?.is_superuser === true ||
        usuario?.tipo_usuario === "admin";

    /* ==========================================
       USUARIO AUTENTICADO — ADMIN (rol === 2)
    ========================================== */

    if (esAdmin) {
        return (
            <div className="user-menu">

                <button
                    type="button"
                    className="icon-button user-login"
                >
                    <User size={18} weight="bold" />
                    <span>{usuario.nombres}</span>
                </button>

                <div className="user-dropdown">

                    <Link to="/admin">
                        <LayoutDashboard size={18} weight="bold" />
                        <span>Panel administrador</span>
                    </Link>

                    <Link to="/admin/products">
                        <PackagePlus size={18} weight="bold" />
                        <span>Gestionar productos</span>
                    </Link>

                    <Link to="/admin/users">
                        <Users size={18} weight="bold" />
                        <span>Gestionar usuarios</span>
                    </Link>

                    <Link to="/">
                        <Storefront size={18} weight="bold" />
                        <span>Volver a la tienda</span>
                    </Link>

                    <button
                        type="button"
                        onClick={handleLogout}
                    >
                        <SignOut size={18} weight="bold" />
                        <span>Cerrar sesión</span>
                    </button>

                </div>

            </div>
        );
    }

    /* ==========================================
       USUARIO AUTENTICADO — CLIENTE
    ========================================== */

    return (
        <div className="user-menu">

            <button
                type="button"
                className="icon-button user-login"
            >
                <User size={18} />
                <span>{usuario.nombres}</span>
            </button>

            <div className="user-dropdown">

                <Link to="/profile">
                    <User size={18} weight="bold" />
                    <span>Mi perfil</span>
                </Link>

                <Link to="/orders">
                    <Package size={18} weight="bold" />
                    <span>Mis pedidos</span>
                </Link>

                <Link to="/favorites">
                    <Heart size={18} weight="bold" />
                    <span>Favoritos</span>
                </Link>

                <Link to="/settings">
                    <Gear size={18} weight="bold" />
                    <span>Configuración</span>
                </Link>

                <button
                    type="button"
                    onClick={handleLogout}
                >
                    <SignOut size={18} weight="bold" />
                    <span>Cerrar sesión</span>
                </button>

            </div>

        </div>
    );
}

export default UserMenu;