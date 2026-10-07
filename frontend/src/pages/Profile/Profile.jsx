import "./Profile.css";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNotification } from "../../components/Notifications/NotificationProvider";
import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";

import {
    updateMyProfile,
    changePassword,
} from "../../services/clientService";
import {
    getMisDirecciones,
    crearDireccion,
    eliminarDireccion,
    marcarPredeterminada,
} from "../../services/addressService";

import {
    User,
    Mail,
    Phone,
    Calendar,
    MapPin,
    Lock,
    Pencil,
    BadgeCheck,
    Package,
    Heart,
    LogOut,
    ChevronRight,
    Plus,
    Headphones,
    ShieldCheck,
    ShoppingCart,
    Trash2,
    Star,
    X,
    Eye,
    EyeOff,
} from "lucide-react";

/* =========================================================
   COMPONENTE: MODAL GENÉRICO
   ========================================================= */

function Modal({ open, title, onClose, children, maxWidth = 520 }) {
    if (!open) return null;

    return (
        <div
            className="profile-modal-backdrop"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="profile-modal"
                style={{ maxWidth }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="profile-modal-header">
                    <h3>{title}</h3>
                    <button
                        type="button"
                        className="profile-modal-close"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="profile-modal-body">{children}</div>
            </div>
        </div>
    );
}

/* =========================================================
   COMPONENTE: MODAL EDITAR DATOS
   ========================================================= */

function EditarPerfilModal({ open, onClose, usuario, onSaved }) {
    const { success, error: showError } = useNotification();

    const [form, setForm] = useState({
        nombres: "",
        apellidos: "",
        email: "",
        telefono: "",
        fecha_nacimiento: "",
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open && usuario) {
            setForm({
                nombres: usuario.nombres || "",
                apellidos: usuario.apellidos || "",
                email: usuario.email || "",
                telefono: usuario.telefono || "",
                fecha_nacimiento: usuario.fecha_nacimiento || "",
            });
            setErrors({});
        }
    }, [open, usuario]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        const next = {};

        if (!form.nombres.trim() || form.nombres.trim().length < 2) {
            next.nombres = "Ingresa tus nombres";
        }
        if (!form.apellidos.trim() || form.apellidos.trim().length < 2) {
            next.apellidos = "Ingresa tus apellidos";
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email.trim())) {
            next.email = "Correo inválido";
        }

        const phoneRegex = /^[0-9+\s-]{7,15}$/;
        if (!phoneRegex.test(form.telefono.trim())) {
            next.telefono = "Celular inválido";
        }

        if (form.fecha_nacimiento) {
            const birth = new Date(form.fecha_nacimiento);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            if (age < 18) {
                next.fecha_nacimiento = "Debes tener al menos 18 años";
            }
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            showError("Revisa los campos marcados");
            return;
        }

        if (!usuario?.id_usuario) {
            showError("No se encontró la sesión del usuario");
            return;
        }

        try {
            setLoading(true);

            const payload = {
                nombres: form.nombres.trim(),
                apellidos: form.apellidos.trim(),
                email: form.email.trim(),
                telefono: form.telefono.trim(),
                fecha_nacimiento: form.fecha_nacimiento || null,
            };

            const { data } = await updateMyProfile(
                usuario.id_usuario,
                payload
            );

            onSaved(data);
            success("Datos actualizados correctamente");
            onClose();
        } catch (err) {
            console.error("Error actualizando perfil:", err);

            const data = err?.response?.data;
            let msg = "No fue posible actualizar los datos";

            if (data) {
                if (typeof data === "string") {
                    msg = data;
                } else if (data.detail) {
                    msg = data.detail;
                } else if (data.error) {
                    msg = data.error;
                } else if (data.email) {
                    msg = Array.isArray(data.email) ? data.email[0] : data.email;
                }
            }

            showError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Editar datos personales" maxWidth={560}>
            <form onSubmit={handleSubmit} className="profile-form">
                <div className="profile-form-row">
                    <div className="profile-form-group">
                        <label htmlFor="edit-nombres">Nombres</label>
                        <input
                            id="edit-nombres"
                            name="nombres"
                            type="text"
                            value={form.nombres}
                            onChange={handleChange}
                            className={errors.nombres ? "has-error" : ""}
                        />
                        {errors.nombres && (
                            <span className="profile-field-error">{errors.nombres}</span>
                        )}
                    </div>

                    <div className="profile-form-group">
                        <label htmlFor="edit-apellidos">Apellidos</label>
                        <input
                            id="edit-apellidos"
                            name="apellidos"
                            type="text"
                            value={form.apellidos}
                            onChange={handleChange}
                            className={errors.apellidos ? "has-error" : ""}
                        />
                        {errors.apellidos && (
                            <span className="profile-field-error">{errors.apellidos}</span>
                        )}
                    </div>
                </div>

                <div className="profile-form-group">
                    <label htmlFor="edit-email">Correo electrónico</label>
                    <input
                        id="edit-email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        className={errors.email ? "has-error" : ""}
                    />
                    {errors.email && (
                        <span className="profile-field-error">{errors.email}</span>
                    )}
                </div>

                <div className="profile-form-row">
                    <div className="profile-form-group">
                        <label htmlFor="edit-telefono">Celular</label>
                        <input
                            id="edit-telefono"
                            name="telefono"
                            type="tel"
                            value={form.telefono}
                            onChange={handleChange}
                            className={errors.telefono ? "has-error" : ""}
                        />
                        {errors.telefono && (
                            <span className="profile-field-error">{errors.telefono}</span>
                        )}
                    </div>

                    <div className="profile-form-group">
                        <label htmlFor="edit-fecha">Fecha de nacimiento</label>
                        <input
                            id="edit-fecha"
                            name="fecha_nacimiento"
                            type="date"
                            value={form.fecha_nacimiento}
                            onChange={handleChange}
                            className={errors.fecha_nacimiento ? "has-error" : ""}
                        />
                        {errors.fecha_nacimiento && (
                            <span className="profile-field-error">{errors.fecha_nacimiento}</span>
                        )}
                    </div>
                </div>

                <div className="profile-form-actions">
                    <button
                        type="button"
                        className="profile-outline-button"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="profile-primary-button"
                        disabled={loading}
                    >
                        {loading ? "Guardando..." : "Guardar cambios"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

/* =========================================================
   COMPONENTE: MODAL NUEVA DIRECCIÓN
   ========================================================= */

function NuevaDireccionModal({ open, onClose, usuarioId, onCreated }) {
    const { success, error: showError } = useNotification();

    const [form, setForm] = useState({
        direccion: "",
        ciudad: "",
        departamento: "",
        codigo_postal: "",
        predeterminada: false,
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open) {
            setForm({
                direccion: "",
                ciudad: "",
                departamento: "",
                codigo_postal: "",
                predeterminada: false,
            });
            setErrors({});
        }
    }, [open]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const validate = () => {
        const next = {};

        if (!form.direccion.trim() || form.direccion.trim().length < 5) {
            next.direccion = "Ingresa la dirección completa";
        }
        if (!form.ciudad.trim()) {
            next.ciudad = "Ingresa la ciudad";
        }
        if (!form.departamento.trim()) {
            next.departamento = "Ingresa el departamento";
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            showError("Revisa los campos marcados");
            return;
        }

        if (!usuarioId) {
            showError("No se encontró la sesión del usuario");
            return;
        }

        try {
            setLoading(true);

            const payload = {
                usuario: usuarioId,
                direccion: form.direccion.trim(),
                ciudad: form.ciudad.trim(),
                departamento: form.departamento.trim(),
                codigo_postal: form.codigo_postal.trim() || null,
                predeterminada: form.predeterminada,
            };

            const { data } = await crearDireccion(payload);

            onCreated(data);
            success("Dirección agregada");
            onClose();
        } catch (err) {
            console.error("Error creando dirección:", err);

            const data = err?.response?.data;
            let msg = "No fue posible crear la dirección";

            if (data) {
                if (typeof data === "string") {
                    msg = data;
                } else if (data.detail) {
                    msg = data.detail;
                } else if (data.error) {
                    msg = data.error;
                } else if (data.direccion) {
                    msg = Array.isArray(data.direccion) ? data.direccion[0] : data.direccion;
                } else if (data.ciudad) {
                    msg = Array.isArray(data.ciudad) ? data.ciudad[0] : data.ciudad;
                } else if (data.departamento) {
                    msg = Array.isArray(data.departamento) ? data.departamento[0] : data.departamento;
                }
            }

            showError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Nueva dirección" maxWidth={520}>
            <form onSubmit={handleSubmit} className="profile-form">
                <div className="profile-form-group">
                    <label htmlFor="dir-direccion">Dirección</label>
                    <input
                        id="dir-direccion"
                        name="direccion"
                        type="text"
                        value={form.direccion}
                        onChange={handleChange}
                        placeholder="Ej: Calle 100 #15-20"
                        className={errors.direccion ? "has-error" : ""}
                    />
                    {errors.direccion && (
                        <span className="profile-field-error">{errors.direccion}</span>
                    )}
                </div>

                <div className="profile-form-row">
                    <div className="profile-form-group">
                        <label htmlFor="dir-ciudad">Ciudad</label>
                        <input
                            id="dir-ciudad"
                            name="ciudad"
                            type="text"
                            value={form.ciudad}
                            onChange={handleChange}
                            placeholder="Ej: Bogotá"
                            className={errors.ciudad ? "has-error" : ""}
                        />
                        {errors.ciudad && (
                            <span className="profile-field-error">{errors.ciudad}</span>
                        )}
                    </div>

                    <div className="profile-form-group">
                        <label htmlFor="dir-departamento">Departamento</label>
                        <input
                            id="dir-departamento"
                            name="departamento"
                            type="text"
                            value={form.departamento}
                            onChange={handleChange}
                            placeholder="Ej: Cundinamarca"
                            className={errors.departamento ? "has-error" : ""}
                        />
                        {errors.departamento && (
                            <span className="profile-field-error">{errors.departamento}</span>
                        )}
                    </div>
                </div>

                <div className="profile-form-group">
                    <label htmlFor="dir-cp">Código postal (opcional)</label>
                    <input
                        id="dir-cp"
                        name="codigo_postal"
                        type="text"
                        value={form.codigo_postal}
                        onChange={handleChange}
                        placeholder="Ej: 110111"
                    />
                </div>

                <label className="profile-checkbox">
                    <input
                        type="checkbox"
                        name="predeterminada"
                        checked={form.predeterminada}
                        onChange={handleChange}
                    />
                    <span>Marcar como dirección predeterminada</span>
                </label>

                <div className="profile-form-actions">
                    <button
                        type="button"
                        className="profile-outline-button"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="profile-primary-button"
                        disabled={loading}
                    >
                        {loading ? "Guardando..." : "Guardar dirección"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

/* =========================================================
   COMPONENTE: MODAL CAMBIAR CONTRASEÑA
   ========================================================= */

function CambiarPasswordModal({ open, onClose, usuarioId }) {
    const { success, error: showError } = useNotification();

    const [form, setForm] = useState({
        password_actual: "",
        password_nuevo: "",
        password_confirm: "",
    });

    const [showActual, setShowActual] = useState(false);
    const [showNuevo, setShowNuevo] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open) {
            setForm({
                password_actual: "",
                password_nuevo: "",
                password_confirm: "",
            });
            setErrors({});
            setShowActual(false);
            setShowNuevo(false);
        }
    }, [open]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        const next = {};

        if (!form.password_actual) {
            next.password_actual = "Ingresa tu contraseña actual";
        }
        if (!form.password_nuevo) {
            next.password_nuevo = "Ingresa una nueva contraseña";
        } else if (form.password_nuevo.length < 6) {
            next.password_nuevo = "Mínimo 6 caracteres";
        }
        if (form.password_nuevo !== form.password_confirm) {
            next.password_confirm = "Las contraseñas no coinciden";
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            showError("Revisa los campos marcados");
            return;
        }

        if (!usuarioId) {
            showError("No se encontró la sesión del usuario");
            return;
        }

        try {
            setLoading(true);

            await changePassword(usuarioId, {
                password_actual: form.password_actual,
                password_nuevo: form.password_nuevo,
            });

            success("Contraseña actualizada");
            onClose();
        } catch (err) {
            console.error("Error cambiando contraseña:", err);

            const data = err?.response?.data;
            let msg = "No fue posible cambiar la contraseña";

            if (data) {
                if (data.error) {
                    msg = data.error;
                } else if (data.detail) {
                    msg = data.detail;
                } else if (data.password_actual) {
                    msg = Array.isArray(data.password_actual)
                        ? data.password_actual[0]
                        : data.password_actual;
                } else if (data.password_nuevo) {
                    msg = Array.isArray(data.password_nuevo)
                        ? data.password_nuevo[0]
                        : data.password_nuevo;
                }
            }

            showError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Cambiar contraseña" maxWidth={480}>
            <form onSubmit={handleSubmit} className="profile-form">
                <div className="profile-form-group">
                    <label htmlFor="pw-actual">Contraseña actual</label>
                    <div className="profile-input-icon">
                        <Lock size={16} />
                        <input
                            id="pw-actual"
                            name="password_actual"
                            type={showActual ? "text" : "password"}
                            value={form.password_actual}
                            onChange={handleChange}
                            autoComplete="current-password"
                            className={errors.password_actual ? "has-error" : ""}
                        />
                        <button
                            type="button"
                            className="profile-input-toggle"
                            onClick={() => setShowActual((s) => !s)}
                            aria-label="Mostrar u ocultar contraseña actual"
                        >
                            {showActual ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {errors.password_actual && (
                        <span className="profile-field-error">{errors.password_actual}</span>
                    )}
                </div>

                <div className="profile-form-group">
                    <label htmlFor="pw-nuevo">Nueva contraseña</label>
                    <div className="profile-input-icon">
                        <Lock size={16} />
                        <input
                            id="pw-nuevo"
                            name="password_nuevo"
                            type={showNuevo ? "text" : "password"}
                            value={form.password_nuevo}
                            onChange={handleChange}
                            autoComplete="new-password"
                            className={errors.password_nuevo ? "has-error" : ""}
                        />
                        <button
                            type="button"
                            className="profile-input-toggle"
                            onClick={() => setShowNuevo((s) => !s)}
                            aria-label="Mostrar u ocultar contraseña nueva"
                        >
                            {showNuevo ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {errors.password_nuevo && (
                        <span className="profile-field-error">{errors.password_nuevo}</span>
                    )}
                </div>

                <div className="profile-form-group">
                    <label htmlFor="pw-confirm">Confirmar nueva contraseña</label>
                    <div className="profile-input-icon">
                        <Lock size={16} />
                        <input
                            id="pw-confirm"
                            name="password_confirm"
                            type={showNuevo ? "text" : "password"}
                            value={form.password_confirm}
                            onChange={handleChange}
                            autoComplete="new-password"
                            className={errors.password_confirm ? "has-error" : ""}
                        />
                    </div>
                    {errors.password_confirm && (
                        <span className="profile-field-error">{errors.password_confirm}</span>
                    )}
                </div>

                <div className="profile-form-actions">
                    <button
                        type="button"
                        className="profile-outline-button"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="profile-primary-button"
                        disabled={loading}
                    >
                        {loading ? "Guardando..." : "Actualizar contraseña"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

/* =========================================================
   COMPONENTE PRINCIPAL
   ========================================================= */

function Profile() {
    const { usuario, logout, updateUsuario } = useAuth();

    const usuarioId = usuario?.id_usuario;

    const [selectedSection, setSelectedSection] = useState("datos");

    const [direcciones, setDirecciones] = useState([]);
    const [cargandoDirecciones, setCargandoDirecciones] = useState(false);
    const [eliminandoId, setEliminandoId] = useState(null);
    const [marcandoId, setMarcandoId] = useState(null);

    const [openEditar, setOpenEditar] = useState(false);
    const [openNuevaDir, setOpenNuevaDir] = useState(false);
    const [openPassword, setOpenPassword] = useState(false);

    const handleLogout = () => {
        logout();
    };

    /* Cargar direcciones cuando la sección esté activa */
    useEffect(() => {
        if (selectedSection === "direcciones" && usuarioId) {
            cargarDirecciones();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSection, usuarioId]);

    const cargarDirecciones = async () => {
        try {
            setCargandoDirecciones(true);
            const { data } = await getMisDirecciones(usuarioId);
            setDirecciones(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error cargando direcciones:", err);
            setDirecciones([]);
        } finally {
            setCargandoDirecciones(false);
        }
    };

    const handleEliminarDireccion = async (id) => {
        const ok = window.confirm("¿Eliminar esta dirección?");
        if (!ok) return;

        try {
            setEliminandoId(id);
            await eliminarDireccion(id);
            setDirecciones((prev) =>
                prev.filter((d) => d.id_direccion !== id)
            );
        } catch (err) {
            console.error("Error eliminando dirección:", err);
            window.alert("No fue posible eliminar la dirección");
        } finally {
            setEliminandoId(null);
        }
    };

    const handleMarcarPredeterminada = async (id) => {
        try {
            setMarcandoId(id);

            await marcarPredeterminada(id, usuarioId);

            // Reflejar en UI: la marcada queda predeterminada, las demás no
            setDirecciones((prev) =>
                prev.map((d) => ({
                    ...d,
                    predeterminada: d.id_direccion === id,
                }))
            );
        } catch (err) {
            console.error("Error marcando predeterminada:", err);
            window.alert("No fue posible marcar como predeterminada");
        } finally {
            setMarcandoId(null);
        }
    };

    const handlePerfilGuardado = (data) => {
        // El backend devuelve UsuarioSerializer; lo fusionamos con lo actual
        updateUsuario(data);
    };

    const handleDireccionCreada = (nueva) => {
        setDirecciones((prev) => {
            const siguiente = nueva.predeterminada
                ? prev.map((d) => ({ ...d, predeterminada: false }))
                : [...prev];
            return [nueva, ...siguiente];
        });
    };

    return (
        <main className="profile-page">
            <div className="profile-container">
                <Breadcrumb items={[{ label: "Mi cuenta" }]} />
            </div>

            {/* =========================
                ENCABEZADO DE PERFIL
            ========================= */}

            <section className="profile-hero">
                <div className="profile-hero-container">

                    <div className="profile-user-summary">
                        <div className="profile-summary-avatar">
                            {usuario?.nombres?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="profile-summary-info">
                            <h2>
                                {usuario?.nombres} {usuario?.apellidos}
                            </h2>
                            <span className="profile-verified">
                                <BadgeCheck size={15} />
                                Cliente verificado
                            </span>
                            <small>Miembro de Baúl Mágico Shop</small>
                        </div>
                    </div>
                </div>
            </section>

            {/* =========================
                CONTENIDO PRINCIPAL
            ========================= */}

            <div className="profile-layout">
                {/* =========================
                    MENÚ LATERAL
                ========================= */}

                <aside className="profile-sidebar">
                    <nav className="profile-navigation">
                        <button
                            className={selectedSection === "datos" ? "active" : ""}
                            onClick={() => setSelectedSection("datos")}
                            type="button"
                        >
                            <User size={18} />
                            <span>Datos personales</span>
                        </button>

                        <button
                            className={
                                selectedSection === "direcciones" ? "active" : ""
                            }
                            onClick={() => setSelectedSection("direcciones")}
                            type="button"
                        >
                            <MapPin size={18} />
                            <span>Direcciones</span>
                        </button>

                        <Link to="/orders">
                            <Package size={18} />
                            <span>Mis pedidos</span>
                        </Link>

                        <Link to="/cart">
                            <ShoppingCart size={18} />
                            <span>Mi carrito</span>
                        </Link>

                        <Link to="/favorites">
                            <Heart size={18} />
                            <span>Favoritos</span>
                        </Link>

                        <button
                            className={selectedSection === "seguridad" ? "active" : ""}
                            onClick={() => setSelectedSection("seguridad")}
                            type="button"
                        >
                            <Lock size={18} />
                            <span>Seguridad</span>
                        </button>

                        <button
                            className="profile-logout-link"
                            onClick={handleLogout}
                            type="button"
                        >
                            <LogOut size={18} />
                            <span>Cerrar sesión</span>
                        </button>
                    </nav>

                    <div className="profile-help">
                        <div className="profile-help-icon">
                            <Headphones size={25} />
                        </div>
                        <h3>¿Necesitas ayuda?</h3>
                        <p>Estamos para ayudarte</p>
                        <button type="button">Centro de ayuda</button>
                    </div>
                </aside>

                {/* =========================
                    CONTENIDO
                ========================= */}

                <div className="profile-content">
                    {/* =========================
                        SECCIÓN: DATOS PERSONALES
                    ========================= */}

                    {selectedSection === "datos" && (
                        <section className="profile-card">
                            <div className="profile-card-header">
                                <div>
                                    <h2>Información personal</h2>
                                    <p>
                                        Administra los datos asociados a tu cuenta.
                                    </p>
                                </div>

                                <button
                                    className="profile-outline-button"
                                    type="button"
                                    onClick={() => setOpenEditar(true)}
                                >
                                    <Pencil size={16} />
                                    Editar
                                </button>
                            </div>

                            <div className="profile-information-grid">
                                <div className="profile-information-item">
                                    <div className="profile-information-icon">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <small>Nombre completo</small>
                                        <strong>
                                            {usuario?.nombres} {usuario?.apellidos}
                                        </strong>
                                    </div>
                                </div>

                                <div className="profile-information-item">
                                    <div className="profile-information-icon">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <small>Correo electrónico</small>
                                        <strong>
                                            {usuario?.email || "No registrado"}
                                        </strong>
                                    </div>
                                </div>

                                <div className="profile-information-item">
                                    <div className="profile-information-icon">
                                        <Phone size={20} />
                                    </div>
                                    <div>
                                        <small>Celular</small>
                                        <strong>
                                            {usuario?.telefono || "No registrado"}
                                        </strong>
                                    </div>
                                </div>

                                <div className="profile-information-item profile-information-full">
                                    <div className="profile-information-icon">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <small>Fecha de nacimiento</small>
                                        <strong>
                                            {usuario?.fecha_nacimiento || "No registrada"}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* =========================
                        SECCIÓN: DIRECCIONES
                    ========================= */}

                    {selectedSection === "direcciones" && (
                        <section className="profile-card">
                            <div className="profile-card-header">
                                <div>
                                    <h2>Mis direcciones</h2>
                                    <p>Gestiona tus direcciones de envío.</p>
                                </div>

                                <button
                                    className="profile-primary-button"
                                    type="button"
                                    onClick={() => setOpenNuevaDir(true)}
                                >
                                    <Plus size={18} />
                                    Agregar dirección
                                </button>
                            </div>

                            {cargandoDirecciones ? (
                                <div className="profile-loading">
                                    Cargando direcciones...
                                </div>
                            ) : direcciones.length === 0 ? (
                                <div className="profile-address-empty">
                                    <div className="profile-empty-icon">
                                        <MapPin size={28} />
                                    </div>
                                    <div>
                                        <h3>Aún no tienes direcciones</h3>
                                        <p>
                                            Agrega una dirección para realizar tus
                                            compras de forma más rápida.
                                        </p>
                                    </div>
                                    <button
                                        className="profile-address-add"
                                        type="button"
                                        onClick={() => setOpenNuevaDir(true)}
                                    >
                                        <Plus size={18} />
                                        Agregar nueva dirección
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div className="profile-address-list">
                                    {direcciones.map((d) => (
                                        <div
                                            key={d.id_direccion}
                                            className={`profile-address-card ${
                                                d.predeterminada
                                                    ? "is-default"
                                                    : ""
                                            }`}
                                        >
                                            <div className="profile-address-icon">
                                                <MapPin size={20} />
                                            </div>

                                            <div className="profile-address-info">
                                                <strong>{d.direccion}</strong>
                                                <span>
                                                    {d.ciudad}, {d.departamento}
                                                    {d.codigo_postal
                                                        ? ` (${d.codigo_postal})`
                                                        : ""}
                                                </span>

                                                {d.predeterminada && (
                                                    <span className="profile-address-badge">
                                                        <Star size={12} />
                                                        Predeterminada
                                                    </span>
                                                )}
                                            </div>

                                            <div className="profile-address-actions">
                                                {!d.predeterminada && (
                                                    <button
                                                        type="button"
                                                        className="profile-link-button"
                                                        onClick={() =>
                                                            handleMarcarPredeterminada(
                                                                d.id_direccion
                                                            )
                                                        }
                                                        disabled={
                                                            marcandoId ===
                                                            d.id_direccion
                                                        }
                                                    >
                                                        {marcandoId === d.id_direccion
                                                            ? "Guardando..."
                                                            : "Hacer predeterminada"}
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="profile-icon-danger"
                                                    onClick={() =>
                                                        handleEliminarDireccion(
                                                            d.id_direccion
                                                        )
                                                    }
                                                    disabled={
                                                        eliminandoId ===
                                                        d.id_direccion
                                                    }
                                                    aria-label="Eliminar dirección"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* =========================
                        SECCIÓN: SEGURIDAD
                    ========================= */}

                    {selectedSection === "seguridad" && (
                        <section className="profile-card">
                            <div className="profile-card-header">
                                <div>
                                    <h2>Seguridad de la cuenta</h2>
                                    <p>
                                        Protege tu cuenta y mantén tus datos seguros.
                                    </p>
                                </div>
                            </div>

                            <div className="profile-security">
                                <div className="profile-security-left">
                                    <div className="profile-security-icon">
                                        <Lock size={21} />
                                    </div>
                                    <div>
                                        <small>Contraseña</small>
                                        <span>••••••••••••••</span>
                                    </div>
                                </div>

                                <button
                                    className="profile-security-button"
                                    type="button"
                                    onClick={() => setOpenPassword(true)}
                                >
                                    Cambiar contraseña
                                </button>
                            </div>
                        </section>
                    )}

                    {/* =========================
                        ACCESOS RÁPIDOS
                    ========================= */}

                    <section className="profile-card profile-quick-card">
                        <div className="profile-card-header">
                            <div>
                                <h2>Accesos rápidos</h2>
                            </div>
                        </div>

                        <div className="profile-quick-grid">
                            <Link to="/orders" className="profile-quick-item">
                                <div className="quick-icon quick-orders">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <strong>Mis pedidos</strong>
                                    <span>Ver historial y estado de tus pedidos</span>
                                </div>
                                <ChevronRight size={18} />
                            </Link>

                            <Link to="/cart" className="profile-quick-item">
                                <div className="quick-icon quick-cart">
                                    <ShoppingCart size={20} />
                                </div>
                                <div>
                                    <strong>Mi carrito</strong>
                                    <span>Revisa productos y finaliza tu compra</span>
                                </div>
                                <ChevronRight size={18} />
                            </Link>

                            <Link to="/favorites" className="profile-quick-item">
                                <div className="quick-icon quick-favorites">
                                    <Heart size={20} />
                                </div>
                                <div>
                                    <strong>Mis favoritos</strong>
                                    <span>Productos que guardaste para después</span>
                                </div>
                                <ChevronRight size={18} />
                            </Link>

                            <button
                                type="button"
                                className="profile-quick-item"
                                onClick={() => setSelectedSection("seguridad")}
                            >
                                <div className="quick-icon quick-security">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <strong>Seguridad</strong>
                                    <span>Protege y administra tu cuenta</span>
                                </div>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            {/* =========================
                MODALES
            ========================= */}

            <EditarPerfilModal
                open={openEditar}
                onClose={() => setOpenEditar(false)}
                usuario={usuario}
                onSaved={handlePerfilGuardado}
            />

            <NuevaDireccionModal
                open={openNuevaDir}
                onClose={() => setOpenNuevaDir(false)}
                usuarioId={usuarioId}
                onCreated={handleDireccionCreada}
            />

            <CambiarPasswordModal
                open={openPassword}
                onClose={() => setOpenPassword(false)}
                usuarioId={usuarioId}
            />
        </main>
    );
}

export default Profile;
