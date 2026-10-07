import { useState, useEffect } from "react";

import { getUser, updateUser } from "../../../../services/adminService";

import { useToast } from "../../../../hooks/useToast";

import {
    Pencil,
    X,
    Save,
    Loader2,
    ShieldCheck,
} from "lucide-react";
import logoImg from "../../../../assets/images/Logo miVenta.co con bolsa y envío.png";

function ProfileSection({ usuario }) {

    const { showToast } = useToast();

    const [userData, setUserData] = useState(null);

    const [isEditing, setIsEditing] = useState(false);

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        nombres: "",
        apellidos: "",
        email: "",
        fecha_nacimiento: "",
        telefono: ""
    });

    useEffect(() => {

        if (usuario?.id_usuario) {

            loadUserData();

        }

    }, [usuario]);

    const loadUserData = async () => {

        try {

            setLoading(true);

            const { data } = await getUser(usuario.id_usuario);

            setUserData(data);

            setFormData({
                nombres: data.nombres || "",
                apellidos: data.apellidos || "",
                email: data.email || "",
                fecha_nacimiento: data.fecha_nacimiento || "",
                telefono: data.telefono || ""
            });

        } catch (error) {

            console.error("Error al cargar datos del usuario:", error);

            showToast("Error al cargar datos del usuario", "error");

        } finally {

            setLoading(false);

        }

    };

    const handleEdit = () => {

        setIsEditing(true);

    };

    const handleCancel = () => {

        setIsEditing(false);

        if (userData) {

            setFormData({
                nombres: userData.nombres || "",
                apellidos: userData.apellidos || "",
                email: userData.email || "",
                fecha_nacimiento: userData.fecha_nacimiento || "",
                telefono: userData.telefono || ""
            });

        }

    };

    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData(prev => ({

            ...prev,
            [name]: value

        }));

    };

    const handleSave = async () => {

        try {

            setSaving(true);

            await updateUser(usuario.id_usuario, formData);

            await loadUserData();

            setIsEditing(false);

            showToast("Información actualizada correctamente", "success");

        } catch (error) {

            console.error("Error al actualizar información:", error);

            showToast("Error al actualizar la información", "error");

        } finally {

            setSaving(false);

        }

    };

    if (loading) {

        return (

            <div className="profile-section-loading">

                <Loader2 className="spinner" size={24} />

                <p>Cargando información...</p>

            </div>

        );

    }

    return (

        <div className="profile-section">

            {/* BANNER DE MARCA DEL PERFIL ADMINISTRADOR (LOGO GRANDE) */}
            <div className="profile-brand-header-card">
                <div className="profile-brand-logo-holder">
                    <img
                        src={logoImg}
                        alt="miVenta.co"
                        className="profile-brand-logo-large"
                    />
                </div>
                <div className="profile-brand-info">
                    <div className="profile-brand-badge">
                        <ShieldCheck size={14} />
                        <span>Perfil Administrativo Oficial</span>
                    </div>
                    <h2 className="profile-brand-name">miVenta.co</h2>
                    <p className="profile-brand-desc">
                        Portal de gestión y credenciales del administrador. Mantén tus datos personales y de contacto actualizados para la emisión de facturación y notificaciones.
                    </p>
                </div>
            </div>

            <div className="profile-section-header">

                <h2>Información del perfil</h2>

                <p>Consulta y edita tus datos personales</p>

            </div>

            <div className="profile-form">

                <div className="form-row">

                    <div className="form-group">

                        <label>Nombre</label>

                        {isEditing ? (

                            <input

                                type="text"

                                name="nombres"

                                value={formData.nombres}

                                onChange={handleChange}

                                required

                            />

                        ) : (

                            <div className="form-value">{userData?.nombres || "-"}</div>

                        )}

                    </div>

                    <div className="form-group">

                        <label>Apellidos</label>

                        {isEditing ? (

                            <input

                                type="text"

                                name="apellidos"

                                value={formData.apellidos}

                                onChange={handleChange}

                                required

                            />

                        ) : (

                            <div className="form-value">{userData?.apellidos || "-"}</div>

                        )}

                    </div>

                </div>

                <div className="form-row">

                    <div className="form-group">

                        <label>Correo electrónico</label>

                        {isEditing ? (

                            <input

                                type="email"

                                name="email"

                                value={formData.email}

                                onChange={handleChange}

                                required

                            />

                        ) : (

                            <div className="form-value">{userData?.email || "-"}</div>

                        )}

                    </div>

                    <div className="form-group">

                        <label>Fecha de nacimiento</label>

                        {isEditing ? (

                            <input

                                type="date"

                                name="fecha_nacimiento"

                                value={formData.fecha_nacimiento}

                                onChange={handleChange}

                                required

                            />

                        ) : (

                            <div className="form-value">

                                {userData?.fecha_nacimiento ? new Date(userData.fecha_nacimiento).toLocaleDateString('es-ES') : "-"}

                            </div>

                        )}

                    </div>

                </div>

                <div className="form-row">

                    <div className="form-group">

                        <label>Teléfono</label>

                        {isEditing ? (

                            <input

                                type="tel"

                                name="telefono"

                                value={formData.telefono}

                                onChange={handleChange}

                            />

                        ) : (

                            <div className="form-value">{userData?.telefono || "-"}</div>

                        )}

                    </div>

                    <div className="form-group">

                        <label>Rol</label>

                        <div className="form-value">Administrador</div>

                    </div>

                </div>

                <div className="form-actions">

                    {!isEditing ? (

                        <button

                            className="btn btn-primary"

                            onClick={handleEdit}

                            type="button"

                        >

                            <Pencil size={18} />

                            Editar información

                        </button>

                    ) : (

                        <>

                            <button

                                className="btn btn-secondary"

                                onClick={handleCancel}

                                type="button"

                                disabled={saving}

                            >

                                <X size={18} />

                                Cancelar

                            </button>

                            <button

                                className="btn btn-primary"

                                onClick={handleSave}

                                type="button"

                                disabled={saving}

                            >

                                {saving ? (

                                    <Loader2 className="spinner" size={18} />

                                ) : (

                                    <Save size={18} />

                                )}

                                {saving ? "Guardando..." : "Guardar cambios"}

                            </button>

                        </>

                    )}

                </div>

            </div>

        </div>

    );

}

export default ProfileSection;