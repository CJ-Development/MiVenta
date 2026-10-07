import { useState } from "react";

import { changePassword } from "../../../../services/adminService";

import { useToast } from "../../../../hooks/useToast";

import {
    Shield,
    Loader2,
    Eye,
    EyeOff
} from "lucide-react";

function SecuritySection({ usuario }) {

    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        password_actual: "",
        password_nuevo: "",
        password_confirmar: ""
    });

    const [showPasswords, setShowPasswords] = useState({
        password_actual: false,
        password_nuevo: false,
        password_confirmar: false
    });

    const [loading, setLoading] = useState(false);

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData(prev => ({

            ...prev,
            [name]: value

        }));

        if (errors[name]) {

            setErrors(prev => ({

                ...prev,
                [name]: ""

            }));

        }

    };

    const togglePasswordVisibility = (field) => {

        setShowPasswords(prev => ({

            ...prev,
            [field]: !prev[field]

        }));

    };

    const validateForm = () => {

        const newErrors = {};

        if (!formData.password_actual.trim()) {

            newErrors.password_actual = "La contraseña actual es requerida";

        }

        if (!formData.password_nuevo.trim()) {

            newErrors.password_nuevo = "La nueva contraseña es requerida";

        } else if (formData.password_nuevo.length < 6) {

            newErrors.password_nuevo = "La contraseña debe tener al menos 6 caracteres";

        }

        if (!formData.password_confirmar.trim()) {

            newErrors.password_confirmar = "Debe confirmar la nueva contraseña";

        } else if (formData.password_nuevo !== formData.password_confirmar) {

            newErrors.password_confirmar = "Las contraseñas no coinciden";

        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!validateForm()) {

            return;

        }

        try {

            setLoading(true);

            await changePassword(usuario.id_usuario, {

                password_actual: formData.password_actual,
                password_nuevo: formData.password_nuevo

            });

            showToast("Contraseña actualizada correctamente", "success");

            setFormData({
                password_actual: "",
                password_nuevo: "",
                password_confirmar: ""
            });

            setErrors({});

        } catch (error) {

            console.error("Error al cambiar contraseña:", error);

            if (error.response?.data?.error) {

                showToast(error.response.data.error, "error");

            } else {

                showToast("Error al cambiar la contraseña", "error");

            }

        } finally {

            setLoading(false);

        }

    };

    return (

        <div className="security-section">

            <div className="security-section-header">

                <h2>Seguridad de la cuenta</h2>

                <p>Cambia tu contraseña para mantener tu cuenta segura</p>

            </div>

            <form className="security-form" onSubmit={handleSubmit}>

                <div className="form-group">

                    <label>Contraseña actual</label>

                    <div className="password-input-wrapper">

                        <input

                            type={showPasswords.password_actual ? "text" : "password"}

                            name="password_actual"

                            value={formData.password_actual}

                            onChange={handleChange}

                            className={errors.password_actual ? "error" : ""}

                            placeholder="Ingresa tu contraseña actual"

                        />

                        <button

                            type="button"

                            className="password-toggle"

                            onClick={() => togglePasswordVisibility("password_actual")}

                        >

                            {showPasswords.password_actual ? <EyeOff size={18} /> : <Eye size={18} />}

                        </button>

                    </div>

                    {errors.password_actual && (

                        <span className="error-message">{errors.password_actual}</span>

                    )}

                </div>

                <div className="form-group">

                    <label>Nueva contraseña</label>

                    <div className="password-input-wrapper">

                        <input

                            type={showPasswords.password_nuevo ? "text" : "password"}

                            name="password_nuevo"

                            value={formData.password_nuevo}

                            onChange={handleChange}

                            className={errors.password_nuevo ? "error" : ""}

                            placeholder="Ingresa tu nueva contraseña"

                        />

                        <button

                            type="button"

                            className="password-toggle"

                            onClick={() => togglePasswordVisibility("password_nuevo")}

                        >

                            {showPasswords.password_nuevo ? <EyeOff size={18} /> : <Eye size={18} />}

                        </button>

                    </div>

                    {errors.password_nuevo && (

                        <span className="error-message">{errors.password_nuevo}</span>

                    )}

                </div>

                <div className="form-group">

                    <label>Confirmar nueva contraseña</label>

                    <div className="password-input-wrapper">

                        <input

                            type={showPasswords.password_confirmar ? "text" : "password"}

                            name="password_confirmar"

                            value={formData.password_confirmar}

                            onChange={handleChange}

                            className={errors.password_confirmar ? "error" : ""}

                            placeholder="Confirma tu nueva contraseña"

                        />

                        <button

                            type="button"

                            className="password-toggle"

                            onClick={() => togglePasswordVisibility("password_confirmar")}

                        >

                            {showPasswords.password_confirmar ? <EyeOff size={18} /> : <Eye size={18} />}

                        </button>

                    </div>

                    {errors.password_confirmar && (

                        <span className="error-message">{errors.password_confirmar}</span>

                    )}

                </div>

                <div className="form-actions">

                    <button

                        type="submit"

                        className="btn btn-primary"

                        disabled={loading}

                    >

                        {loading ? (

                            <Loader2 className="spinner" size={18} />

                        ) : (

                            <Shield size={18} />

                        )}

                        {loading ? "Actualizando..." : "Cambiar contraseña"}

                    </button>

                </div>

            </form>

        </div>

    );

}

export default SecuritySection;