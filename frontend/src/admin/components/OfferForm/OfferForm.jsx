import "./OfferForm.css";

import { Fragment, useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import {
    ArrowLeft,
    ArrowRight,
    Check,
    ChevronDown,
    CalendarDays,
    Info,
    Layers,
    ListChecks,
    HelpCircle,
    Package,
    Folder,
    CornerDownRight
} from "lucide-react";

import {
    createOffer,
    updateOffer,
    getProducts,
    getVariants,
    getCategories
} from "../../../services/adminService";

import { useToast } from "../Toast/ToastHost";


const estadoInicial = {
    nombre: "",
    descripcion: "",
    producto_id: "",
    variante_id: "",
    tipo_descuento: "porcentaje",
    valor: "",
    fecha_inicio: "",
    fecha_fin: "",
    activa: true,
    categorias_ids: []
};


const STEPS = [
    {
        key: "info",
        label: "Información",
        description: "Nombre, producto y descuento"
    },
    {
        key: "vigencia",
        label: "Vigencia y categorías",
        description: "Fechas, estado y categorías"
    },
    {
        key: "resumen",
        label: "Resumen",
        description: "Revisa antes de guardar"
    }
];


// Convierte "YYYY-MM-DDTHH:mm" (valor de input datetime-local) a
// "YYYY-MM-DDTHH:mm:00" para mantener segundos estables al enviar.
function normalizarFechaHora(valor) {
    if (!valor) return "";
    return valor.length === 16 ? `${valor}:00` : valor;
}


function HelpHint({ texto }) {
    return (
        <span
            className="help-hint"
            tabIndex={0}
            aria-label={texto}
            role="tooltip"
        >
            <HelpCircle size={13} strokeWidth={2} aria-hidden="true" />
            <span className="help-hint-text">{texto}</span>
        </span>
    );
}


// Organiza las categorías en una jerarquía { padre: [hijos] }, agregando
// los huérfanos (categorías cuyo padre no está en la lista) como propios.
function agruparCategoriasJerarquicamente(categorias) {
    const porId = new Map();
    categorias.forEach((c) => porId.set(c.id_categoria, c));

    const hijosPorPadre = new Map();
    const padres = [];

    categorias.forEach((c) => {
        const idPadre = c.categoria_padre_id;
        if (idPadre && porId.has(idPadre)) {
            if (!hijosPorPadre.has(idPadre)) hijosPorPadre.set(idPadre, []);
            hijosPorPadre.get(idPadre).push(c);
        } else {
            padres.push(c);
        }
    });

    return padres.map((padre) => ({
        padre,
        hijos: hijosPorPadre.get(padre.id_categoria) || []
    }));
}
// Resuelve la primera imagen disponible del producto (variante 0 -> todas),
// devolviendo una URL absoluta lista para <img src>.
function resolverImagenProducto(producto) {
    if (!producto) return null;

    const variantes = Array.isArray(producto.variantes) ? producto.variantes : [];
    for (const variante of variantes) {
        const imagenes = Array.isArray(variante.imagenes) ? variante.imagenes : [];
        for (const img of imagenes) {
            if (img?.imagen) return img.imagen;
        }
    }
    return null;
}


function ProductoImagenPreview({ producto }) {
    const url = resolverImagenProducto(producto);

    return (
        <div className="psc-image">
            {url ? (
                <img src={url} alt={producto?.nombre || "Producto"} />
            ) : (
                <Package size={26} strokeWidth={1.6} />
            )}
        </div>
    );
}


// Da formato de pesos colombianos a un valor numérico.
function formatearPrecio(valor) {
    if (valor === null || valor === undefined || valor === "") return "—";
    const n = Number(valor);
    if (Number.isNaN(n)) return "—";
    return n.toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    });
}


// Calcula el precio con descuento a partir del precio base y el valor/tipo.
function calcularPrecioConDescuento(precioBase, tipo, valor) {
    if (precioBase === null || precioBase === undefined || precioBase === "") {
        return null;
    }
    const base = Number(precioBase);
    const v = Number(valor);
    if (Number.isNaN(base) || Number.isNaN(v) || v <= 0) return null;

    if (tipo === "porcentaje") {
        if (v >= 100) return 0;
        return base * (1 - v / 100);
    }
    // fijo
    return Math.max(0, base - v);
}


