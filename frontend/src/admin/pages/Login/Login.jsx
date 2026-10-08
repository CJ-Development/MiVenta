import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Lock,
    Mail,
    Loader2,
    LogIn,
    ShoppingBag,
    Package,
    BarChart3,
    ArrowLeft,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import SEO from "../../../components/SEO/SEO";
import logoImg from "../../../assets/images/Logo miVenta.co con bolsa y envío.png";

import "./Login.css";

function AdminLogin() {
    const { login, logout } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email.trim() || !password) {
            setError("Por favor completa todos los campos.");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const userData = await login(email.trim(), password);

            const isAdmin =
                userData?.is_staff === true ||
                userData?.is_superuser === true ||
                userData?.tipo_usuario === "admin";

            if (isAdmin) {
                navigate("/admin");
                return;
            }

            setError("No tienes permisos de administrador.");

            // Usar el logout existente del AuthProvider.
            if (typeof logout === "function") {
                await logout();
            }
        } catch (err) {
            console.error("Error al iniciar sesión:", err);

            setError(
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                "Error al iniciar sesión. Verifica tus credenciales."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="mv-login-page">

            <SEO
                title="Administración — miVenta.co"
                description="Acceso administrativo a miVenta.co. Solo para personal autorizado."
                path="/admin/login"
                noindex={true}
            />

            {/* PANEL IZQUIERDO */}
            <div className="mv-login-left">
                <div className="mv-login-brand">
                    <div className="mv-login-brand-logo-wrap">
                        <img
                            src={logoImg}
                            alt="miVenta.co"
                            className="mv-login-brand-logo-img"
                        />
                    </div>

                    <p className="mv-login-brand-title">Panel de administración</p>
                    <p className="mv-login-brand-desc">
                        Gestiona tu tienda, productos, pedidos y mucho más.
                    </p>

                    <div className="mv-login-icons">
                        <div className="mv-login-icon-block">
                            <ShoppingBag size={22} />
                        </div>
                        <div className="mv-login-icon-block">
                            <Package size={22} />
                        </div>
                        <div className="mv-login-icon-block">
                            <BarChart3 size={22} />
                        </div>
                    </div>
                </div>
            </div>

            {/* PANEL DERECHO */}
            <div className="mv-login-right">
                <div className="mv-login-form-wrap">

                    <div className="mv-login-form-logo-wrap">
                        <img
                            src={logoImg}
                            alt="miVenta.co"
                            className="mv-login-form-logo-img"
                        />
                    </div>

                    <h1 className="mv-login-form-title">Iniciar sesión</h1>
                    <p className="mv-login-form-subtitle">Ingresa al panel para continuar</p>

                    {error && (
                        <div className="mv-login-error-alert" role="alert">
                            {error}
                        </div>
                    )}

                    <form className="mv-login-form" onSubmit={handleSubmit}>

                        {/* EMAIL */}
                        <div className="mv-login-field">
                            <label className="mv-login-label" htmlFor="email">
                                Correo electrónico
                            </label>
                            <input
                                className="mv-login-input"
                                type="email"
                                id="email"
                                name="email"
                                autoComplete="username"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ejemplo@tudominio.com"
                                disabled={loading}
                                required
                            />
                        </div>

                        {/* PASSWORD */}
                        <div className="mv-login-field">
                            <label className="mv-login-label" htmlFor="password">
                                Contraseña
                            </label>
                            <input
                                className="mv-login-input"
                                type="password"
                                id="password"
                                name="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                disabled={loading}
                                required
                            />
                        </div>

                        {/* BOTÓN */}
                        <button
                            type="submit"
                            className="mv-login-submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="mv-login-spin" />
                                    <span>Iniciando sesión...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    <span>Iniciar sesión</span>
                                </>
                            )}
                        </button>

                    </form>

                    {/* SEPARADOR */}
                    <div className="mv-login-divider">
                        <span />
                        <i />
                        <span />
                    </div>

                    {/* VOLVER */}
                    <button
                        type="button"
                        className="mv-login-back-btn"
                        onClick={() => navigate("/")}
                        disabled={loading}
                    >
                        <ArrowLeft size={18} />
                        <span>Volver a la tienda</span>
                    </button>

                </div>
            </div>

        </main>
    );
}

export default AdminLogin;