import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
    AlertTriangle,
    ArrowUpDown,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Eye,
    Filter,
    Mail,
    Pencil,
    Phone,
    Search,
    Shield,
    SlidersHorizontal,
    Sparkles,
    Trash2,
    User,
    UserCheck,
    UserPlus,
    UserRound,
    Users,
    X,
    XCircle
} from "lucide-react";

import "./UserTable.css";
import {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser
} from "../../../services/adminService";
import { esAdmin } from "../../../utils/esAdmin";
import { useToast } from "../Toast/ToastHost";

const ROLES = [
    { id: 1, nombre: "Cliente" },
    { id: 2, nombre: "Administrador" }
];

const ESTADOS = [
    { key: "activo", label: "Activo" },
    { key: "inactivo", label: "Inactivo" }
];

function UserTable({
    refreshKey,
    onAction,
    openNewUserModal,
    onCloseNewUser
}) {
    const toast = useToast?.();

    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtros de búsqueda, rol, estado y orden
    const [busqueda, setBusqueda] = useState("");
    const [filtroRol, setFiltroRol] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("");
    const [ordenarPor, setOrdenarPor] = useState("id_asc");

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 8;

    // Modales
    const [detalleUsuario, setDetalleUsuario] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [submittingEdit, setSubmittingEdit] = useState(false);

    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Formulario de creación de nuevo usuario
    const [newUserForm, setNewUserForm] = useState({
        nombres: "",
        apellidos: "",
        email: "",
        password: "",
        telefono: "",
        tipo_documento: "CC",
        numero_documento: "",
        rol: 1,
        estado: "activo"
    });
    const [submittingNewUser, setSubmittingNewUser] = useState(false);

    /* =====================================================
       CARGAR USUARIOS
       ===================================================== */
    const cargarUsuarios = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data } = await getUsers();
            setUsuarios(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error cargando usuarios:", err);
            setError("No fue posible cargar los usuarios registrados.");
            setUsuarios([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarUsuarios();
    }, [refreshKey]);

    /* =====================================================
       FILTRADO Y ORDENACIÓN
       ===================================================== */
    const usuariosFiltrados = useMemo(() => {
        let result = usuarios.filter((usuario) => {
            const texto = busqueda.trim().toLowerCase();
            const nombreCompleto = `${usuario.nombres || ""} ${usuario.apellidos || ""}`.toLowerCase();
            const email = (usuario.email || "").toLowerCase();
            const idStr = String(usuario.id_usuario);
            const doc = String(usuario.numero_documento || "").toLowerCase();

            const coincideBusqueda =
                !texto ||
                nombreCompleto.includes(texto) ||
                email.includes(texto) ||
                idStr.includes(texto) ||
                doc.includes(texto);

            const coincideRol =
                !filtroRol ||
                (filtroRol === "2" && esAdmin(usuario)) ||
                (filtroRol === "1" && !esAdmin(usuario));

            const coincideEstado =
                !filtroEstado ||
                (usuario.estado || "activo").toLowerCase() === filtroEstado.toLowerCase();

            return coincideBusqueda && coincideRol && coincideEstado;
        });

        // Ordenar según selector
        result.sort((a, b) => {
            if (ordenarPor === "id_asc") return a.id_usuario - b.id_usuario;
            if (ordenarPor === "id_desc") return b.id_usuario - a.id_usuario;
            if (ordenarPor === "nombre_az") {
                const nameA = `${a.nombres || ""} ${a.apellidos || ""}`.trim();
                const nameB = `${b.nombres || ""} ${b.apellidos || ""}`.trim();
                return nameA.localeCompare(nameB);
            }
            if (ordenarPor === "nombre_za") {
                const nameA = `${a.nombres || ""} ${a.apellidos || ""}`.trim();
                const nameB = `${b.nombres || ""} ${b.apellidos || ""}`.trim();
                return nameB.localeCompare(nameA);
            }
            return 0;
        });

        return result;
    }, [usuarios, busqueda, filtroRol, filtroEstado, ordenarPor]);

    // Reset de página al cambiar filtros
    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda, filtroRol, filtroEstado, ordenarPor]);

    // Paginación
    const totalPaginas = Math.ceil(usuariosFiltrados.length / elementosPorPagina) || 1;
    const usuariosPaginados = useMemo(() => {
        const start = (paginaActual - 1) * elementosPorPagina;
        return usuariosFiltrados.slice(start, start + elementosPorPagina);
    }, [usuariosFiltrados, paginaActual, elementosPorPagina]);

    const hasActiveFilters =
        busqueda.trim() !== "" ||
        filtroRol !== "" ||
        filtroEstado !== "" ||
        ordenarPor !== "id_asc";

    const handleClearFilters = () => {
        setBusqueda("");
        setFiltroRol("");
        setFiltroEstado("");
        setOrdenarPor("id_asc");
    };

    /* =====================================================
       EDICIÓN DE USUARIO
       ===================================================== */
    const abrirEdicion = async (usuario) => {
        try {
            const { data } = await getUser(usuario.id_usuario);
            setEditTarget(data);
            setEditForm({
                nombres: data.nombres || "",
                apellidos: data.apellidos || "",
                tipo_documento: data.tipo_documento || "CC",
                numero_documento: data.numero_documento || "",
                email: data.email || "",
                fecha_nacimiento: data.fecha_nacimiento || "",
                telefono: data.telefono || "",
                estado: data.estado || "activo",
                rol: data.rol || (esAdmin(data) ? 2 : 1)
            });
        } catch (err) {
            console.error(err);
            toast?.error?.("No fue posible cargar el usuario para edición.");
        }
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const guardarEdicion = async (e) => {
        e.preventDefault();
        if (!editTarget) return;

        setSubmittingEdit(true);
        try {
            await updateUser(editTarget.id_usuario, {
                ...editForm,
                rol: Number(editForm.rol)
            });

            toast?.success?.("Usuario actualizado correctamente.");
            setEditTarget(null);
            setEditForm(null);
            cargarUsuarios();
            if (onAction) onAction();
        } catch (err) {
            console.error(err);
            toast?.error?.("No fue posible actualizar el usuario.");
        } finally {
            setSubmittingEdit(false);
        }
    };

    /* =====================================================
       CREACIÓN DE NUEVO USUARIO
       ===================================================== */
    const handleCreateUserSubmit = async (e) => {
        e.preventDefault();
        setSubmittingNewUser(true);
        try {
            await createUser({
                ...newUserForm,
                rol: Number(newUserForm.rol)
            });

            toast?.success?.("Usuario creado exitosamente.");
            setNewUserForm({
                nombres: "",
                apellidos: "",
                email: "",
                password: "",
                telefono: "",
                tipo_documento: "CC",
                numero_documento: "",
                rol: 1,
                estado: "activo"
            });
            if (onCloseNewUser) onCloseNewUser();
            cargarUsuarios();
            if (onAction) onAction();
        } catch (err) {
            console.error("Error creando usuario:", err);
            const msg =
                err.response?.data?.error ||
                err.response?.data?.email?.[0] ||
                "No fue posible registrar el usuario.";
            toast?.error?.(msg);
        } finally {
            setSubmittingNewUser(false);
        }
    };

    /* =====================================================
       ELIMINACIÓN DE USUARIO
       ===================================================== */
    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            await deleteUser(userToDelete.id_usuario);
            toast?.success?.("Usuario eliminado exitosamente.");
            setUserToDelete(null);
            cargarUsuarios();
            if (onAction) onAction();
        } catch (err) {
            console.error(err);
            toast?.error?.("No fue posible eliminar el usuario.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="users-module-container">
            {/* CONTENEDOR BLANCO PRINCIPAL (TABLA Y FILTROS) */}
            <div className="users-table-card">
                {/* BARRA DE HERRAMIENTAS Y FILTROS */}
                <div className="users-toolbar-wrapper">
                    {/* Búsqueda */}
                    <div className="users-search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, correo o ID..."
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
                    <div className="users-filter-controls">
                        {/* 1. Selector de Roles */}
                        <div className="filter-select-wrapper with-icon">
                            <User size={16} className="filter-icon" />
                            <select
                                value={filtroRol}
                                onChange={(e) => setFiltroRol(e.target.value)}
                            >
                                <option value="">Todos los roles</option>
                                <option value="2">Administrador</option>
                                <option value="1">Cliente</option>
                            </select>
                        </div>

                        {/* 2. Selector de Estados */}
                        <div className="filter-select-wrapper with-icon">
                            <CheckCircle2 size={16} className="filter-icon" />
                            <select
                                value={filtroEstado}
                                onChange={(e) => setFiltroEstado(e.target.value)}
                            >
                                <option value="">Todos los estados</option>
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                            </select>
                        </div>

                        {/* 3. Selector de Orden */}
                        <div className="filter-select-wrapper with-icon">
                            <ArrowUpDown size={16} className="filter-icon" />
                            <select
                                value={ordenarPor}
                                onChange={(e) => setOrdenarPor(e.target.value)}
                            >
                                <option value="id_asc">Ordenar por (ID ↑)</option>
                                <option value="id_desc">ID descendente (↓)</option>
                                <option value="nombre_az">Nombre A-Z</option>
                                <option value="nombre_za">Nombre Z-A</option>
                            </select>
                        </div>

                        {/* 4. Botón Filtros (Reset / Activo) */}
                        <button
                            type="button"
                            className={`users-filters-btn ${hasActiveFilters ? "btn-filters-active" : ""}`}
                            onClick={handleClearFilters}
                            title={hasActiveFilters ? "Limpiar todos los filtros" : "Filtros"}
                        >
                            <SlidersHorizontal size={16} />
                            <span>Filtros</span>
                            {hasActiveFilters && <span className="filters-badge" />}
                        </button>
                    </div>
                </div>

                {/* TABLA DE USUARIOS */}
                <div className="users-table-responsive-wrapper">
                    <table className="users-table-element">
                        <thead>
                            <tr>
                                <th className="th-id">#</th>
                                <th className="th-user">Usuario</th>
                                <th className="th-email">Email</th>
                                <th className="th-phone">Teléfono</th>
                                <th className="th-role">Rol</th>
                                <th className="th-status">Estado</th>
                                <th className="th-actions">Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="users-table-loading-cell">
                                        <div className="loading-spinner" />
                                        <span>Cargando usuarios...</span>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="7" className="users-table-error-cell">
                                        <AlertTriangle size={24} color="#ef4444" />
                                        <span>{error}</span>
                                        <button
                                            type="button"
                                            onClick={cargarUsuarios}
                                            className="btn-retry"
                                        >
                                            Reintentar
                                        </button>
                                    </td>
                                </tr>
                            ) : usuariosPaginados.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="users-empty-state-cell">
                                        <div className="users-empty-state-content">
                                            <div className="empty-state-illustration">
                                                <div className="empty-squircle-icon">
                                                    <Users size={34} color="#6A2CA0" />
                                                    <Sparkles size={16} className="sparkle-top" />
                                                    <Sparkles size={14} className="sparkle-bottom" />
                                                </div>
                                            </div>
                                            <h3 className="empty-state-title">
                                                No hay usuarios que coincidan con la búsqueda.
                                            </h3>
                                            <p className="empty-state-description">
                                                Intenta con otros criterios de búsqueda o registra un nuevo usuario.
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
                                usuariosPaginados.map((usuario) => {
                                    const esAdministrador = esAdmin(usuario);
                                    const nombreCompleto =
                                        `${usuario.nombres || ""} ${usuario.apellidos || ""}`.trim() ||
                                        usuario.username ||
                                        "Usuario sin nombre";

                                    const estadoActivo =
                                        (usuario.estado || "activo").toLowerCase() === "activo";

                                    return (
                                        <tr
                                            key={usuario.id_usuario}
                                            className="users-table-row"
                                        >
                                            {/* ID */}
                                            <td className="td-id">
                                                <span className="user-id-text">
                                                    #{usuario.id_usuario}
                                                </span>
                                            </td>

                                            {/* Usuario (Squircle icono + Nombre) */}
                                            <td className="td-user">
                                                <div className="user-profile-cell">
                                                    <div className="user-avatar-squircle">
                                                        <User size={18} color="#6A2CA0" />
                                                    </div>
                                                    <span className="user-full-name">
                                                        {nombreCompleto}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td className="td-email">
                                                <div className="user-contact-item">
                                                    <Mail size={15} className="contact-icon" />
                                                    <span>{usuario.email || "—"}</span>
                                                </div>
                                            </td>

                                            {/* Teléfono */}
                                            <td className="td-phone">
                                                <div className="user-contact-item">
                                                    <Phone size={15} className="contact-icon" />
                                                    <span>{usuario.telefono || "-"}</span>
                                                </div>
                                            </td>

                                            {/* Rol */}
                                            <td className="td-role">
                                                {esAdministrador ? (
                                                    <span className="role-pill role-pill--admin">
                                                        <Shield size={14} />
                                                        <span>Administrador</span>
                                                    </span>
                                                ) : (
                                                    <span className="role-pill role-pill--client">
                                                        <User size={14} />
                                                        <span>Cliente</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Estado */}
                                            <td className="td-status">
                                                {estadoActivo ? (
                                                    <span className="status-pill status-pill--active">
                                                        <span className="status-bullet bullet--green" />
                                                        <span>Activo</span>
                                                    </span>
                                                ) : (
                                                    <span className="status-pill status-pill--inactive">
                                                        <span className="status-bullet bullet--red" />
                                                        <span>Inactivo</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Acciones */}
                                            <td className="td-actions">
                                                <div className="user-actions-group">
                                                    {/* 1. Editar */}
                                                    <button
                                                        type="button"
                                                        className="user-action-icon-btn btn-edit"
                                                        onClick={() => abrirEdicion(usuario)}
                                                        title="Editar usuario"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>

                                                    {/* 2. Ver detalle */}
                                                    <button
                                                        type="button"
                                                        className="user-action-icon-btn btn-view"
                                                        onClick={() => setDetalleUsuario(usuario)}
                                                        title="Ver información del usuario"
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    {/* 3. Eliminar */}
                                                    <button
                                                        type="button"
                                                        className="user-action-icon-btn btn-delete"
                                                        onClick={() => setUserToDelete(usuario)}
                                                        title="Eliminar usuario"
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
                <div className="users-pagination-bar">
                    <span className="users-pagination-info">
                        Mostrando{" "}
                        {usuariosFiltrados.length === 0
                            ? "0"
                            : `${(paginaActual - 1) * elementosPorPagina + 1}-${Math.min(
                                  paginaActual * elementosPorPagina,
                                  usuariosFiltrados.length
                              )}`}{" "}
                        de {usuariosFiltrados.length} usuarios
                    </span>

                    <div className="users-pagination-controls">
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
                MODAL 1: VER DETALLE DE USUARIO
                ===================================================== */}
            {detalleUsuario &&
                createPortal(
                    <div
                        className="users-modal-overlay"
                        onClick={() => setDetalleUsuario(null)}
                    >
                        <div
                            className="users-modal-card modal-detail"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="users-modal-header">
                                <div className="modal-header-left">
                                    <div className="modal-header-icon">
                                        <User size={22} color="#6A2CA0" />
                                    </div>
                                    <div>
                                        <h2>
                                            {detalleUsuario.nombres} {detalleUsuario.apellidos}
                                        </h2>
                                        <p className="modal-subtitle">
                                            ID de usuario: #{detalleUsuario.id_usuario}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="modal-close-btn"
                                    onClick={() => setDetalleUsuario(null)}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="users-modal-body">
                                <div className="user-detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">Email:</span>
                                        <span className="detail-value">{detalleUsuario.email || "—"}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Teléfono:</span>
                                        <span className="detail-value">{detalleUsuario.telefono || "—"}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Documento:</span>
                                        <span className="detail-value">
                                            {detalleUsuario.tipo_documento || "CC"} -{" "}
                                            {detalleUsuario.numero_documento || "—"}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Fecha de nacimiento:</span>
                                        <span className="detail-value">
                                            {detalleUsuario.fecha_nacimiento || "—"}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Rol:</span>
                                        <span className="detail-value">
                                            {esAdmin(detalleUsuario) ? "Administrador" : "Cliente"}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Estado:</span>
                                        <span className="detail-value font-semibold">
                                            {detalleUsuario.estado === "activo" ? "Activo" : "Inactivo"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="users-modal-footer">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    onClick={() => setDetalleUsuario(null)}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {/* =====================================================
                MODAL 2: EDITAR USUARIO
                ===================================================== */}
            {editTarget && editForm &&
                createPortal(
                    <div
                        className="users-modal-overlay"
                        onClick={() => !submittingEdit && setEditTarget(null)}
                    >
                        <div
                            className="users-modal-card modal-form"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="users-modal-header">
                                <div>
                                    <h2>Editar usuario</h2>
                                    <p className="modal-subtitle">
                                        Actualiza los datos del usuario #{editTarget.id_usuario}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="modal-close-btn"
                                    onClick={() => setEditTarget(null)}
                                    disabled={submittingEdit}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={guardarEdicion}>
                                <div className="users-modal-body form-grid-two-cols">
                                    <div className="form-group">
                                        <label>Nombres *</label>
                                        <input
                                            type="text"
                                            name="nombres"
                                            value={editForm.nombres}
                                            onChange={handleEditChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Apellidos *</label>
                                        <input
                                            type="text"
                                            name="apellidos"
                                            value={editForm.apellidos}
                                            onChange={handleEditChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Email *</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={editForm.email}
                                            onChange={handleEditChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Teléfono</label>
                                        <input
                                            type="text"
                                            name="telefono"
                                            value={editForm.telefono}
                                            onChange={handleEditChange}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Rol</label>
                                        <select
                                            name="rol"
                                            value={editForm.rol}
                                            onChange={handleEditChange}
                                        >
                                            <option value={1}>Cliente</option>
                                            <option value={2}>Administrador</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Estado</label>
                                        <select
                                            name="estado"
                                            value={editForm.estado}
                                            onChange={handleEditChange}
                                        >
                                            <option value="activo">Activo</option>
                                            <option value="inactivo">Inactivo</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="users-modal-footer">
                                    <button
                                        type="button"
                                        className="btn-modal-cancel"
                                        onClick={() => setEditTarget(null)}
                                        disabled={submittingEdit}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-modal-save"
                                        disabled={submittingEdit}
                                    >
                                        {submittingEdit ? "Guardando..." : "Guardar cambios"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

            {/* =====================================================
                MODAL 3: CREAR NUEVO USUARIO
                ===================================================== */}
            {openNewUserModal &&
                createPortal(
                    <div
                        className="users-modal-overlay"
                        onClick={onCloseNewUser}
                    >
                        <div
                            className="users-modal-card modal-form"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="users-modal-header">
                                <div>
                                    <h2>Nuevo usuario</h2>
                                    <p className="modal-subtitle">
                                        Registra un nuevo usuario en la plataforma
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="modal-close-btn"
                                    onClick={onCloseNewUser}
                                    disabled={submittingNewUser}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateUserSubmit}>
                                <div className="users-modal-body form-grid-two-cols">
                                    <div className="form-group">
                                        <label>Nombres *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej. Andrés"
                                            value={newUserForm.nombres}
                                            onChange={(e) =>
                                                setNewUserForm((prev) => ({
                                                    ...prev,
                                                    nombres: e.target.value
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Apellidos *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej. Gómez"
                                            value={newUserForm.apellidos}
                                            onChange={(e) =>
                                                setNewUserForm((prev) => ({
                                                    ...prev,
                                                    apellidos: e.target.value
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Email *</label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="andres@ejemplo.com"
                                            value={newUserForm.email}
                                            onChange={(e) =>
                                                setNewUserForm((prev) => ({
                                                    ...prev,
                                                    email: e.target.value
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Contraseña *</label>
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            placeholder="Mínimo 6 caracteres"
                                            value={newUserForm.password}
                                            onChange={(e) =>
                                                setNewUserForm((prev) => ({
                                                    ...prev,
                                                    password: e.target.value
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Teléfono</label>
                                        <input
                                            type="text"
                                            placeholder="300 123 4567"
                                            value={newUserForm.telefono}
                                            onChange={(e) =>
                                                setNewUserForm((prev) => ({
                                                    ...prev,
                                                    telefono: e.target.value
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Rol</label>
                                        <select
                                            value={newUserForm.rol}
                                            onChange={(e) =>
                                                setNewUserForm((prev) => ({
                                                    ...prev,
                                                    rol: e.target.value
                                                }))
                                            }
                                        >
                                            <option value={1}>Cliente</option>
                                            <option value={2}>Administrador</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="users-modal-footer">
                                    <button
                                        type="button"
                                        className="btn-modal-cancel"
                                        onClick={onCloseNewUser}
                                        disabled={submittingNewUser}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-modal-save"
                                        disabled={submittingNewUser}
                                    >
                                        {submittingNewUser ? "Creando..." : "Crear usuario"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

            {/* =====================================================
                MODAL 4: CONFIRMAR ELIMINACIÓN
                ===================================================== */}
            {userToDelete &&
                createPortal(
                    <div
                        className="users-modal-overlay"
                        onClick={() => !isDeleting && setUserToDelete(null)}
                    >
                        <div
                            className="users-modal-card modal-delete-confirm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="delete-modal-icon-container">
                                <div className="delete-modal-squircle">
                                    <Trash2 size={28} color="#ef4444" />
                                </div>
                            </div>

                            <h3 className="delete-modal-title">¿Eliminar usuario?</h3>
                            <p className="delete-modal-desc">
                                Estás a punto de eliminar a{" "}
                                <strong>
                                    {userToDelete.nombres} {userToDelete.apellidos}
                                </strong>{" "}
                                (#{userToDelete.id_usuario}). Esta acción es definitiva y no se
                                puede deshacer.
                            </p>

                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    onClick={() => setUserToDelete(null)}
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
        </div>
    );
}

export default UserTable;