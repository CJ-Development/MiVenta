import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    Loader2,
    Phone,
    User,
    Mail,
    Pencil,
    MapPin,
    Globe,
    Building2,
    Building,
    Home,
    Truck,
    ShieldCheck,
    Lock,
    ChevronRight,
    Check,
    CreditCard,
    Info,
    Headphones,
    Percent,
    AlertCircle,
    ArrowRight,
    ShoppingBag,
    ShoppingCart,
    X,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";

import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";
import SEO from "../../components/SEO/SEO";

import NoImage from "../../assets/images/Imagen no disponible.png";
import { mediaUrl } from "../../utils/mediaUrl";
import { createOrderFromCart } from "../../services/clientService";

import "./Checkout.css";

const formatearPesos = (valor) => {
    const numero = Number(valor);
    if (Number.isNaN(numero)) return "$0";
    return `$${numero.toLocaleString("es-CO")}`;
};

function Checkout() {
    const { usuario } = useAuth();
    const { items, total, loading: cartLoading } = useCart();
    const navigate = useNavigate();
    const addressSectionRef = useRef(null);

    // Datos del cliente
    const [nombre, setNombre] = useState("Andrea García");
    const [telefono, setTelefono] = useState("+57 300 4726258");
    const [correo, setCorreo] = useState("andrea@gmail.com");
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);

    // Dirección de envío
    const [pais, setPais] = useState("Colombia");
    const [departamento, setDepartamento] = useState("Antioquia");
    const [ciudad, setCiudad] = useState("Medellín");
    const [direccion, setDireccion] = useState("Cra. 45 # 78 - 32, Apto 301");
    const [barrio, setBarrio] = useState("Laureles");
    const [codigoPostal, setCodigoPostal] = useState("050034");

    // Términos y condiciones
    const [terminosAceptados, setTerminosAceptados] = useState(false);
    const [datosAceptados, setDatosAceptados] = useState(false);

    // Estados de envío y validación
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [nombreError, setNombreError] = useState("");
    const [telefonoError, setTelefonoError] = useState("");
    const [direccionError, setDireccionError] = useState("");
    const [terminosError, setTerminosError] = useState("");
    const [datosError, setDatosError] = useState("");

    // Cargar datos del usuario si está autenticado
    useEffect(() => {
        if (usuario) {
            if (usuario.nombres) {
                setNombre(usuario.nombres);
            }
            if (usuario.telefono) {
                setTelefono(usuario.telefono);
            }
            if (usuario.email) {
                setCorreo(usuario.email);
            }
        }
    }, [usuario]);

    // Redirigir si el carrito está vacío
    useEffect(() => {
        if (!cartLoading && items.length === 0) {
            navigate("/cart");
        }
    }, [items, cartLoading, navigate]);

    const scrollToAddress = () => {
        if (addressSectionRef.current) {
            addressSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        // Validaciones
        const validationErrors = [];

        // Validar nombre
        const nombreTrimmed = nombre?.trim() || "";
        const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
        const tieneNumeros = /\d/.test(nombreTrimmed);
        const palabras = nombreTrimmed.split(/\s+/).filter((p) => p.length > 0);

        if (!nombreTrimmed || nombreTrimmed.length < 3) {
            validationErrors.push("nombre");
            setNombreError("Por favor escribe tu nombre completo");
        } else if (tieneNumeros || !soloLetras.test(nombreTrimmed)) {
            validationErrors.push("nombre");
            setNombreError("El nombre solo puede contener letras");
        } else if (palabras.length < 2 && nombreTrimmed.length < 5) {
            validationErrors.push("nombre");
            setNombreError("Por favor escribe tu nombre y apellido");
        } else {
            setNombreError("");
        }

        // Validar teléfono
        const telefonoRegex = /^(\+57\s?)?3\d{2}\s?\d{3}\s?\d{4}$/;
        const telefonoLimpio = telefono?.trim() || "";
        if (!telefonoLimpio || (!telefonoRegex.test(telefonoLimpio) && telefonoLimpio.length < 10)) {
            validationErrors.push("teléfono");
            setTelefonoError("Formato inválido. Usa: +57 3XX XXX XXXX");
        } else {
            setTelefonoError("");
        }

        // Validar dirección
        if (!direccion || direccion.trim().length < 5) {
            validationErrors.push("dirección");
            setDireccionError("Ingresa tu dirección completa de entrega");
        } else {
            setDireccionError("");
        }

        // Validar términos
        if (!terminosAceptados) {
            validationErrors.push("términos");
            setTerminosError("Debes aceptar los Términos y Condiciones");
        } else {
            setTerminosError("");
        }

        // Validar datos personales
        if (!datosAceptados) {
            validationErrors.push("datos");
            setDatosError("Debes autorizar el tratamiento de datos personales");
        } else {
            setDatosError("");
        }

        if (items.length === 0) {
            validationErrors.push("carrito vacío");
        }

        if (validationErrors.length > 0) {
            setError("Por favor completa los campos requeridos para continuar.");
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            const response = await createOrderFromCart({
                usuario_id: usuario?.id_usuario || null,
                direccion_id: null,
                nombre_cliente: nombre,
                telefono_contacto: telefono,
                terminos_aceptados: terminosAceptados,
                datos_aceptados: datosAceptados,
                items: items.map((item) => ({
                    variante_id: item.variante_id,
                    cantidad: item.cantidad,
                })),
            });

            // Validar respuesta del backend
            if (!response.data || !response.data.whatsapp_number) {
                setError("No se pudo obtener el número de WhatsApp. Intenta nuevamente.");
                return;
            }

            if (!response.data.cliente || !response.data.productos) {
                setError("La respuesta del servidor no tiene el formato esperado.");
                return;
            }

            // Generar mensaje de WhatsApp
            const mensaje = generarMensajeWhatsApp(response.data);
            const encodedMessage = encodeURIComponent(mensaje);
            const whatsappUrl = `https://wa.me/${response.data.whatsapp_number}?text=${encodedMessage}`;

            // Abrir WhatsApp
            window.open(whatsappUrl, "_blank");

            // Redirigir a home después de un breve delay
            setTimeout(() => {
                navigate("/");
            }, 600);
        } catch (err) {
            console.error("Error al crear pedido:", err);
            setError("No pudimos registrar tu pedido. Por favor inténtalo nuevamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const generarMensajeWhatsApp = (data) => {
        const { cliente, productos, total: totalCompra, referencia, compra_id } = data;

        const formatearReferencia = (ref, id) => {
            if (ref && typeof ref === "string") {
                if (ref.includes("MVC")) {
                    return ref.startsWith("#") ? ref : `#${ref}`;
                }
                const numRef = ref.replace(/\D/g, "");
                if (numRef) {
                    const paddedId = String(numRef).padStart(5, "0");
                    return `#MVC-${paddedId}`;
                }
                return ref;
            }
            if (id != null) {
                const paddedId = String(id).padStart(5, "0");
                return `#MVC-${paddedId}`;
            }
            return "#MVC-00001";
        };

        const referenciaFinal = formatearReferencia(referencia, compra_id);

        let mensaje = `📦 *Nuevo pedido - MiVenta* 📦\n`;
        mensaje += `*Referencia:* ${referenciaFinal} 📋\n`;
        mensaje += `*Cliente:* ${cliente?.nombre || nombre} 👤\n`;
        mensaje += `*WhatsApp:* ${cliente?.telefono || telefono} 📱\n`;

        const emailFinal = correo || cliente?.email || cliente?.correo;
        if (emailFinal) {
            mensaje += `*Correo:* ${emailFinal} ✉️\n`;
        }

        const dirBase = direccion || data.direccion_envio?.direccion || "Por definir";
        const barrioBase = barrio || data.direccion_envio?.barrio;
        const dirCompleta = `${dirBase}${barrioBase ? `, Barrio ${barrioBase}` : ""}`;
        mensaje += `*Dirección de envío:* ${dirCompleta} 📍\n`;

        const ciudadBase = ciudad || data.direccion_envio?.ciudad || "";
        const deptoBase = departamento || data.direccion_envio?.departamento || "";
        const paisBase = pais || data.direccion_envio?.pais || "Colombia";
        mensaje += `*Ciudad:* ${ciudadBase}, ${deptoBase} - ${paisBase} 🏙️\n`;

        const cpBase = codigoPostal || data.direccion_envio?.codigo_postal;
        if (cpBase) {
            mensaje += `*Código Postal:* ${cpBase} 📮\n`;
        }

        mensaje += `*Productos solicitados:*\n`;

        productos.forEach((p) => {
            const precioUnitario =
                p.precio_unitario ||
                (p.subtotal && p.cantidad ? p.subtotal / p.cantidad : 0);

            const detalles = [];
            if (p.talla) detalles.push(`Talla: ${p.talla}`);
            if (p.color) detalles.push(`Color: ${p.color}`);
            const detallesTexto = detalles.length > 0 ? ` (${detalles.join(" | ")})` : "";

            const precioTexto = formatearPesos(precioUnitario);
            const subtotalTexto = formatearPesos(p.subtotal);

            mensaje += `• ${p.nombre}${detallesTexto} Precio: ${precioTexto} Cantidad: ${p.cantidad} Subtotal: ${subtotalTexto} 🛍️\n`;
        });

        mensaje += `*Total a pagar:* ${formatearPesos(totalCompra)}`;

        return mensaje;
    };

    if (cartLoading) {
        return (
            <main className="checkout-page">
                <div className="checkout-container">
                    <div className="checkout-loading">
                        <Loader2 size={36} className="spin" />
                        <h2>Cargando pedido...</h2>
                        <p>Estamos preparando la información de tu compra</p>
                    </div>
                </div>
            </main>
        );
    }

    if (items.length === 0) {
        return (
            <main className="checkout-page">
                <div className="checkout-container">
                    <div className="checkout-empty">
                        <ShoppingBag size={52} />
                        <h2>Tu carrito está vacío</h2>
                        <p>Agrega productos a tu carrito antes de completar tu pedido.</p>
                        <button
                            type="button"
                            className="checkout-primary-button"
                            onClick={() => navigate("/")}
                        >
                            Ir a la tienda
                            <ArrowRight size={17} />
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="checkout-page">
            {/* Formas decorativas de fondo (Gradients sutiles en esquinas) */}
            <div className="checkout-bg-shape checkout-bg-shape-top" />
            <div className="checkout-bg-shape checkout-bg-shape-bottom" />

            <SEO
                title="Completar pedido | MiVenta"
                description="Finaliza tu compra de forma 100% segura en MiVenta. Envíos garantizados y pago contra entrega en toda Colombia."
                path="/checkout"
                noindex={true}
            />

            <div className="checkout-container">
                {/* BARRA SUPERIOR DE SEGURIDAD Y BREADCRUMB */}
                <div className="checkout-top-bar">
                    <Breadcrumb
                        items={[
                            { label: "Carrito", path: "/cart" },
                            { label: "Checkout" },
                        ]}
                    />

                    <div className="checkout-top-security">
                        <span className="checkout-security-pill">
                            <ShieldCheck size={15} />
                            Compra segura
                        </span>
                        <span className="checkout-security-pill">
                            <Lock size={15} />
                            Tus datos están protegidos
                        </span>
                    </div>
                </div>

                {/* ENCABEZADO CON STEPPER */}
                <header className="checkout-header-hero">
                    <div className="checkout-title-area">
                        <span className="checkout-eyebrow-tag">PASO FINAL</span>
                        <h1 className="checkout-main-title">
                            Completa tu <span className="highlight-pink">pedido</span>
                        </h1>
                        <p className="checkout-subtitle">
                            Revisa tus datos, confirma la dirección y elige tu método de pago.
                        </p>
                    </div>

                    {/* STEPPER DINÁMICO */}
                    <div className="checkout-stepper-box">
                        <div className="checkout-stepper">
                            {/* PASO 1 */}
                            <div className="checkout-step-item completed">
                                <div className="checkout-step-bubble purple">
                                    <Check size={16} strokeWidth={2.8} />
                                </div>
                                <div className="checkout-step-info">
                                    <span className="checkout-step-number">1</span>
                                    <span className="checkout-step-title">Datos personales</span>
                                </div>
                            </div>

                            <div className="checkout-stepper-connector completed" />

                            {/* PASO 2 */}
                            <div className="checkout-step-item active">
                                <div className="checkout-step-bubble pink">
                                    <MapPin size={17} />
                                </div>
                                <div className="checkout-step-info">
                                    <span className="checkout-step-number">2</span>
                                    <span className="checkout-step-title active-title">
                                        Dirección y ubicación
                                    </span>
                                </div>
                            </div>

                            <div className="checkout-stepper-connector pending" />

                            {/* PASO 3 */}
                            <div className="checkout-step-item upcoming">
                                <div className="checkout-step-bubble neutral">
                                    <CreditCard size={16} />
                                </div>
                                <div className="checkout-step-info">
                                    <span className="checkout-step-number">3</span>
                                    <span className="checkout-step-title">Confirmación</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* BANNER DE ERROR SI LO HAY */}
                {error && (
                    <div className="checkout-alert-error">
                        <AlertCircle size={20} />
                        <div className="checkout-alert-content">
                            <span>{error}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setError(null)}
                            aria-label="Cerrar advertencia"
                            className="checkout-alert-close"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* LAYOUT PRINCIPAL DE 2 COLUMNAS */}
                <div className="checkout-layout">
                    {/* COLUMNA IZQUIERDA: FORMULARIOS Y PASOS */}
                    <section className="checkout-form-column">
                        {/* TARJETA 1: DATOS DEL CLIENTE */}
                        <div className="checkout-card checkout-card-client">
                            <div className="checkout-card-header">
                                <div className="checkout-card-title-group">
                                    <div className="checkout-avatar-circle purple-gradient">
                                        <User size={19} color="#ffffff" />
                                    </div>
                                    <div>
                                        <h2 className="checkout-card-title">Datos del cliente</h2>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="checkout-edit-btn"
                                    onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                                >
                                    <Pencil size={13} />
                                    {isEditingCustomer ? "Guardar" : "Editar"}
                                </button>
                            </div>

                            {isEditingCustomer ? (
                                <div className="checkout-client-edit-form">
                                    <div className="checkout-field-group">
                                        <label htmlFor="input-nombre">
                                            <User size={14} />
                                            Nombre completo *
                                        </label>
                                        <input
                                            id="input-nombre"
                                            type="text"
                                            value={nombre}
                                            onChange={(e) => {
                                                setNombre(e.target.value);
                                                setNombreError("");
                                            }}
                                            placeholder="Ej: Andrea García"
                                            className={nombreError ? "input-has-error" : ""}
                                        />
                                        {nombreError && (
                                            <small className="field-error-msg">{nombreError}</small>
                                        )}
                                    </div>

                                    <div className="checkout-field-group">
                                        <label htmlFor="input-telefono">
                                            <Phone size={14} />
                                            WhatsApp *
                                        </label>
                                        <input
                                            id="input-telefono"
                                            type="tel"
                                            value={telefono}
                                            onChange={(e) => {
                                                setTelefono(e.target.value);
                                                setTelefonoError("");
                                            }}
                                            placeholder="+57 300 4726258"
                                            className={telefonoError ? "input-has-error" : ""}
                                        />
                                        {telefonoError && (
                                            <small className="field-error-msg">{telefonoError}</small>
                                        )}
                                    </div>

                                    <div className="checkout-field-group">
                                        <label htmlFor="input-correo">
                                            <Mail size={14} />
                                            Correo electrónico
                                        </label>
                                        <input
                                            id="input-correo"
                                            type="email"
                                            value={correo}
                                            onChange={(e) => setCorreo(e.target.value)}
                                            placeholder="andrea@gmail.com"
                                        />
                                    </div>

                                    <div className="checkout-edit-actions">
                                        <button
                                            type="button"
                                            className="checkout-edit-save-btn"
                                            onClick={() => setIsEditingCustomer(false)}
                                        >
                                            Guardar información
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="checkout-client-summary-grid">
                                    <div className="checkout-summary-client-pill">
                                        <div className="client-pill-icon">
                                            <User size={16} />
                                        </div>
                                        <div className="client-pill-texts">
                                            <span className="client-pill-label">Nombre completo</span>
                                            <strong className="client-pill-val">
                                                {nombre || "No especificado"}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="checkout-summary-client-pill">
                                        <div className="client-pill-icon">
                                            <Phone size={16} />
                                        </div>
                                        <div className="client-pill-texts">
                                            <span className="client-pill-label">WhatsApp</span>
                                            <strong className="client-pill-val">
                                                {telefono || "No especificado"}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="checkout-summary-client-pill">
                                        <div className="client-pill-icon">
                                            <Mail size={16} />
                                        </div>
                                        <div className="client-pill-texts">
                                            <span className="client-pill-label">Correo electrónico</span>
                                            <strong className="client-pill-val">
                                                {correo || "No especificado"}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* TARJETA 2: DIRECCIÓN DE ENVÍO */}
                        <div
                            ref={addressSectionRef}
                            className="checkout-card checkout-card-shipping"
                        >
                            <div className="checkout-card-header">
                                <div className="checkout-card-title-group">
                                    <div className="checkout-badge-number pink">2</div>
                                    <div className="checkout-header-icon-group">
                                        <MapPin size={20} className="checkout-step-main-icon" />
                                        <div>
                                            <h2 className="checkout-card-title">Dirección de envío</h2>
                                            <p className="checkout-card-desc">
                                                Ingresa la dirección donde deseas recibir tu pedido.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="checkout-shipping-form">
                                {/* FILA 1: País, Departamento, Ciudad */}
                                <div className="checkout-form-row three-cols">
                                    <div className="checkout-field-group">
                                        <label htmlFor="shipping-pais">
                                            <Globe size={13} />
                                            País *
                                        </label>
                                        <div className="checkout-select-wrapper">
                                            <select
                                                id="shipping-pais"
                                                value={pais}
                                                onChange={(e) => setPais(e.target.value)}
                                            >
                                                <option value="Colombia">Colombia</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="checkout-field-group">
                                        <label htmlFor="shipping-dept">
                                            <Building2 size={13} />
                                            Departamento *
                                        </label>
                                        <div className="checkout-select-wrapper">
                                            <select
                                                id="shipping-dept"
                                                value={departamento}
                                                onChange={(e) => setDepartamento(e.target.value)}
                                            >
                                                <option value="Antioquia">Antioquia</option>
                                                <option value="Bogotá D.C.">Bogotá D.C.</option>
                                                <option value="Cundinamarca">Cundinamarca</option>
                                                <option value="Valle del Cauca">Valle del Cauca</option>
                                                <option value="Atlántico">Atlántico</option>
                                                <option value="Santander">Santander</option>
                                                <option value="Bolívar">Bolívar</option>
                                                <option value="Caldas">Caldas</option>
                                                <option value="Risaralda">Risaralda</option>
                                                <option value="Quindío">Quindío</option>
                                                <option value="Tolima">Tolima</option>
                                                <option value="Huila">Huila</option>
                                                <option value="Nariño">Nariño</option>
                                                <option value="Boyacá">Boyacá</option>
                                                <option value="Meta">Meta</option>
                                                <option value="Norte de Santander">Norte de Santander</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="checkout-field-group">
                                        <label htmlFor="shipping-ciudad">
                                            <MapPin size={13} />
                                            Ciudad *
                                        </label>
                                        <div className="checkout-select-wrapper">
                                            <select
                                                id="shipping-ciudad"
                                                value={ciudad}
                                                onChange={(e) => setCiudad(e.target.value)}
                                            >
                                                <option value="Medellín">Medellín</option>
                                                <option value="Envigado">Envigado</option>
                                                <option value="Itagüí">Itagüí</option>
                                                <option value="Bello">Bello</option>
                                                <option value="Sabaneta">Sabaneta</option>
                                                <option value="Rionegro">Rionegro</option>
                                                <option value="Bogotá">Bogotá</option>
                                                <option value="Cali">Cali</option>
                                                <option value="Barranquilla">Barranquilla</option>
                                                <option value="Bucaramanga">Bucaramanga</option>
                                                <option value="Cartagena">Cartagena</option>
                                                <option value="Pereira">Pereira</option>
                                                <option value="Manizales">Manizales</option>
                                                <option value="Armenia">Armenia</option>
                                                <option value="Ibagué">Ibagué</option>
                                                <option value="Villavicencio">Villavicencio</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* FILA 2: Dirección completa */}
                                <div className="checkout-form-row full-width">
                                    <div className="checkout-field-group">
                                        <label htmlFor="shipping-address">
                                            <Home size={13} />
                                            Dirección completa *
                                        </label>
                                        <div className="checkout-input-with-icon">
                                            <Home size={16} className="field-inner-icon" />
                                            <input
                                                id="shipping-address"
                                                type="text"
                                                value={direccion}
                                                onChange={(e) => {
                                                    setDireccion(e.target.value);
                                                    setDireccionError("");
                                                }}
                                                placeholder="Ejemplo: Calle 123 #45-67, Bogotá"
                                                className={direccionError ? "input-has-error" : ""}
                                            />
                                        </div>
                                        {direccionError && (
                                            <small className="field-error-msg">{direccionError}</small>
                                        )}
                                    </div>
                                </div>

                                {/* FILA 3: Barrio y Código postal */}
                                <div className="checkout-form-row">
                                    <div className="checkout-field-group">
                                        <label htmlFor="shipping-barrio">
                                            <Building size={13} />
                                            Barrio
                                        </label>
                                        <div className="checkout-input-with-icon">
                                            <Building size={16} className="field-inner-icon" />
                                            <input
                                                id="shipping-barrio"
                                                type="text"
                                                value={barrio}
                                                onChange={(e) => setBarrio(e.target.value)}
                                                placeholder="Ej. Laureles"
                                            />
                                        </div>
                                    </div>

                                    <div className="checkout-field-group">
                                        <label htmlFor="shipping-zip">
                                            <Mail size={13} />
                                            Código postal (opcional)
                                        </label>
                                        <div className="checkout-input-with-icon">
                                            <Mail size={16} className="field-inner-icon" />
                                            <input
                                                id="shipping-zip"
                                                type="text"
                                                value={codigoPostal}
                                                onChange={(e) => setCodigoPostal(e.target.value)}
                                                placeholder="Ej. 050034"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TARJETA 3: TÉRMINOS Y CONDICIONES */}
                        <div className="checkout-card checkout-card-terms">
                            <div className="checkout-card-header">
                                <div className="checkout-card-title-group">
                                    <div className="checkout-badge-number pink">3</div>
                                    <div className="checkout-header-icon-group">
                                        <Truck size={20} className="checkout-step-main-icon" />
                                        <div>
                                            <h2 className="checkout-card-title">Términos y condiciones</h2>
                                            <p className="checkout-card-desc">
                                                Por favor confirma para continuar con tu compra.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="checkout-terms-container">
                                {/* TÉRMINOS */}
                                <label
                                    className={`checkout-terms-box ${
                                        terminosAceptados ? "is-selected" : ""
                                    } ${terminosError ? "has-error" : ""}`}
                                >
                                    <div className="checkout-terms-left">
                                        <input
                                            type="checkbox"
                                            checked={terminosAceptados}
                                            onChange={(e) => {
                                                setTerminosAceptados(e.target.checked);
                                                setTerminosError("");
                                            }}
                                            className="checkout-custom-checkbox"
                                        />
                                        <span className="checkout-terms-text">
                                            He leído y acepto los{" "}
                                            <a
                                                href="/Legal/Terminos%20y%20Condiciones.pdf"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: "#6A2CA0", fontWeight: 700, textDecoration: "underline" }}
                                            >
                                                términos y condiciones
                                            </a>{" "}
                                            de miVenta.co.
                                        </span>
                                    </div>
                                    <ChevronRight size={16} className="checkout-terms-arrow" />
                                </label>
                                {terminosError && (
                                    <span className="field-error-msg terms-error">{terminosError}</span>
                                )}

                                {/* TRATAMIENTO DE DATOS */}
                                <label
                                    className={`checkout-terms-box ${
                                        datosAceptados ? "is-selected" : ""
                                    } ${datosError ? "has-error" : ""}`}
                                >
                                    <div className="checkout-terms-left">
                                        <input
                                            type="checkbox"
                                            checked={datosAceptados}
                                            onChange={(e) => {
                                                setDatosAceptados(e.target.checked);
                                                setDatosError("");
                                            }}
                                            className="checkout-custom-checkbox"
                                        />
                                        <span className="checkout-terms-text">
                                            El cliente autoriza el tratamiento de sus datos conforme a la{" "}
                                            <a
                                                href="/Legal/Politica%20de%20Privacidad.pdf"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: "#6A2CA0", fontWeight: 700, textDecoration: "underline" }}
                                            >
                                                política de privacidad
                                            </a>{" "}
                                            publicada en www.miVenta.co.
                                        </span>
                                    </div>
                                    <ChevronRight size={16} className="checkout-terms-arrow" />
                                </label>
                                {datosError && (
                                    <span className="field-error-msg terms-error">{datosError}</span>
                                )}

                                {/* BOTÓN FINAL DE PAGO */}
                                <button
                                    type="button"
                                    className="checkout-cta-submit-btn"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={18} className="spin" />
                                            <span>Procesando pedido...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={17} />
                                            <span>Continuar al resumen del pedido</span>
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* COLUMNA DERECHA: RESUMEN DEL PEDIDO */}
                    <aside className="checkout-sidebar-column">
                        <div className="checkout-order-summary-wrapper">
                            {/* CABECERA CON DEGRADADO */}
                            <div className="checkout-summary-gradient-header">
                                <div className="checkout-summary-title-wrap">
                                    <ShoppingCart size={22} className="checkout-header-cart-icon" />
                                    <h3>Resumen del pedido</h3>
                                </div>
                                <span className="checkout-product-count-pill">
                                    {items.length} {items.length === 1 ? "producto" : "productos"}
                                </span>
                            </div>

                            {/* CUERPO DEL RESUMEN */}
                            <div className="checkout-summary-card-body">
                                {/* LISTA DE PRODUCTOS */}
                                <div className="checkout-items-list">
                                    {items.map((item) => {
                                        const subtotal =
                                            Number(item.producto_precio || 0) *
                                            Number(item.cantidad || 0);
                                        const key = item.id_item || item.variante_id;

                                        return (
                                            <div key={key} className="checkout-item-card">
                                                <div className="checkout-item-thumb">
                                                    <img
                                                        src={mediaUrl(item.imagen, NoImage)}
                                                        alt={item.producto_nombre}
                                                        onError={(e) => {
                                                            e.currentTarget.src = NoImage;
                                                        }}
                                                    />
                                                </div>

                                                <div className="checkout-item-details">
                                                    <h4 className="checkout-item-title">
                                                        {item.producto_nombre}
                                                    </h4>
                                                    <div className="checkout-item-meta">
                                                        <span>Cantidad: {item.cantidad}</span>
                                                        {(item.talla || item.color) && (
                                                            <div className="checkout-item-variants">
                                                                {item.talla && <span>Talla: {item.talla}</span>}
                                                                {item.talla && item.color && <span> | </span>}
                                                                {item.color && <span>Color: {item.color}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="checkout-item-price-col">
                                                    <strong>{formatearPesos(subtotal)}</strong>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* SUBTOTAL Y COSTO DE ENVÍO */}
                                <div className="checkout-totals-breakdown">
                                    <div className="checkout-total-row">
                                        <span className="checkout-total-label">Subtotal</span>
                                        <span className="checkout-total-amount">
                                            {formatearPesos(total)}
                                        </span>
                                    </div>

                                    <div className="checkout-total-row">
                                        <span className="checkout-total-label">Envío</span>
                                        <div className="checkout-shipping-calc">
                                            <Truck size={15} />
                                            <span>Por definir</span>
                                            <div
                                                className="checkout-info-tooltip"
                                                title="El costo de envío se confirmará al coordinar la entrega por WhatsApp"
                                            >
                                                <Info size={14} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="checkout-summary-hr" />

                                {/* TOTAL GENERAL */}
                                <div className="checkout-grand-total-row">
                                    <span className="checkout-grand-title">Total</span>
                                    <span className="checkout-grand-amount">
                                        {formatearPesos(total)}
                                    </span>
                                </div>

                                {/* TARJETA DE DESTINO DE ENTREGA */}
                                <div className="checkout-delivery-preview-card">
                                    <div className="checkout-destination-icon-wrap">
                                        <MapPin size={18} />
                                    </div>

                                    <div className="checkout-destination-details">
                                        <span className="checkout-destination-heading">
                                            Tu pedido llegará a
                                        </span>
                                        <p className="checkout-destination-address">
                                            {direccion || "Dirección pendiente de ingresar"}
                                        </p>
                                        <span className="checkout-destination-city">
                                            {ciudad}, {departamento} - {pais}
                                        </span>

                                        <button
                                            type="button"
                                            className="checkout-change-address-btn"
                                            onClick={scrollToAddress}
                                        >
                                            <Pencil size={12} />
                                            Cambiar dirección
                                        </button>
                                    </div>
                                </div>

                                {/* 4 BADGES DE CONFIANZA */}
                                <div className="checkout-trust-grid">
                                    <div className="checkout-trust-badge">
                                        <Truck size={17} />
                                        <span>Envíos seguros a todo el país</span>
                                    </div>

                                    <div className="checkout-trust-badge">
                                        <ShieldCheck size={17} />
                                        <span>Pagos 100% protegidos</span>
                                    </div>

                                    <div className="checkout-trust-badge">
                                        <Headphones size={17} />
                                        <span>Atención personalizada</span>
                                    </div>

                                    <div className="checkout-trust-badge">
                                        <Percent size={17} />
                                        <span>Compra confiable</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}

export default Checkout;