function OfferForm({ offer, onClose, onCreated }) {

    const editing = Boolean(offer);

    const toast = useToast();

    const [formData, setFormData] = useState(estadoInicial);
    const [productos, setProductos] = useState([]);
    const [variantes, setVariantes] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [loadingExtras, setLoadingExtras] = useState(true);
    const [errorServidor, setErrorServidor] = useState("");
    const [step, setStep] = useState("info");


    /* =====================================================
       CARGA INICIAL
    ===================================================== */

    useEffect(() => {

        const cargar = async () => {
            try {
                const [productosRes, categoriasRes] = await Promise.all([
                    getProducts(),
                    getCategories()
                ]);

                setProductos(Array.isArray(productosRes.data) ? productosRes.data : []);
                setCategorias(Array.isArray(categoriasRes.data) ? categoriasRes.data : []);
            } catch (error) {
                console.error(error);
                setErrorServidor("No fue posible cargar los datos necesarios.");
            } finally {
                setLoadingExtras(false);
            }
        };

        cargar();

    }, []);


    /* =====================================================
       PRE-POBLAR AL EDITAR
    ===================================================== */

    useEffect(() => {

        if (offer) {
            const productoId = offer.producto_id || offer.producto_detalle?.id_producto || "";
            setFormData({
                nombre: offer.nombre || "",
                descripcion: offer.descripcion || "",
                producto_id: productoId,
                variante_id: offer.variante_id || "",
                tipo_descuento: offer.tipo_descuento || "porcentaje",
                valor: offer.valor ?? "",
                fecha_inicio: offer.fecha_inicio ? offer.fecha_inicio.slice(0, 16) : "",
                fecha_fin: offer.fecha_fin ? offer.fecha_fin.slice(0, 16) : "",
                activa: Boolean(offer.activa),
                categorias_ids: Array.isArray(offer.categorias_detalle)
                    ? offer.categorias_detalle.map((c) => c.id_categoria)
                    : []
            });
        } else {
            setFormData(estadoInicial);
        }

        // Reset al primer paso cada vez que cambia la oferta (crear / editar otra).
        setStep("info");

    }, [offer]);


    /* =====================================================
       VARIANTES DEL PRODUCTO
    ===================================================== */

    useEffect(() => {

        if (!formData.producto_id) {
            setVariantes([]);
            return;
        }

        let cancelado = false;

        const cargarVariantes = async () => {
            try {
                const { data } = await getVariants(formData.producto_id);
                if (!cancelado) {
                    setVariantes(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error(error);
                if (!cancelado) setVariantes([]);
            }
        };

        cargarVariantes();

        return () => {
            cancelado = true;
        };

    }, [formData.producto_id]);


    /* =====================================================
       HANDLERS
    ===================================================== */

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setFormData((prev) => {
            const next = {
                ...prev,
                [name]: type === "checkbox" ? checked : value
            };

            // Si cambia el producto, limpiamos la variante porque
            // las anteriores ya no pertenecen al nuevo producto.
            if (name === "producto_id") {
                next.variante_id = "";
            }

            return next;
        });
    };


    const toggleCategoria = (idCategoria) => {
        setFormData((prev) => {
            const actual = new Set(prev.categorias_ids);
            if (actual.has(idCategoria)) {
                actual.delete(idCategoria);
            } else {
                actual.add(idCategoria);
            }
            return {
                ...prev,
                categorias_ids: Array.from(actual)
            };
        });
    };


    /* =====================================================
       LOOKUPS PARA EL PREVIEW
    ===================================================== */

    const productoSeleccionado = useMemo(() => {
        return productos.find(
            (p) => String(p.id_producto) === String(formData.producto_id)
        );
    }, [productos, formData.producto_id]);

    const varianteSeleccionada = useMemo(() => {
        return variantes.find(
            (v) => String(v.id_variante) === String(formData.variante_id)
        );
    }, [variantes, formData.variante_id]);

    const categoriasSeleccionadas = useMemo(() => {
        return categorias.filter((c) =>
            formData.categorias_ids.includes(c.id_categoria)
        );
    }, [categorias, formData.categorias_ids]);


    /* =====================================================
       FORMATEADORES DEL PREVIEW
    ===================================================== */

    const formatearDescuentoPreview = () => {
        if (!formData.valor) return "—";
        const n = Number(formData.valor);
        if (Number.isNaN(n)) return "—";
        if (formData.tipo_descuento === "porcentaje") return `${n}%`;
        return `$${n.toLocaleString("es-CO")}`;
    };

    const formatearFechaPreview = (valor) => {
        if (!valor) return "Sin definir";
        const fecha = new Date(valor);
        if (Number.isNaN(fecha.getTime())) return valor;
        return fecha.toLocaleString("es-CO", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };


    /* =====================================================
       VALIDACIÓN POR PASO
    ===================================================== */

    // Devuelve el primer error del paso indicado, o null si pasa.
    // Cada error referencia el step al que pertenece, para que el handler
    // que llama a esta función pueda mover al usuario al paso correcto.
    const validarPaso = (stepKey) => {
        if (stepKey === "info") {
            if (!formData.nombre.trim()) {
                return { mensaje: "Ingresa el nombre de la oferta.", step: "info" };
            }
            if (!formData.producto_id) {
                return { mensaje: "Selecciona un producto.", step: "info" };
            }
            if (!formData.valor) {
                return { mensaje: "Ingresa el valor del descuento.", step: "info" };
            }
            return null;
        }
        if (stepKey === "vigencia") {
            if (!formData.fecha_inicio || !formData.fecha_fin) {
                return { mensaje: "Selecciona las fechas de inicio y fin.", step: "vigencia" };
            }
            if (new Date(formData.fecha_fin) < new Date(formData.fecha_inicio)) {
                return {
                    mensaje: "La fecha de fin debe ser posterior a la fecha de inicio.",
                    step: "vigencia"
                };
            }
            return null;
        }
        return null;
    };


    /* =====================================================
       SUBMIT
    ===================================================== */

    const handleSubmit = async (event) => {
        if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
        }

        // Validamos los dos pasos editables; el resumen no tiene campos.
        const errorInfo = validarPaso("info") || validarPaso("vigencia");
        if (errorInfo) {
            setStep(errorInfo.step);
            toast.warning(errorInfo.mensaje, {
                title: "Faltan datos"
            });
            return;
        }

        const payload = {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            producto_id: Number(formData.producto_id),
            variante_id: formData.variante_id ? Number(formData.variante_id) : null,
            tipo_descuento: formData.tipo_descuento,
            valor: Number(formData.valor),
            fecha_inicio: normalizarFechaHora(formData.fecha_inicio),
            fecha_fin: normalizarFechaHora(formData.fecha_fin),
            activa: formData.activa,
            categorias_ids: formData.categorias_ids
        };

        setSubmitting(true);
        setErrorServidor("");

        try {
            if (editing) {
                await updateOffer(offer.id_oferta, payload);
                toast.success("Los cambios de la oferta se guardaron correctamente.", {
                    title: "Oferta actualizada"
                });
            } else {
                await createOffer(payload);
                toast.success("La oferta se creó y quedó activa en el catálogo.", {
                    title: "Oferta creada"
                });
            }

            if (onCreated) {
                onCreated();
            }
        } catch (error) {
            console.error(error);

            const data = error?.response?.data;
            let mensaje = "No fue posible guardar la oferta.";
            if (data && typeof data === "object") {
                if (data.variante_id) {
                    mensaje = "La variante seleccionada no pertenece al producto.";
                    setStep("info");
                } else if (data.fecha_fin) {
                    mensaje = "La fecha de fin debe ser posterior a la fecha de inicio.";
                    setStep("vigencia");
                }
            }
            setErrorServidor(mensaje);
            toast.error(mensaje, {
                title: "No se pudo guardar"
            });
        } finally {
            setSubmitting(false);
        }
    };


    /* =====================================================
       NAVEGACIÓN ENTRE PASOS
    ===================================================== */

    const indiceActual = STEPS.findIndex((s) => s.key === step);

    const irAnterior = () => {
        if (indiceActual > 0) {
            setStep(STEPS[indiceActual - 1].key);
        }
    };

    const irSiguiente = () => {
        const errorInfo = validarPaso(step);
        if (errorInfo) {
            // El step del error es siempre el actual, no saltamos más lejos.
            toast.warning(errorInfo.mensaje, {
                title: "Revisa este paso"
            });
            return;
        }
        if (indiceActual < STEPS.length - 1) {
            setStep(STEPS[indiceActual + 1].key);
        }
    };

    // Click sobre un paso del stepper: no deja brincar hacia adelante
    // sin haber completado los pasos previos (igual que "Siguiente").
    const irAStep = (targetKey) => {
        const targetIndex = STEPS.findIndex((s) => s.key === targetKey);
        if (targetIndex === -1) return;

        // Sólo validamos los pasos previos al objetivo (no el actual).
        for (let i = 0; i < targetIndex; i++) {
            const previo = STEPS[i].key;
            if (validarPaso(previo)) {
                toast.warning(
                    `Completa el paso "${STEPS[i].label}" antes de continuar.`,
                    { title: "Faltan datos" }
                );
                setStep(previo);
                return;
            }
        }

        setStep(targetKey);
    };

    // ¿Este paso ya fue completado? (sólo para mostrar el check en el stepper)
    const isStepCompleted = (stepKey) => {
        if (stepKey === step) return false;
        return validarPaso(stepKey) === null;
    };


    /* =====================================================
       RENDER
    ===================================================== */

    return (

        <div className="offer-form-page">

            <div className="offer-form-top">
                <button
                    type="button"
                    className="back-button"
                    onClick={onClose}
                >
                    <ArrowLeft size={18} />
                    Ofertas
                </button>
            </div>


            <div className="offer-form-heading">
                <div>
                    <h1>
                        {editing ? "Editar oferta" : "Nueva oferta"}
                    </h1>
                    <p>
                        {editing
                            ? "Actualiza la información de la promoción."
                            : "Crea una promoción aplicando descuentos a un producto, con o sin variante específica."}
                    </p>
                </div>
            </div>


            {errorServidor && (
                <div className="offer-form-error">{errorServidor}</div>
            )}


            <div className="offer-form-layout">

                {/* =========================
                    FORMULARIO
                ========================= */}
                <form
                    className="offer-form-card"
                    onSubmit={handleSubmit}
                >

                    <div className="form-card-header">
                        <div>
                            <h2>
                                {editing ? "Editar oferta" : "Nueva oferta"}
                            </h2>
                            <p>
                                {editing
                                    ? "Modifica los datos y revisa el resumen antes de guardar."
                                    : "Crea una promoción en 3 pasos: información, vigencia y revisión."}
                            </p>
                        </div>
                    </div>


                    {/* =========================
                        STEPPER
                    ========================= */}
                    <div className="stepper">
                        {STEPS.map((s, i) => (
                            <Fragment key={s.key}>
                                <button
                                    type="button"
                                    className={
                                        "step " +
                                        (s.key === step
                                            ? "active"
                                            : isStepCompleted(s.key)
                                                ? "completed"
                                                : "")
                                    }
                                    onClick={() => irAStep(s.key)}
                                >
                                    <span className="step-number">{i + 1}</span>
                                    <span className="step-text">
                                        <strong>{s.label}</strong>
                                        <small>{s.description}</small>
                                    </span>
                                </button>
                                {i < STEPS.length - 1 && (
                                    <div className="step-line" />
                                )}
                            </Fragment>
                        ))}
                    </div>


                    <div className="offer-form-content">

                        {/* =========================
                            PASO 1 — INFORMACIÓN
                        ========================= */}
                        {step === "info" && (
                            <section className="step-content">
                                <div className="section-heading">
                                    <span className="section-icon">
                                        <Info size={20} />
                                    </span>
                                    <div>
                                        <h3>Información de la oferta</h3>
                                        <p>
                                            Define el nombre, el descuento y el producto
                                            (o variante) al que se aplicará.
                                        </p>
                                    </div>
                                </div>


                                {/* Nombre */}
                                <div className="form-group full">
                                    <label htmlFor="nombre">
                                        Nombre<span>*</span>
                                        <HelpHint texto="Título visible para el cliente. Usa algo reconocible, ej. 'Black Friday 20%'." />
                                    </label>
                                    <input
                                        id="nombre"
                                        type="text"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleChange}
                                        placeholder="Ej: Black Friday 20%"
                                    />
                                </div>


                                {/* Descripción */}
                                <div className="form-group full">
                                    <label htmlFor="descripcion">
                                        Descripción<small>(opcional)</small>
                                        <HelpHint texto="Detalle opcional que verá el cliente en el catálogo. Sirve para aclarar condiciones o vigencia." />
                                    </label>
                                    <textarea
                                        id="descripcion"
                                        name="descripcion"
                                        value={formData.descripcion}
                                        onChange={handleChange}
                                        placeholder="Detalles visibles para el cliente."
                                        rows="4"
                                    />
                                </div>


                                {/* Tipo + valor */}
                                <div className="form-row">

                                    <div className="form-group">
                                        <label htmlFor="tipo_descuento">
                                            Tipo de descuento<span>*</span>
                                            <HelpHint texto="Porcentaje (%) se aplica sobre el precio del producto. Valor fijo ($) descuenta una cantidad absoluta." />
                                        </label>
                                        <div className="select-wrapper">
                                            <select
                                                id="tipo_descuento"
                                                name="tipo_descuento"
                                                value={formData.tipo_descuento}
                                                onChange={handleChange}
                                            >
                                                <option value="porcentaje">Porcentaje (%)</option>
                                                <option value="fijo">Valor fijo ($)</option>
                                            </select>
                                            <ChevronDown size={17} />
                                        </div>
                                    </div>


                                    <div className="form-group">
                                        <label htmlFor="valor">
                                            Valor<span>*</span>
                                            <HelpHint texto="Número sin símbolos. Para porcentaje, 0-100. Para valor fijo, en pesos colombianos." />
                                        </label>
                                        <input
                                            id="valor"
                                            type="number"
                                            name="valor"
                                            value={formData.valor}
                                            onChange={handleChange}
                                            placeholder="20"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>

                                </div>


                                {/* Producto */}
                                <div className="form-group full">
                                    <label htmlFor="producto_id">
                                        Producto<span>*</span>
                                        <HelpHint texto="Producto al que se le aplicará la oferta. Las variantes disponibles dependerán de esta elección." />
                                    </label>
                                    <div className="select-wrapper">
                                        <select
                                            id="producto_id"
                                            name="producto_id"
                                            value={formData.producto_id}
                                            onChange={handleChange}
                                            disabled={loadingExtras}
                                        >
                                            <option value="">Selecciona un producto</option>
                                            {productos.map((producto) => (
                                                <option
                                                    key={producto.id_producto}
                                                    value={producto.id_producto}
                                                >
                                                    {producto.nombre}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={17} />
                                    </div>

                                    {(productoSeleccionado || offer?.producto_detalle) && (
                                        <div className="product-summary-card">
                                            <ProductoImagenPreview
                                                producto={productoSeleccionado
                                                    || offer?.producto_detalle}
                                            />
                                            <div className="psc-info">
                                                <div className="psc-row">
                                                    <span>
                                                        {productoSeleccionado?.nombre
                                                            || offer?.producto_detalle?.nombre}
                                                    </span>
                                                </div>
                                                <div className="psc-price">
                                                    {formatearPrecio(
                                                        productoSeleccionado?.precio
                                                            ?? offer?.producto_detalle?.precio
                                                    )}
                                                </div>
                                                {varianteSeleccionada && (
                                                    <span className="psc-variant">
                                                        Variante: {varianteSeleccionada.sku}
                                                    </span>
                                                )}
                                                <div className="psc-meta">
                                                    Se aplicará {varianteSeleccionada
                                                        ? "solo a esta variante"
                                                        : "a todas las variantes"} del producto.
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>


                                {/* Variante opcional */}
                                <div className="form-group full">
                                    <label htmlFor="variante_id">
                                        Variante<small>(opcional)</small>
                                        <HelpHint texto="Déjalo vacío para aplicar la oferta a todas las variantes del producto. Úsalo solo para una variante específica (talla, color, etc.)." />
                                    </label>
                                    <div className="select-wrapper">
                                        <select
                                            id="variante_id"
                                            name="variante_id"
                                            value={formData.variante_id}
                                            onChange={handleChange}
                                            disabled={!formData.producto_id}
                                        >
                                            <option value="">
                                                Todas las variantes del producto
                                            </option>
                                            {variantes.map((variante) => (
                                                <option
                                                    key={variante.id_variante}
                                                    value={variante.id_variante}
                                                >
                                                    {variante.sku}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={17} />
                                    </div>
                                    <small>
                                        Selecciona una variante específica. Si no eliges ninguna,
                                        se aplica a todas las variantes del producto.
                                    </small>
                                </div>
                            </section>
                        )}


                        {/* =========================
                            PASO 2 — VIGENCIA, ESTADO Y CATEGORÍAS
                        ========================= */}
                        {step === "vigencia" && (
                            <section className="step-content">
                                <div className="section-heading">
                                    <span className="section-icon">
                                        <CalendarDays size={20} />
                                    </span>
                                    <div>
                                        <h3>Vigencia, estado y categorías</h3>
                                        <p>
                                            Define cuándo estará activa y bajo qué
                                            categorías del catálogo aparecerá.
                                        </p>
                                    </div>
                                </div>


                                {/* Fechas */}
                                <div className="form-row two-cols">

                                    <div className="form-group">
                                        <label htmlFor="fecha_inicio">
                                            Fecha de inicio<span>*</span>
                                            <HelpHint texto="Momento exacto en que la oferta empieza a mostrarse al cliente." />
                                        </label>
                                        <input
                                            id="fecha_inicio"
                                            type="datetime-local"
                                            name="fecha_inicio"
                                            value={formData.fecha_inicio}
                                            onChange={handleChange}
                                        />
                                    </div>


                                    <div className="form-group">
                                        <label htmlFor="fecha_fin">
                                            Fecha de fin<span>*</span>
                                            <HelpHint texto="Momento en que la oferta deja de mostrarse. Debe ser posterior a la fecha de inicio." />
                                        </label>
                                        <input
                                            id="fecha_fin"
                                            type="datetime-local"
                                            name="fecha_fin"
                                            value={formData.fecha_fin}
                                            onChange={handleChange}
                                        />
                                    </div>

                                </div>


                                {/* Estado de la oferta */}
                                <div className="form-group full">
                                    <label htmlFor="activa">
                                        Estado de la oferta<span>*</span>
                                        <HelpHint texto="Si la marca como inactiva, la oferta queda guardada pero oculta al cliente aunque esté dentro del período." />
                                    </label>
                                    <div className="select-wrapper">
                                        <select
                                            id="activa"
                                            name="activa"
                                            value={formData.activa ? "activa" : "inactiva"}
                                            onChange={(event) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    activa: event.target.value === "activa"
                                                }))
                                            }
                                        >
                                            <option value="activa">Activa (visible al cliente)</option>
                                            <option value="inactiva">Inactiva (oculta al cliente)</option>
                                        </select>
                                        <ChevronDown size={17} />
                                    </div>
                                    <small>
                                        Puedes cambiar el estado en cualquier momento desde
                                        la lista de ofertas.
                                    </small>
                                </div>


                                {/* Categorías */}
                                <div className="form-group full">
                                    <label>
                                        Categorías<small>(opcional, selección múltiple)</small>
                                        <HelpHint texto="Agrupa la oferta bajo estas categorías en el catálogo. Si no eliges ninguna, la oferta no quedará agrupada." />
                                    </label>

                                    <div className="categories-manage-row">
                                        <Link
                                            to="/admin/categories"
                                            className="link-to-categories"
                                        >
                                            <Folder size={14} />
                                            Administrar categorías
                                            <span aria-hidden="true">↗</span>
                                        </Link>
                                    </div>

                                    <div className="categories-checkbox-list">
                                        {categorias.length === 0 ? (
                                            <div className="categories-empty">
                                                <Folder size={28} strokeWidth={1.5} />
                                                <p>
                                                    Aún no hay categorías creadas.
                                                </p>
                                                <Link
                                                    to="/admin/categories"
                                                    className="link-to-categories link-to-categories--solid"
                                                >
                                                    + Crear primera categoría
                                                </Link>
                                            </div>
                                        ) : (
                                            agruparCategoriasJerarquicamente(categorias).map(
                                                (grupo) => (
                                                    <div
                                                        key={grupo.padre.id_categoria}
                                                        className="category-group"
                                                    >
                                                        <label
                                                            className={
                                                                "category-check is-parent" +
                                                                (formData.categorias_ids.includes(
                                                                    grupo.padre.id_categoria
                                                                )
                                                                    ? " is-checked"
                                                                    : "")
                                                            }
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.categorias_ids.includes(
                                                                    grupo.padre.id_categoria
                                                                )}
                                                                onChange={() =>
                                                                    toggleCategoria(
                                                                        grupo.padre.id_categoria
                                                                    )
                                                                }
                                                            />
                                                            <span className="cc-icon">
                                                                <Folder size={15} strokeWidth={2.2} />
                                                            </span>
                                                            <span className="cc-text">
                                                                {grupo.padre.nombre}
                                                            </span>
                                                        </label>

                                                        {grupo.hijos.map((hijo) => {
                                                            const checkedHijo =
                                                                formData.categorias_ids.includes(
                                                                    hijo.id_categoria
                                                                );
                                                            return (
                                                                <label
                                                                    key={hijo.id_categoria}
                                                                    className={
                                                                        "category-check is-child" +
                                                                        (checkedHijo
                                                                            ? " is-checked"
                                                                            : "")
                                                                    }
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checkedHijo}
                                                                        onChange={() =>
                                                                            toggleCategoria(
                                                                                hijo.id_categoria
                                                                            )
                                                                        }
                                                                    />
                                                                    <span className="cc-icon">
                                                                        <CornerDownRight
                                                                            size={14}
                                                                            strokeWidth={2.2}
                                                                        />
                                                                    </span>
                                                                    <span className="cc-text">
                                                                        {hijo.nombre}
                                                                    </span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )
                                            )
                                        )}
                                    </div>

                                    <small>
                                        La oferta aparecerá agrupada bajo las categorías
                                        seleccionadas.
                                    </small>
                                </div>
                            </section>
                        )}


                        {/* =========================
                            PASO 3 — RESUMEN
                        ========================= */}
                        {step === "resumen" && (
                            <section className="step-content">
                                <div className="section-heading">
                                    <span className="section-icon">
                                        <ListChecks size={20} />
                                    </span>
                                    <div>
                                        <h3>Resumen de la oferta</h3>
                                        <p>
                                            Revisa toda la información antes de guardar.
                                            Puedes volver a cualquier paso para editar.
                                        </p>
                                    </div>
                                </div>


                                {/* Información */}
                                <div className="summary-card">
                                    <div className="summary-card-header">
                                        <h4>Información</h4>
                                        <button
                                            type="button"
                                            className="edit-step-button"
                                            onClick={() => setStep("info")}
                                        >
                                            Editar
                                        </button>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">Nombre</span>
                                        <span className="summary-value">
                                            {formData.nombre || <em className="summary-empty">—</em>}
                                        </span>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">Descripción</span>
                                        <span className="summary-value">
                                            {formData.descripcion
                                                ? formData.descripcion
                                                : <em className="summary-empty">Sin descripción</em>}
                                        </span>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">Descuento</span>
                                        <span className="summary-value">
                                            {formatearDescuentoPreview()}
                                        </span>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">Producto</span>
                                        <span className="summary-value">
                                            {productoSeleccionado?.nombre
                                                || offer?.producto_detalle?.nombre
                                                || <em className="summary-empty">—</em>}
                                        </span>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">Variante</span>
                                        <span className="summary-value">
                                            {varianteSeleccionada?.sku
                                                || <em className="summary-empty">Todas las variantes</em>}
                                        </span>
                                    </div>
                                </div>


                                {/* Vigencia y estado */}
                                <div className="summary-card">
                                    <div className="summary-card-header">
                                        <h4>Vigencia y estado</h4>
                                        <button
                                            type="button"
                                            className="edit-step-button"
                                            onClick={() => setStep("vigencia")}
                                        >
                                            Editar
                                        </button>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">Desde</span>
                                        <span className="summary-value">
                                            {formatearFechaPreview(formData.fecha_inicio)}
                                        </span>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">Hasta</span>
                                        <span className="summary-value">
                                            {formatearFechaPreview(formData.fecha_fin)}
                                        </span>
                                    </div>
                                    <div className="summary-row">
                                        <span className="summary-label">Estado</span>
                                        <span className="summary-value">
                                            <span
                                                className={
                                                    "preview-badge " +
                                                    (formData.activa ? "is-active" : "is-inactive")
                                                }
                                            >
                                                {formData.activa ? "ACTIVA" : "INACTIVA"}
                                            </span>
                                        </span>
                                    </div>
                                </div>


                                {/* Categorías */}
                                <div className="summary-card">
                                    <div className="summary-card-header">
                                        <h4>Categorías</h4>
                                        <button
                                            type="button"
                                            className="edit-step-button"
                                            onClick={() => setStep("vigencia")}
                                        >
                                            Editar
                                        </button>
                                    </div>
                                    {categoriasSeleccionadas.length === 0 ? (
                                        <p className="summary-empty">
                                            La oferta no está agrupada bajo ninguna categoría.
                                        </p>
                                    ) : (
                                        <div className="summary-row">
                                            <span className="summary-label">
                                                {categoriasSeleccionadas.length} seleccionada(s)
                                            </span>
                                            <div className="summary-chips">
                                                {categoriasSeleccionadas.map((c) => (
                                                    <span
                                                        key={c.id_categoria}
                                                        className="summary-chip"
                                                    >
                                                        {c.nombre}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>


                                {/* Precio con descuento */}
                                {(() => {
                                    const precioBase = productoSeleccionado?.precio
                                        ?? offer?.producto_detalle?.precio;
                                    const precioFinal = calcularPrecioConDescuento(
                                        precioBase,
                                        formData.tipo_descuento,
                                        formData.valor
                                    );
                                    if (precioBase === undefined || precioBase === null) {
                                        return null;
                                    }
                                    return (
                                        <div className="summary-card">
                                            <div className="summary-card-header">
                                                <h4>Precio con descuento</h4>
                                            </div>
                                            <div className="summary-price-box">
                                                <div className="preview-price-row">
                                                    <span className="preview-price-label">
                                                        Precio original
                                                    </span>
                                                    <span
                                                        className={
                                                            "preview-price-original" +
                                                            (precioFinal !== null ? " is-strike" : "")
                                                        }
                                                    >
                                                        {formatearPrecio(precioBase)}
                                                    </span>
                                                </div>
                                                {precioFinal !== null && (
                                                    <div className="preview-price-row">
                                                        <span className="preview-price-label">
                                                            Precio con oferta
                                                        </span>
                                                        <span className="preview-price-final">
                                                            {formatearPrecio(precioFinal)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </section>
                        )}

                    </div>


                    {/* =========================
                        ACCIONES (cambian según el paso)
                    ========================= */}
                    <div className="form-actions">
                        <button
                            type="button"
                            className="cancel-form-button"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancelar
                        </button>

                        {indiceActual > 0 && (
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={irAnterior}
                                disabled={submitting}
                            >
                                <ArrowLeft size={16} />
                                Anterior
                            </button>
                        )}

                        {step !== "resumen" ? (
                            <button
                                type="button"
                                className="save-form-button"
                                onClick={irSiguiente}
                                disabled={submitting}
                            >
                                Siguiente
                                <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                className="save-form-button"
                                disabled={submitting}
                            >
                                <Check size={17} />
                                {submitting
                                    ? "Guardando..."
                                    : editing
                                        ? "Guardar cambios"
                                        : "Crear oferta"}
                            </button>
                        )}
                    </div>

                </form>


                {/* =========================
                    VISTA PREVIA
                ========================= */}
                <div className="offer-preview-card">

                    <div className="preview-header">
                        <div>
                            <h2>Vista previa</h2>
                            <p>Así se mostrará esta oferta.</p>
                        </div>
                    </div>


                    <div className="preview-content">

                        {/* Badge de estado */}
                        <div className="preview-status-row">
                            <span
                                className={
                                    "preview-badge " +
                                    (formData.activa ? "is-active" : "is-inactive")
                                }
                            >
                                {formData.activa ? "ACTIVA" : "INACTIVA"}
                            </span>
                        </div>


                        {/* Nombre + descuento */}
                        <div className="preview-name">
                            {formData.nombre || "Nombre de la oferta"}
                        </div>

                        <div className="preview-discount">
                            {formatearDescuentoPreview()}
                        </div>


                        {/* Precio con descuento */}
                        {(() => {
                            const precioBase = productoSeleccionado?.precio
                                ?? offer?.producto_detalle?.precio;
                            const precioFinal = calcularPrecioConDescuento(
                                precioBase,
                                formData.tipo_descuento,
                                formData.valor
                            );
                            if (precioBase === undefined || precioBase === null) {
                                return null;
                            }
                            return (
                                <div className="preview-price-box">
                                    <div className="preview-price-row">
                                        <span className="preview-price-label">
                                            Precio original
                                        </span>
                                        <span
                                            className={
                                                "preview-price-original" +
                                                (precioFinal !== null ? " is-strike" : "")
                                            }
                                        >
                                            {formatearPrecio(precioBase)}
                                        </span>
                                    </div>
                                    {precioFinal !== null && (
                                        <div className="preview-price-row">
                                            <span className="preview-price-label">
                                                Precio con oferta
                                            </span>
                                            <span className="preview-price-final">
                                                {formatearPrecio(precioFinal)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}


                        {/* Fechas */}
                        <div className="preview-block">
                            <div className="preview-block-title">
                                <CalendarDays size={14} />
                                Período
                            </div>
                            <div className="preview-dates">
                                <div>
                                    <span>Desde</span>
                                    <strong>
                                        {formatearFechaPreview(formData.fecha_inicio)}
                                    </strong>
                                </div>
                                <div>
                                    <span>Hasta</span>
                                    <strong>
                                        {formatearFechaPreview(formData.fecha_fin)}
                                    </strong>
                                </div>
                            </div>
                        </div>


                        {/* Categorías */}
                        <div className="preview-block">
                            <div className="preview-block-title">
                                <Layers size={14} />
                                Categorías
                            </div>
                            {categoriasSeleccionadas.length === 0 ? (
                                <div className="preview-empty">
                                    <span>Sin categorías</span>
                                </div>
                            ) : (
                                <div className="preview-chips">
                                    {categoriasSeleccionadas.map((c) => (
                                        <span key={c.id_categoria} className="preview-chip">
                                            {c.nombre}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>


                        {/* Descripción */}
                        {formData.descripcion && (
                            <div className="preview-description">
                                {formData.descripcion}
                            </div>
                        )}

                    </div>


                    <div className="preview-note">
                        <Info size={16} />
                        <span>
                            Los cambios se guardan al pulsar <strong>Crear oferta</strong>
                            {" "}o <strong>Guardar cambios</strong>.
                        </span>
                    </div>

                </div>

            </div>

        </div>

    );

}


export default OfferForm;
