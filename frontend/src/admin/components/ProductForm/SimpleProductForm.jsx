import { useState, useEffect, useRef } from "react";
import {
    Package,
    DollarSign,
    Link as LinkIcon,
    ChevronDown,
    ChevronLeft,
    Image as ImageIcon,
    ImagePlus,
    Info,
    Check,
    Star,
    Trash2,
    Save,
    AlertCircle,
    Video,
    Film,
    Play,
    Loader2,
    CheckCircle2,
    UploadCloud,
    Globe,
} from "lucide-react";
import "./SimpleProductForm.css";
import SimpleCategorySelect from "./SimpleCategorySelect";
import { saveProductComplete, getCategories } from "../../../services/adminService";
import { ensureCsrf } from "../../../services/api";
import {
    MAX_IMAGES_SIMPLE,
    validateImageUrl,
    validateVideoFile,
    validateVideoUrl,
    isVideoResource,
} from "../../../utils/mediaValidation";

const API_ORIGIN = "http://127.0.0.1:8000";
const MAX_IMAGES = MAX_IMAGES_SIMPLE;

const slugify = (text) =>
    (text || "")
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

const mediaUrl = (value) => {
    if (!value) return "";
    if (
        value.startsWith("blob:") ||
        value.startsWith("http://") ||
        value.startsWith("https://")
    ) {
        return value;
    }
    return `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
};

function SimpleProductForm({ product, onClose, onSaved, onSwitchToVariable }) {
    const editing = Boolean(product?.id_producto);

    // Identificador técnico de la variante en backend para updates
    const technicalVariant = product?.variantes?.[0] || null;

    const initialCategoriaId =
        product?.categoria?.id_categoria ??
        product?.categoria_id ??
        product?.categorias?.[0]?.id_categoria ??
        "";

    const [datos, setDatos] = useState(() => ({
        nombre: product?.nombre || "",
        categorias_ids:
            product?.categorias?.map((c) => Number(c.id_categoria)) ??
            (product?.categorias_ids ? product.categorias_ids.map(Number) : []) ??
            (initialCategoriaId ? [Number(initialCategoriaId)] : []) ??
            [],
        categoria_id: initialCategoriaId ? Number(initialCategoriaId) : "",
        descripcion: product?.descripcion || "",
        precio: product?.precio ?? "",
        stock_general: product?.stock_general ?? technicalVariant?.stock ?? "",
        estado: product?.estado || "activo",
        slug: product?.slug || "",
    }));

    // Extraer recursos multimedia iniciales
    const rawMedia =
        product?.imagenes_generales && product.imagenes_generales.length > 0
            ? product.imagenes_generales
            : technicalVariant?.imagenes && technicalVariant.imagenes.length > 0
            ? technicalVariant.imagenes
            : [];

    // Lista de imágenes: [{ id_imagen, imagen, file, principal, orden, tipo: "imagen" }]
    const [imagenes, setImagenes] = useState(() => {
        return rawMedia
            .filter((m) => m.tipo !== "video" && !isVideoResource(m.imagen))
            .map((img, idx) => ({
                id_imagen: img.id_imagen,
                imagen: img.imagen,
                principal: Boolean(img.principal || idx === 0),
                orden: img.orden ?? idx + 1,
                tipo: "imagen",
            }));
    });

    // Video del producto: { id_imagen, imagen, file, tipo: "video", duration } o null
    const [video, setVideo] = useState(() => {
        const found = rawMedia.find((m) => m.tipo === "video" || isVideoResource(m.imagen));
        if (found) {
            return {
                id_imagen: found.id_imagen,
                imagen: found.imagen,
                file: null,
                tipo: "video",
                principal: false,
            };
        }
        return null;
    });

    // Pestaña de método para imágenes: "file" | "url"
    const [imageInputTab, setImageInputTab] = useState("file");
    const [imageUrlInput, setImageUrlInput] = useState("");
    const [imageUrlLoading, setImageUrlLoading] = useState(false);
    const [imageUrlError, setImageUrlError] = useState("");

    // Pestaña de método para video: "file" | "url"
    const [videoInputTab, setVideoInputTab] = useState("file");
    const [videoUrlInput, setVideoUrlInput] = useState("");
    const [videoLoading, setVideoLoading] = useState(false);
    const [videoError, setVideoError] = useState("");
    const videoFileInputRef = useRef(null);

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [errors, setErrors] = useState({});
    const [dragOver, setDragOver] = useState(false);
    const [videoDragOver, setVideoDragOver] = useState(false);
    const fileInputRef = useRef(null);

    // Cargar categorías
    useEffect(() => {
        getCategories()
            .then((res) => {
                setCategories(res.data || []);
            })
            .catch((err) => {
                console.error("Error al cargar categorías:", err);
            });
    }, []);

    // Manejar cambios en campos de texto
    const handleDataChange = (e) => {
        const { name, value } = e.target;
        setDatos((prev) => {
            const next = { ...prev, [name]: value };
            if (name === "nombre" && !editing && !prev.slug) {
                next.slug = slugify(value);
            }
            return next;
        });

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    // Selección de categoría
    const handleCategoryChange = (catId) => {
        setDatos((prev) => ({
            ...prev,
            categoria_id: catId || "",
            categorias_ids: catId ? [Number(catId)] : [],
        }));

        if (errors.categoria_id) {
            setErrors((prev) => ({ ...prev, categoria_id: "" }));
        }
    };

    // Subir archivos de imagen locales
    const handleFilesSelected = (files) => {
        if (!files || !files.length) return;

        const remainingSlots = MAX_IMAGES - imagenes.length;
        if (remainingSlots <= 0) {
            alert(`Solo puedes agregar hasta ${MAX_IMAGES} imágenes.`);
            return;
        }

        const filesToProcess = Array.from(files).slice(0, remainingSlots);
        const newImages = filesToProcess.map((file, idx) => ({
            id_imagen: null,
            file,
            imagen: URL.createObjectURL(file),
            principal: imagenes.length === 0 && idx === 0,
            orden: imagenes.length + idx + 1,
        }));

        setImagenes((prev) => [...prev, ...newImages]);
    };

    // Establecer imagen como principal
    const handleSetPrincipal = (index, e) => {
        if (e) e.stopPropagation();
        setImagenes((prev) =>
            prev.map((img, idx) => ({
                ...img,
                principal: idx === index,
            }))
        );
    };

    // Eliminar imagen
    const handleDeleteImage = (index, e) => {
        if (e) e.stopPropagation();
        setImagenes((prev) => {
            const filtered = prev.filter((_, idx) => idx !== index);
            if (filtered.length > 0 && !filtered.some((img) => img.principal)) {
                filtered[0].principal = true;
            }
            return filtered.map((img, idx) => ({ ...img, orden: idx + 1 }));
        });
    };

    // Agregar imagen por URL con validación
    const handleAddImageByUrl = async () => {
        if (!imageUrlInput.trim()) return;
        if (imagenes.length >= MAX_IMAGES) {
            setImageUrlError(`Solo puedes agregar hasta ${MAX_IMAGES} imágenes.`);
            return;
        }

        setImageUrlLoading(true);
        setImageUrlError("");
        const res = await validateImageUrl(imageUrlInput.trim());
        setImageUrlLoading(false);

        if (!res.valid) {
            setImageUrlError(res.error || "La URL ingresada no es válida.");
            return;
        }

        if (imagenes.some((img) => img.imagen === res.url)) {
            setImageUrlError("Esta imagen ya ha sido agregada.");
            return;
        }

        setImagenes((prev) => [
            ...prev,
            {
                id_imagen: null,
                file: null,
                imagen: res.url,
                principal: prev.length === 0,
                orden: prev.length + 1,
                tipo: "imagen",
            },
        ]);
        setImageUrlInput("");
        setImageUrlError("");
    };

    // Manejar subida de archivo de video local
    const handleVideoFileSelected = async (file) => {
        if (!file) return;
        setVideoError("");
        setVideoLoading(true);
        const res = await validateVideoFile(file);
        setVideoLoading(false);

        if (!res.valid) {
            setVideoError(res.error);
            return;
        }

        setVideo({
            id_imagen: null,
            file,
            imagen: URL.createObjectURL(file),
            tipo: "video",
            duration: res.duration,
        });
    };

    // Manejar ingreso de video por URL
    const handleAddVideoByUrl = async () => {
        if (!videoUrlInput.trim()) return;
        setVideoLoading(true);
        setVideoError("");
        const res = await validateVideoUrl(videoUrlInput.trim());
        setVideoLoading(false);

        if (!res.valid) {
            setVideoError(res.error);
            return;
        }

        setVideo({
            id_imagen: null,
            file: null,
            imagen: res.url,
            tipo: "video",
            duration: res.duration,
        });
        setVideoUrlInput("");
    };

    // Eliminar video
    const handleDeleteVideo = () => {
        setVideo(null);
        setVideoError("");
    };

    // Validar formulario de Producto Simple
    const validate = () => {
        const next = {};

        if (!datos.nombre.trim()) {
            next.nombre = "El nombre es obligatorio.";
        }

        if (!datos.categoria_id && (!datos.categorias_ids || datos.categorias_ids.length === 0)) {
            next.categoria_id = "Selecciona una categoría.";
        }

        if (datos.precio === "" || Number(datos.precio) <= 0) {
            next.precio = "Ingresa un precio mayor a 0.";
        }

        if (datos.stock_general === "" || Number(datos.stock_general) < 0) {
            next.stock_general = "Ingresa un stock válido (0 o mayor).";
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    // Construir FormData y enviar
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        await ensureCsrf();

        if (!validate()) {
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();

            // Procesar imágenes
            const processedImages = imagenes.map((img, idx) => {
                if (img.file) {
                    const fileKey = `variant_0_image_${idx}`;
                    formData.append(fileKey, img.file, img.file.name);
                    return {
                        principal: Boolean(img.principal),
                        orden: idx + 1,
                        file_key: fileKey,
                        tipo: "imagen",
                    };
                }
                return {
                    ...(img.id_imagen ? { id_imagen: img.id_imagen } : {}),
                    imagen: img.imagen,
                    principal: Boolean(img.principal),
                    orden: idx + 1,
                    tipo: "imagen",
                };
            });

            // Procesar video si existe
            if (video) {
                if (video.file) {
                    const videoKey = `variant_0_video`;
                    formData.append(videoKey, video.file, video.file.name);
                    processedImages.push({
                        principal: false,
                        orden: processedImages.length + 1,
                        file_key: videoKey,
                        tipo: "video",
                    });
                } else if (video.imagen) {
                    processedImages.push({
                        ...(video.id_imagen ? { id_imagen: video.id_imagen } : {}),
                        imagen: video.imagen,
                        principal: false,
                        orden: processedImages.length + 1,
                        tipo: "video",
                    });
                }
            }

            // Variante técnica única para producto simple
            const technicalVariantPayload = {
                ...(technicalVariant?.id_variante
                    ? { id_variante: technicalVariant.id_variante }
                    : {}),
                color_id: null,
                diseño_id: null,
                talla_id: null,
                sku: technicalVariant?.sku || "",
                stock: Number(datos.stock_general) || 0,
                imagenes: processedImages,
            };

            const payload = {
                producto: {
                    ...(editing ? { id_producto: product.id_producto } : {}),
                    nombre: datos.nombre.trim(),
                    categoria_id: Number(datos.categoria_id) || (datos.categorias_ids?.[0] ? Number(datos.categorias_ids[0]) : null),
                    descripcion: datos.descripcion,
                    precio: Number(datos.precio),
                    estado: datos.estado,
                    slug: datos.slug || slugify(datos.nombre),
                },
                producto_simple: true,
                variantes: [technicalVariantPayload],
            };

            formData.append("payload", JSON.stringify(payload));

            const { data } = await saveProductComplete(
                editing ? product.id_producto : null,
                formData
            );

            if (onSaved) {
                await onSaved(data);
            }
            onClose();
        } catch (err) {
            console.error("Error al guardar producto simple:", err);
            const backend = err.response?.data;
            const backendErrors = backend?.errors || backend;
            const nextErrors = {};

            if (backendErrors) {
                if (backendErrors.nombre)
                    nextErrors.nombre = Array.isArray(backendErrors.nombre)
                        ? backendErrors.nombre.join(", ")
                        : backendErrors.nombre;
                if (backendErrors.precio)
                    nextErrors.precio = Array.isArray(backendErrors.precio)
                        ? backendErrors.precio.join(", ")
                        : backendErrors.precio;
                if (backendErrors.categoria_id || backendErrors.categorias_ids)
                    nextErrors.categoria_id = "Selecciona una categoría válida.";
                if (backendErrors.stock_general)
                    nextErrors.stock_general = Array.isArray(backendErrors.stock_general)
                        ? backendErrors.stock_general.join(", ")
                        : backendErrors.stock_general;
                if (backendErrors.detail) setError(backendErrors.detail);
            }

            if (Object.keys(nextErrors).length > 0) {
                setErrors(nextErrors);
            } else {
                setError(
                    backend?.detail ||
                        "Ocurrió un error al guardar el producto. Por favor intenta de nuevo."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="simple-product-container">
            {/* ENCABEZADO SUPERIOR */}
            <header className="simple-product-top-bar">
                <button
                    type="button"
                    className="simple-product-back-btn"
                    onClick={onClose}
                >
                    <ChevronLeft size={16} />
                    Volver a productos
                </button>

                <div className="simple-product-header-center">
                    <div className="simple-product-header-title-row">
                        <div className="simple-product-title-icon-sq">
                            <Package size={22} />
                        </div>
                        <h1>{editing ? "Editar producto" : "Nuevo producto"}</h1>
                    </div>
                    <p>
                        {editing
                            ? "Modifica los datos del producto simple para tu catálogo."
                            : "Crea un producto simple para tu catálogo."}
                    </p>
                </div>
            </header>

            {error && (
                <div className="simple-product-error-banner">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* GRID DE DOS COLUMNAS */}
                <div className="simple-product-grid">
                    {/* COLUMNA IZQUIERDA: INFORMACIÓN DEL PRODUCTO */}
                    <div className="simple-product-card">
                        <div className="simple-product-card-header">
                            <div className="simple-product-card-icon">
                                <Package size={22} />
                            </div>
                            <div className="simple-product-card-title-group">
                                <h3>Información del producto</h3>
                                <p>Completa los datos básicos de tu producto.</p>
                            </div>
                        </div>

                        {/* NOMBRE */}
                        <div className="simple-form-field">
                            <label>
                                Nombre del producto <span className="required-star">*</span>
                            </label>
                            <div className="simple-input-wrapper">
                                <div className="simple-input-left-icon">
                                    <Package size={18} />
                                </div>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={datos.nombre}
                                    onChange={handleDataChange}
                                    placeholder="Ej. Zapatillas deportivas"
                                    className={`simple-text-input ${errors.nombre ? "input-has-error" : ""}`}
                                />
                            </div>
                            {errors.nombre && (
                                <span className="simple-field-error">{errors.nombre}</span>
                            )}
                        </div>

                        {/* CATEGORÍA CON SELECTOR ESPACIOSO Y NO CORTADO */}
                        <div className="simple-form-field">
                            <label>
                                Categoría <span className="required-star">*</span>
                            </label>
                            <SimpleCategorySelect
                                categories={categories}
                                value={datos.categoria_id}
                                onChange={handleCategoryChange}
                                error={errors.categoria_id}
                            />
                            {errors.categoria_id && (
                                <span className="simple-field-error">{errors.categoria_id}</span>
                            )}
                        </div>

                        {/* FILA 2 COLUMNAS: PRECIO Y STOCK */}
                        <div className="simple-form-row-2col">
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
                                    Precio ($) <span className="required-star">*</span>
                                </label>
                                <div className="simple-input-wrapper">
                                    <div className="simple-input-left-icon">
                                        <DollarSign size={18} />
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        name="precio"
                                        value={datos.precio}
                                        onChange={handleDataChange}
                                        placeholder="0"
                                        className={`simple-text-input ${errors.precio ? "input-has-error" : ""}`}
                                    />
                                </div>
                                {errors.precio && (
                                    <span className="simple-field-error">{errors.precio}</span>
                                )}
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
                                    Stock disponible <span className="required-star">*</span>
                                </label>
                                <div className="simple-input-wrapper">
                                    <div className="simple-input-left-icon">
                                        <Package size={18} />
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        name="stock_general"
                                        value={datos.stock_general}
                                        onChange={handleDataChange}
                                        placeholder="0"
                                        className={`simple-text-input ${errors.stock_general ? "input-has-error" : ""}`}
                                    />
                                </div>
                                {errors.stock_general && (
                                    <span className="simple-field-error">{errors.stock_general}</span>
                                )}
                            </div>
                        </div>

                        {/* ESTADO CON INDICADOR DE COLOR */}
                        <div className="simple-form-field">
                            <label>
                                Estado <span className="required-star">*</span>
                            </label>
                            <div className="simple-select-wrapper">
                                <span className={`simple-status-dot ${datos.estado}`} />
                                <select
                                    name="estado"
                                    value={datos.estado}
                                    onChange={handleDataChange}
                                    className="simple-select-status"
                                >
                                    <option value="activo">Activo</option>
                                    <option value="inactivo">Inactivo</option>
                                    <option value="archivado">Archivado</option>
                                </select>
                                <div className="simple-select-chevron">
                                    <ChevronDown size={18} />
                                </div>
                            </div>
                        </div>

                        {/* DESCRIPCIÓN CON CONTADOR */}
                        <div className="simple-form-field">
                            <label>
                                Descripción del producto <span className="required-star">*</span>
                            </label>
                            <div className="simple-textarea-wrapper">
                                <textarea
                                    name="descripcion"
                                    rows="4"
                                    maxLength={2000}
                                    value={datos.descripcion}
                                    onChange={handleDataChange}
                                    placeholder="Describe las características, materiales, dimensiones, etc..."
                                    className="simple-textarea"
                                />
                                <span className="simple-textarea-counter">
                                    {(datos.descripcion || "").length}/2000
                                </span>
                            </div>
                        </div>

                        {/* SLUG OPCIONAL */}
                        <div className="simple-form-field">
                            <label>Slug (opcional)</label>
                            <div className="simple-input-wrapper">
                                <div className="simple-input-left-icon">
                                    <LinkIcon size={18} />
                                </div>
                                <input
                                    type="text"
                                    name="slug"
                                    value={datos.slug}
                                    onChange={handleDataChange}
                                    placeholder="ej. zapatillas-deportivas"
                                    className="simple-text-input simple-slug-input"
                                />
                                <span className="simple-slug-hint">Se generará automáticamente</span>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: FOTOGRAFÍAS Y VIDEO DEL PRODUCTO */}
                    <div className="simple-product-card">
                        <div className="simple-product-card-header">
                            <div className="simple-product-card-icon">
                                <ImageIcon size={22} />
                            </div>
                            <div className="simple-product-card-title-group">
                                <h3>Fotografías del producto</h3>
                                <p>Agrega las imágenes principales de tu producto (hasta {MAX_IMAGES}).</p>
                            </div>
                        </div>

                        {/* PESTAÑAS DE MÉTODO: SUBIR ARCHIVO / PEGAR URL */}
                        <div className="simple-media-tabs">
                            <button
                                type="button"
                                className={`simple-media-tab-btn ${imageInputTab === "file" ? "active" : ""}`}
                                onClick={() => setImageInputTab("file")}
                            >
                                <UploadCloud size={14} />
                                Subir archivo
                            </button>
                            <button
                                type="button"
                                className={`simple-media-tab-btn ${imageInputTab === "url" ? "active" : ""}`}
                                onClick={() => setImageInputTab("url")}
                            >
                                <Globe size={14} />
                                Pegar URL directa
                            </button>
                        </div>

                        {imageInputTab === "file" ? (
                            /* DROPZONE DE SUBIDA DE IMÁGENES */
                            <div
                                className={`simple-dropzone-box ${dragOver ? "drag-over" : ""}`}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragOver(true);
                                }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOver(false);
                                    handleFilesSelected(e.dataTransfer.files);
                                }}
                            >
                                <div className="simple-dropzone-icon">
                                    <ImagePlus size={44} />
                                </div>
                                <h4>Arrastra imágenes aquí o haz clic para subir</h4>
                                <p>Formatos: PNG, JPG, WEBP | Hasta {MAX_IMAGES} fotos</p>
                                <button
                                    type="button"
                                    className="simple-add-photos-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    + Agregar imágenes
                                </button>
                            </div>
                        ) : (
                            /* INGRESO DE IMAGEN POR URL DIRECTA */
                            <div className="simple-url-input-container">
                                <div className="simple-url-input-row">
                                    <div className="simple-input-left-icon">
                                        <LinkIcon size={16} />
                                    </div>
                                    <input
                                        type="url"
                                        placeholder="Pega la URL de la imagen (ej: https://ejemplo.com/foto.jpg)"
                                        value={imageUrlInput}
                                        onChange={(e) => {
                                            setImageUrlInput(e.target.value);
                                            if (imageUrlError) setImageUrlError("");
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddImageByUrl();
                                            }
                                        }}
                                        className="simple-url-input-field"
                                    />
                                    <button
                                        type="button"
                                        className="simple-url-add-btn"
                                        disabled={imageUrlLoading || !imageUrlInput.trim()}
                                        onClick={handleAddImageByUrl}
                                    >
                                        {imageUrlLoading ? (
                                            <>
                                                <Loader2 size={14} className="pd-spin" /> Verificando...
                                            </>
                                        ) : (
                                            "+ Agregar"
                                        )}
                                    </button>
                                </div>
                                {imageUrlError && (
                                    <div className="simple-url-error-msg">
                                        <AlertCircle size={14} />
                                        <span>{imageUrlError}</span>
                                    </div>
                                )}
                                <div className="simple-url-hint-text">
                                    La imagen será validada y visualizada de inmediato antes de guardarla.
                                </div>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/jpg"
                            multiple
                            style={{ display: "none" }}
                            onChange={(e) => {
                                handleFilesSelected(e.target.files);
                                e.target.value = "";
                            }}
                        />

                        {/* SECCIÓN IMÁGENES AÑADIDAS */}
                        <div className="simple-added-images-section">
                            <div className="simple-added-images-title">
                                Imágenes añadidas ({imagenes.length})
                            </div>

                            {imagenes.length === 0 ? (
                                <div className="simple-images-empty-box">
                                    <div className="simple-empty-preview-square">
                                        <ImageIcon size={26} />
                                    </div>
                                    <span>No hay imágenes aún</span>
                                </div>
                            ) : (
                                <div className="simple-images-grid">
                                    {imagenes.map((img, idx) => (
                                        <div
                                            key={idx}
                                            className={`simple-image-item ${img.principal ? "is-principal" : ""}`}
                                        >
                                            <img
                                                src={mediaUrl(img.imagen)}
                                                alt={`Producto ${idx + 1}`}
                                                onError={(e) => {
                                                    e.currentTarget.style.opacity = "0.3";
                                                }}
                                            />

                                            {img.principal && (
                                                <span className="simple-image-badge">
                                                    ★ Principal
                                                </span>
                                            )}

                                            <div className="simple-image-actions">
                                                {!img.principal && (
                                                    <button
                                                        type="button"
                                                        className="simple-img-action-btn"
                                                        title="Hacer foto principal"
                                                        onClick={(e) => handleSetPrincipal(idx, e)}
                                                    >
                                                        <Star size={13} />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="simple-img-action-btn delete-btn"
                                                    title="Eliminar imagen"
                                                    onClick={(e) => handleDeleteImage(idx, e)}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* =========================================================
                            TARJETA DE VIDEO DEMOSTRATIVO (OPCIONAL)
                           ========================================================= */}
                        <div className="simple-video-card">
                            <div className="simple-product-card-header" style={{ marginBottom: "16px" }}>
                                <div className="simple-product-card-icon" style={{ background: "#ede9fe", color: "#6a2ca0" }}>
                                    <Video size={22} />
                                </div>
                                <div className="simple-product-card-title-group">
                                    <h3>Video demostrativo (opcional)</h3>
                                    <p>Muestra tu producto en acción (máximo 1 video, hasta 60s y 15 MB).</p>
                                </div>
                            </div>

                            {video ? (
                                /* VISTA PREVIA DEL VIDEO CARGADO */
                                <div className="simple-video-preview-wrapper">
                                    <video
                                        src={mediaUrl(video.imagen)}
                                        controls
                                        preload="metadata"
                                        playsInline
                                        className="simple-video-player"
                                    />
                                    <div className="simple-video-meta-bar">
                                        <span className="simple-video-badge">
                                            <Play size={12} fill="currentColor" />
                                            Video {video.duration ? `(${video.duration}s)` : "MP4/WebM"}
                                        </span>
                                        <button
                                            type="button"
                                            className="simple-video-delete-btn"
                                            onClick={handleDeleteVideo}
                                        >
                                            <Trash2 size={13} />
                                            Eliminar video
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* OPCIONES PARA AGREGAR VIDEO */
                                <>
                                    <div className="simple-media-tabs">
                                        <button
                                            type="button"
                                            className={`simple-media-tab-btn ${videoInputTab === "file" ? "active" : ""}`}
                                            onClick={() => {
                                                setVideoInputTab("file");
                                                setVideoError("");
                                            }}
                                        >
                                            <UploadCloud size={14} />
                                            Subir archivo de video
                                        </button>
                                        <button
                                            type="button"
                                            className={`simple-media-tab-btn ${videoInputTab === "url" ? "active" : ""}`}
                                            onClick={() => {
                                                setVideoInputTab("url");
                                                setVideoError("");
                                            }}
                                        >
                                            <Globe size={14} />
                                            Pegar URL de video
                                        </button>
                                    </div>

                                    {videoInputTab === "file" ? (
                                        <div
                                            className={`simple-dropzone-box ${videoDragOver ? "drag-over" : ""}`}
                                            style={{ padding: "26px 16px" }}
                                            onClick={() => videoFileInputRef.current?.click()}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                setVideoDragOver(true);
                                            }}
                                            onDragLeave={() => setVideoDragOver(false)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setVideoDragOver(false);
                                                if (e.dataTransfer.files?.[0]) {
                                                    handleVideoFileSelected(e.dataTransfer.files[0]);
                                                }
                                            }}
                                        >
                                            <div className="simple-dropzone-icon" style={{ width: "42px", height: "42px" }}>
                                                <Film size={34} />
                                            </div>
                                            <h4>Arrastra tu video aquí o haz clic para subir</h4>
                                            <p style={{ marginBottom: "12px" }}>
                                                Formatos: MP4, WebM | Máx. 15 MB | Máx. 60 segundos
                                            </p>
                                            <button
                                                type="button"
                                                className="simple-add-photos-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    videoFileInputRef.current?.click();
                                                }}
                                            >
                                                + Seleccionar video
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="simple-url-input-container">
                                            <div className="simple-url-input-row">
                                                <div className="simple-input-left-icon">
                                                    <LinkIcon size={16} />
                                                </div>
                                                <input
                                                    type="url"
                                                    placeholder="Pega la URL directa del video (ej: https://.../video.mp4)"
                                                    value={videoUrlInput}
                                                    onChange={(e) => {
                                                        setVideoUrlInput(e.target.value);
                                                        if (videoError) setVideoError("");
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            handleAddVideoByUrl();
                                                        }
                                                    }}
                                                    className="simple-url-input-field"
                                                />
                                                <button
                                                    type="button"
                                                    className="simple-url-add-btn"
                                                    disabled={videoLoading || !videoUrlInput.trim()}
                                                    onClick={handleAddVideoByUrl}
                                                >
                                                    {videoLoading ? (
                                                        <>
                                                            <Loader2 size={14} className="pd-spin" /> Verificando...
                                                        </>
                                                    ) : (
                                                        "+ Agregar video"
                                                    )}
                                                </button>
                                            </div>
                                            <div className="simple-url-hint-text">
                                                Formatos admitidos: .mp4 y .webm. Duración máxima: 60 segundos.
                                            </div>
                                        </div>
                                    )}

                                    {videoError && (
                                        <div className="simple-url-error-msg" style={{ marginTop: "12px" }}>
                                            <AlertCircle size={15} />
                                            <span>{videoError}</span>
                                        </div>
                                    )}

                                    <input
                                        ref={videoFileInputRef}
                                        type="file"
                                        accept="video/mp4,video/webm"
                                        style={{ display: "none" }}
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                handleVideoFileSelected(e.target.files[0]);
                                            }
                                            e.target.value = "";
                                        }}
                                    />
                                </>
                            )}
                        </div>

                        {/* TARJETA DE CONSEJOS */}
                        <div className="simple-tips-card">
                            <div className="simple-tips-header">
                                <Info size={16} color="#6A2CA0" />
                                <h4>Consejos para tu contenido multimedia</h4>
                            </div>
                            <ul className="simple-tips-list">
                                <li>
                                    <Check size={14} />
                                    <span>Usa imágenes nítidas con buena iluminación (hasta {MAX_IMAGES} fotos).</span>
                                </li>
                                <li>
                                    <Check size={14} />
                                    <span>
                                        La imagen con estrella es la principal y se mostrará en los catálogos de venta.
                                    </span>
                                </li>
                                <li>
                                    <Check size={14} />
                                    <span>
                                        Puedes agregar 1 video corto (hasta 60 segundos y 15 MB) en formato MP4 o WebM para mostrar detalles.
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* ACCIONES INFERIORES - BOTÓN GUARDAR PRODUCTO A LA DERECHA */}
                <div className="simple-product-bottom-actions">
                    <button
                        type="submit"
                        className="simple-save-product-btn"
                        disabled={loading}
                    >
                        <Save size={18} />
                        {loading
                            ? "Guardando..."
                            : editing
                            ? "Guardar cambios"
                            : "Guardar producto"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default SimpleProductForm;
