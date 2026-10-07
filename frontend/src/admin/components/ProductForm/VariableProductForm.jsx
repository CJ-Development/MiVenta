import { useState, useEffect, useMemo, useRef } from "react";
import {
    ChevronLeft,
    Check,
    FileText,
    Package,
    Image as ImageIcon,
    Info,
    DollarSign,
    Link as LinkIcon,
    ChevronDown,
    Trash2,
    Plus,
    X,
    UploadCloud,
    Lightbulb,
    AlertCircle,
    Save,
    Sparkles,
    Video,
    Film,
    Play,
    Loader2,
    Globe,
} from "lucide-react";
import "./VariableProductForm.css";
import SimpleCategorySelect from "./SimpleCategorySelect";
import {
    saveProductComplete,
    getCategories,
    getColors,
    getTallas,
    getDesigns,
    createColor,
    createTalla,
    createDesign,
} from "../../../services/adminService";
import { ensureCsrf } from "../../../services/api";
import {
    validateImageUrl,
    validateVideoFile,
    validateVideoUrl,
    isVideoResource,
    MAX_IMAGES_VARIABLE,
    MAX_VIDEO_FILE_SIZE_MB,
    MAX_VIDEO_DURATION_SECONDS,
} from "../../../utils/mediaValidation";

const API_ORIGIN = "http://127.0.0.1:8000";
const MAX_VARIANT_IMAGES = MAX_IMAGES_VARIABLE || 8;

// Paleta de colores predefinidos sugeridos para selección rápida
const PRESET_COLORS = [
    { nombre: "Negro", hex: "#1E293B" },
    { nombre: "Blanco", hex: "#FFFFFF" },
    { nombre: "Rojo", hex: "#EF4444" },
    { nombre: "Azul", hex: "#3B82F6" },
    { nombre: "Verde", hex: "#10B981" },
    { nombre: "Gris", hex: "#6B7280" },
    { nombre: "Amarillo", hex: "#F59E0B" },
    { nombre: "Rosado", hex: "#EC4899" },
    { nombre: "Morado", hex: "#8B5CF6" },
    { nombre: "Café", hex: "#78350F" },
];

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Única"];

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

const buildAutoSku = (slug, colorName, sizeName, designName) => {
    const slugPart = (slug || "PROD")
        .toString()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8) || "PROD";
    const colPart = (colorName || "COL")
        .toString()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 3) || "COL";
    const sizePart = (sizeName || "STD")
        .toString()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 4) || "STD";
    const desPart = designName
        ? "-" + designName.toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3)
        : "";
    return `AUTO-${slugPart}-${colPart}-${sizePart}${desPart}`;
};

function VariableProductForm({
    product,
    onClose,
    onSaved,
    onSwitchToSimple,
}) {
    const editing = Boolean(product?.id_producto);

    // PASO ACTIVO: 1 = Información, 2 = Variantes, 3 = Imágenes
    const [step, setStep] = useState(1);

    // Catálogos desde backend
    const [categories, setCategories] = useState([]);
    const [dbColors, setDbColors] = useState([]);
    const [dbSizes, setDbSizes] = useState([]);
    const [dbDesigns, setDbDesigns] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [errors, setErrors] = useState({});

    // =====================================================
    // DATOS PASO 1 (Información general)
    // =====================================================
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
        stock_general: product?.stock_general ?? "",
        estado: product?.estado || "activo",
        slug: product?.slug || "",
        // Campo diseño general para el producto
        diseño_id:
            product?.diseño?.id_diseño ??
            product?.diseño_id ??
            product?.variantes?.[0]?.diseño?.id_diseño ??
            product?.variantes?.[0]?.diseño_id ??
            "",
    }));

    // =====================================================
    // ESTRUCTURA DE VARIANTES (Paso 2)
    // Inicialización: Si ya existen variantes en base de datos las cargamos,
    // pero si es un producto nuevo INICIA COMPLETAMENTE VACÍO (sin datos dummy).
    // =====================================================
    const [colorGroups, setColorGroups] = useState(() => {
        if (product?.variantes && product.variantes.length > 0) {
            const mapByColor = new Map();

            product.variantes.forEach((v) => {
                const colorObj = v.color || {};
                const colorId = colorObj.id_color ?? v.color_id ?? `temp-${Math.random()}`;
                const colorName = colorObj.nombre || v.color_nombre || "Variante";
                const colorHex = colorObj.codigo_hex || "#6A2CA0";
                const disId = v.diseño?.id_diseño ?? v.diseño_id ?? null;

                if (!mapByColor.has(colorId)) {
                    const groupImages = [];
                    let groupVideo = null;

                    (v.imagenes || []).forEach((img, idx) => {
                        const isVid = img.tipo === "video" || isVideoResource(img.imagen);
                        if (isVid && !groupVideo) {
                            groupVideo = {
                                id_imagen: img.id_imagen,
                                imagen: img.imagen,
                                tipo: "video",
                                principal: false,
                                orden: img.orden ?? idx + 1,
                            };
                        } else if (!isVid) {
                            groupImages.push({
                                id_imagen: img.id_imagen,
                                imagen: img.imagen,
                                tipo: "imagen",
                                principal: Boolean(img.principal || groupImages.length === 0),
                                orden: img.orden ?? groupImages.length + 1,
                            });
                        }
                    });

                    mapByColor.set(colorId, {
                        id_color: colorId,
                        nombre: colorName,
                        codigo_hex: colorHex,
                        diseño_id: disId,
                        sizes: [],
                        imagenes: groupImages,
                        video: groupVideo,
                    });
                }

                const group = mapByColor.get(colorId);
                const tallaObj = v.talla || {};
                group.sizes.push({
                    id_variante: v.id_variante || null,
                    id_talla: tallaObj.id_talla ?? v.talla_id ?? null,
                    nombre: tallaObj.nombre || v.talla_nombre || "S",
                    stock: v.stock ?? 0,
                    sku: v.sku || "",
                });
            });

            return Array.from(mapByColor.values());
        }

        // Producto nuevo: vacío por defecto
        return [];
    });

    // Color seleccionado en el Paso 3 (Imágenes)
    const [selectedVariantColorIndex, setSelectedVariantColorIndex] = useState(0);
    // Grupo de color activo actual en Paso 3
    const activeColorGroup = colorGroups[selectedVariantColorIndex] || colorGroups[0] || null;

    // Miniatura activa en la vista previa derecha
    const [featuredImageIndex, setFeaturedImageIndex] = useState(0);
    const [previewMediaType, setPreviewMediaType] = useState("image"); // "image" | "video"

    // Paso 3: Pestañas y estados para carga de imágenes
    const [imageInputTab, setImageInputTab] = useState("file"); // "file" | "url"
    const [imageUrlInput, setImageUrlInput] = useState("");
    const [imageUrlPreview, setImageUrlPreview] = useState(null);
    const [imageUrlError, setImageUrlError] = useState("");
    const [isValidatingImageUrl, setIsValidatingImageUrl] = useState(false);

    // Paso 3: Pestañas y estados para video por variante
    const [videoInputTab, setVideoInputTab] = useState("file"); // "file" | "url"
    const [videoUrlInput, setVideoUrlInput] = useState("");
    const [videoError, setVideoError] = useState("");
    const [isValidatingVideo, setIsValidatingVideo] = useState(false);
    const videoFileInputRef = useRef(null);

    // Modal para agregar Color
    const [colorModalOpen, setColorModalOpen] = useState(false);
    const [newColorData, setNewColorData] = useState({
        nombre: "",
        codigo_hex: "#EF4444",
    });

    // Modal para agregar Diseño
    const [designModalOpen, setDesignModalOpen] = useState(false);
    const [newDesignName, setNewDesignName] = useState("");

    const fileInputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    // Cargar catálogos desde el servidor
    useEffect(() => {
        Promise.all([
            getCategories().catch(() => ({ data: [] })),
            getColors().catch(() => ({ data: [] })),
            getTallas().catch(() => ({ data: [] })),
            getDesigns().catch(() => ({ data: [] })),
        ]).then(([catRes, colRes, sizeRes, desRes]) => {
            const cats = catRes.data || [];
            const cols = colRes.data || [];
            const sizes = sizeRes.data || [];
            const designs = desRes.data || [];

            setCategories(cats);
            setDbColors(cols);
            setDbSizes(sizes);
            setDbDesigns(designs);
        });
    }, []);

    // Manejar cambios en campos de texto Paso 1
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

    // =====================================================
    // ACCIONES EN PASO 2: VARIANTES
    // =====================================================

    // Agregar un nuevo color (desde preset o personalizado)
    const handleAddColor = async (colorName, hex) => {
        const nameClean = colorName.trim();
        if (!nameClean) return;

        // Comprobar si ya existe en la lista del producto
        if (colorGroups.some((g) => g.nombre.toLowerCase() === nameClean.toLowerCase())) {
            alert(`El color "${nameClean}" ya está agregado.`);
            return;
        }

        // Buscar en dbColors o registrar si es nuevo
        let colorId = null;
        const found = dbColors.find(
            (c) => c.nombre.toLowerCase() === nameClean.toLowerCase()
        );

        if (found) {
            colorId = found.id_color;
        } else {
            try {
                const res = await createColor({
                    nombre: nameClean,
                    codigo_hex: hex || "#6A2CA0",
                });
                if (res.data) {
                    colorId = res.data.id_color;
                    setDbColors((prev) => [...prev, res.data]);
                }
            } catch (err) {
                console.warn("No se pudo registrar color en BD:", err);
            }
        }

        const newGroup = {
            id_color: colorId || `col-${Date.now()}`,
            nombre: nameClean,
            codigo_hex: hex || "#6A2CA0",
            diseño_id: datos.diseño_id || null,
            sizes: [
                { id_talla: null, nombre: "S", stock: 0, sku: "" },
                { id_talla: null, nombre: "M", stock: 0, sku: "" },
                { id_talla: null, nombre: "L", stock: 0, sku: "" },
            ],
            imagenes: [],
            video: null,
        };

        setColorGroups((prev) => [...prev, newGroup]);
        setColorModalOpen(false);
        setNewColorData({ nombre: "", codigo_hex: "#EF4444" });
    };

    const handleRemoveColor = (colorIndex, e) => {
        if (e) e.stopPropagation();
        setColorGroups((prev) => prev.filter((_, idx) => idx !== colorIndex));
        if (selectedVariantColorIndex >= colorGroups.length - 1) {
            setSelectedVariantColorIndex(Math.max(0, colorGroups.length - 2));
        }
    };

    const handleStockChange = (colorIndex, sizeIndex, val) => {
        const stockNum = Math.max(0, Number(val) || 0);
        setColorGroups((prev) => {
            const next = [...prev];
            const group = { ...next[colorIndex] };
            const sizes = [...group.sizes];
            sizes[sizeIndex] = { ...sizes[sizeIndex], stock: stockNum };
            group.sizes = sizes;
            next[colorIndex] = group;
            return next;
        });
    };

    const handleSizeSelectChange = (colorIndex, sizeIndex, newSizeName) => {
        const found = dbSizes.find(
            (s) => s.nombre.toUpperCase() === newSizeName.toUpperCase()
        );
        setColorGroups((prev) => {
            const next = [...prev];
            const group = { ...next[colorIndex] };
            const sizes = [...group.sizes];
            sizes[sizeIndex] = {
                ...sizes[sizeIndex],
                nombre: newSizeName,
                id_talla: found ? found.id_talla : null,
            };
            group.sizes = sizes;
            next[colorIndex] = group;
            return next;
        });
    };

    // Agregar un par de talla y stock a una fila de color
    const handleAddSizeToColor = (colorIndex) => {
        setColorGroups((prev) => {
            const next = [...prev];
            const group = { ...next[colorIndex] };
            group.sizes = [
                ...group.sizes,
                { id_talla: null, nombre: "XL", stock: 0, sku: "" },
            ];
            next[colorIndex] = group;
            return next;
        });
    };

    // Quitar un par de talla y stock de una fila de color
    const handleRemoveSizeFromColor = (colorIndex, sizeIndex) => {
        setColorGroups((prev) => {
            const next = [...prev];
            const group = { ...next[colorIndex] };
            if (group.sizes.length <= 1) {
                alert("Cada color debe tener al menos una talla configurada.");
                return prev;
            }
            group.sizes = group.sizes.filter((_, idx) => idx !== sizeIndex);
            next[colorIndex] = group;
            return next;
        });
    };

    // Cambiar el diseño asignado a una fila de color
    const handleGroupDesignChange = (colorIndex, designId) => {
        setColorGroups((prev) => {
            const next = [...prev];
            const group = { ...next[colorIndex] };
            group.diseño_id = designId ? Number(designId) : null;
            next[colorIndex] = group;
            return next;
        });
    };

    // Crear un nuevo diseño en base de datos
    const handleCreateDesignSubmit = async (e) => {
        e.preventDefault();
        const dName = newDesignName.trim();
        if (!dName) return;

        try {
            await ensureCsrf();
            const res = await createDesign({ nombre: dName });
            if (res.data) {
                setDbDesigns((prev) => [...prev, res.data]);
                // Si estábamos en paso 1, asignarlo
                if (step === 1) {
                    setDatos((prev) => ({ ...prev, diseño_id: res.data.id_diseño }));
                }
            }
            setNewDesignName("");
            setDesignModalOpen(false);
        } catch (err) {
            console.error("Error al crear diseño:", err);
            alert("No fue posible crear el diseño. Verifica que no exista ya.");
        }
    };

    // =====================================================
    // ACCIONES EN PASO 3: IMÁGENES Y VIDEOS POR VARIANTE
    // =====================================================
    const handleFilesSelected = (files) => {
        if (!files || !files.length || !activeColorGroup) return;

        const currentImages = activeColorGroup.imagenes || [];
        const remainingSlots = MAX_VARIANT_IMAGES - currentImages.length;
        if (remainingSlots <= 0) {
            alert(`Solo puedes agregar hasta ${MAX_VARIANT_IMAGES} imágenes por variante.`);
            return;
        }

        const filesToProcess = Array.from(files).slice(0, remainingSlots);
        const newImages = filesToProcess.map((file, idx) => ({
            id_imagen: null,
            file,
            imagen: URL.createObjectURL(file),
            tipo: "imagen",
            principal: currentImages.length === 0 && idx === 0,
            orden: currentImages.length + idx + 1,
        }));

        setColorGroups((prev) => {
            const next = [...prev];
            const group = { ...next[selectedVariantColorIndex] };
            group.imagenes = [...(group.imagenes || []), ...newImages];
            next[selectedVariantColorIndex] = group;
            return next;
        });

        setPreviewMediaType("image");
        setFeaturedImageIndex(0);
    };

    const handleImageUrlInputChange = (val) => {
        setImageUrlInput(val);
        setImageUrlError("");
        if (val.trim().startsWith("http://") || val.trim().startsWith("https://")) {
            setImageUrlPreview(val.trim());
        } else {
            setImageUrlPreview(null);
        }
    };

    const handleAddImageByUrl = async () => {
        const url = imageUrlInput.trim();
        if (!url) return;

        const currentImages = activeColorGroup?.imagenes || [];
        if (currentImages.length >= MAX_VARIANT_IMAGES) {
            setImageUrlError(`Solo puedes agregar hasta ${MAX_VARIANT_IMAGES} imágenes por variante.`);
            return;
        }

        setIsValidatingImageUrl(true);
        setImageUrlError("");
        const res = await validateImageUrl(url);
        setIsValidatingImageUrl(false);

        if (!res.valid) {
            setImageUrlError(res.error || "La URL no es una imagen válida o no está accesible.");
            return;
        }

        setColorGroups((prev) => {
            const next = [...prev];
            const group = { ...next[selectedVariantColorIndex] };
            const imgs = [...(group.imagenes || [])];
            imgs.push({
                id_imagen: null,
                imagen: url,
                tipo: "imagen",
                principal: imgs.length === 0,
                orden: imgs.length + 1,
            });
            group.imagenes = imgs;
            next[selectedVariantColorIndex] = group;
            return next;
        });

        setImageUrlInput("");
        setImageUrlPreview(null);
        setPreviewMediaType("image");
        setFeaturedImageIndex(currentImages.length);
    };

    const handleSetPrincipalImage = (imageIndex, e) => {
        if (e) e.stopPropagation();
        setColorGroups((prev) => {
            const next = [...prev];
            const group = { ...next[selectedVariantColorIndex] };
            group.imagenes = (group.imagenes || []).map((img, idx) => ({
                ...img,
                principal: idx === imageIndex,
            }));
            next[selectedVariantColorIndex] = group;
            return next;
        });
        setPreviewMediaType("image");
        setFeaturedImageIndex(imageIndex);
    };

    const handleDeleteVariantImage = (imageIndex, e) => {
        if (e) e.stopPropagation();
        setColorGroups((prev) => {
            const next = [...prev];
            const group = { ...next[selectedVariantColorIndex] };
            const filtered = (group.imagenes || []).filter((_, idx) => idx !== imageIndex);
            if (filtered.length > 0 && !filtered.some((img) => img.principal)) {
                filtered[0].principal = true;
            }
            group.imagenes = filtered.map((img, idx) => ({ ...img, orden: idx + 1 }));
            next[selectedVariantColorIndex] = group;
            return next;
        });

        if (featuredImageIndex >= (activeColorGroup?.imagenes?.length || 1) - 1) {
            setFeaturedImageIndex(0);
        }
    };

    // Subir video por archivo para la variante
    const handleVideoFileSelected = async (file) => {
        if (!file) return;
        if (activeColorGroup?.video) {
            setVideoError("Esta variante ya tiene un video. Elimina el actual antes de subir uno nuevo.");
            return;
        }

        setIsValidatingVideo(true);
        setVideoError("");
        const res = await validateVideoFile(file);
        setIsValidatingVideo(false);

        if (!res.valid) {
            setVideoError(res.error);
            return;
        }

        setColorGroups((prev) => {
            const next = [...prev];
            const group = { ...next[selectedVariantColorIndex] };
            group.video = {
                id_imagen: null,
                file,
                imagen: URL.createObjectURL(file),
                tipo: "video",
            };
            next[selectedVariantColorIndex] = group;
            return next;
        });

        setPreviewMediaType("video");
    };

    // Agregar video por URL para la variante
    const handleAddVideoByUrl = async () => {
        const url = videoUrlInput.trim();
        if (!url) return;

        if (activeColorGroup?.video) {
            setVideoError("Esta variante ya tiene un video. Elimina el actual antes de agregar uno nuevo.");
            return;
        }

        setIsValidatingVideo(true);
        setVideoError("");
        const res = await validateVideoUrl(url);
        setIsValidatingVideo(false);

        if (!res.valid) {
            setVideoError(res.error);
            return;
        }

        setColorGroups((prev) => {
            const next = [...prev];
            const group = { ...next[selectedVariantColorIndex] };
            group.video = {
                id_imagen: null,
                imagen: url,
                tipo: "video",
            };
            next[selectedVariantColorIndex] = group;
            return next;
        });

        setVideoUrlInput("");
        setPreviewMediaType("video");
    };

    // Eliminar video de la variante
    const handleDeleteVariantVideo = (e) => {
        if (e) e.stopPropagation();
        setColorGroups((prev) => {
            const next = [...prev];
            const group = { ...next[selectedVariantColorIndex] };
            group.video = null;
            next[selectedVariantColorIndex] = group;
            return next;
        });
        setPreviewMediaType("image");
        setVideoError("");
    };

    // =====================================================
    // VALIDACIÓN POR PASOS
    // =====================================================
    const validateStep1 = () => {
        const next = {};
        if (!datos.nombre.trim()) next.nombre = "El nombre es obligatorio.";
        if (!datos.categoria_id && (!datos.categorias_ids || datos.categorias_ids.length === 0)) {
            next.categoria_id = "Selecciona una categoría.";
        }
        if (datos.precio === "" || Number(datos.precio) <= 0) {
            next.precio = "Ingresa un precio mayor a 0.";
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const validateStep2 = () => {
        if (colorGroups.length === 0) {
            setError("Debes agregar al menos un color con sus tallas y stock.");
            return false;
        }
        setError("");
        return true;
    };

    const handleNext = () => {
        if (step === 1) {
            if (!validateStep1()) return;
            setStep(2);
        } else if (step === 2) {
            if (!validateStep2()) return;
            setStep(3);
        }
    };

    const handlePrev = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    // =====================================================
    // ENVÍO FINAL AL BACKEND
    // =====================================================
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError("");

        if (!validateStep1()) {
            setStep(1);
            return;
        }
        if (!validateStep2()) {
            setStep(2);
            return;
        }

        await ensureCsrf();
        setLoading(true);

        try {
            const formData = new FormData();
            const variantsPayload = [];

            // 1. Asegurar que las tallas y colores existan con ID real en BD
            for (const group of colorGroups) {
                let realColorId = typeof group.id_color === "number" ? group.id_color : null;
                if (!realColorId) {
                    const matchCol = dbColors.find(
                        (c) => c.nombre.toLowerCase() === group.nombre.toLowerCase()
                    );
                    if (matchCol) {
                        realColorId = matchCol.id_color;
                    } else {
                        try {
                            const created = await createColor({
                                nombre: group.nombre,
                                codigo_hex: group.codigo_hex || "#6A2CA0",
                            });
                            realColorId = created.data?.id_color;
                        } catch (cErr) {
                            console.warn("Color create fallback:", cErr);
                        }
                    }
                }

                const finalDesignId =
                    group.diseño_id ||
                    (datos.diseño_id ? Number(datos.diseño_id) : null);

                const groupImages = group.imagenes || [];

                for (const sizeItem of group.sizes) {
                    const variantIndex = variantsPayload.length;

                    // Asegurar ID de talla
                    let realTallaId = typeof sizeItem.id_talla === "number" ? sizeItem.id_talla : null;
                    if (!realTallaId && sizeItem.nombre) {
                        const matchSize = dbSizes.find(
                            (s) => s.nombre.toUpperCase() === sizeItem.nombre.toUpperCase()
                        );
                        if (matchSize) {
                            realTallaId = matchSize.id_talla;
                        } else {
                            try {
                                const createdS = await createTalla({ nombre: sizeItem.nombre.toUpperCase() });
                                realTallaId = createdS.data?.id_talla;
                            } catch (sErr) {
                                console.warn("Talla create fallback:", sErr);
                            }
                        }
                    }

                    // Procesar fotos de esta variante
                    const processedImages = groupImages.map((img, imgIdx) => {
                        if (img.file) {
                            const fileKey = `variant_${variantIndex}_image_${imgIdx}`;
                            formData.append(fileKey, img.file, img.file.name);
                            return {
                                principal: Boolean(img.principal || imgIdx === 0),
                                orden: imgIdx + 1,
                                file_key: fileKey,
                                tipo: "imagen",
                            };
                        }
                        return {
                            ...(img.id_imagen ? { id_imagen: img.id_imagen } : {}),
                            imagen: img.imagen,
                            principal: Boolean(img.principal || imgIdx === 0),
                            orden: imgIdx + 1,
                            tipo: "imagen",
                        };
                    });

                    // Si hay un video para este grupo/color, agregarlo
                    if (group.video) {
                        if (group.video.file) {
                            const videoKey = `variant_${variantIndex}_video`;
                            formData.append(videoKey, group.video.file, group.video.file.name);
                            processedImages.push({
                                principal: false,
                                orden: processedImages.length + 1,
                                file_key: videoKey,
                                tipo: "video",
                            });
                        } else if (group.video.imagen) {
                            processedImages.push({
                                ...(group.video.id_imagen ? { id_imagen: group.video.id_imagen } : {}),
                                imagen: group.video.imagen,
                                principal: false,
                                orden: processedImages.length + 1,
                                tipo: "video",
                            });
                        }
                    }

                    const designName = dbDesigns.find((d) => d.id_diseño === finalDesignId)?.nombre;
                    const sku =
                        sizeItem.sku ||
                        buildAutoSku(
                            datos.slug || slugify(datos.nombre),
                            group.nombre,
                            sizeItem.nombre,
                            designName
                        );

                    variantsPayload.push({
                        ...(sizeItem.id_variante
                            ? { id_variante: sizeItem.id_variante }
                            : {}),
                        color_id: realColorId,
                        diseño_id: finalDesignId,
                        talla_id: realTallaId,
                        sku: sku,
                        stock: Number(sizeItem.stock) || 0,
                        imagenes: processedImages,
                    });
                }
            }

            const payload = {
                producto: {
                    ...(editing ? { id_producto: product.id_producto } : {}),
                    nombre: datos.nombre.trim(),
                    categoria_id:
                        Number(datos.categoria_id) ||
                        (datos.categorias_ids?.[0] ? Number(datos.categorias_ids[0]) : null),
                    descripcion: datos.descripcion,
                    precio: Number(datos.precio),
                    estado: datos.estado,
                    slug: datos.slug || slugify(datos.nombre),
                },
                producto_simple: false,
                variantes: variantsPayload,
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
            console.error("Error al guardar producto con variantes:", err);
            const backend = err.response?.data;
            const backendErrors = backend?.errors || backend;
            if (backendErrors?.detail) {
                setError(backendErrors.detail);
            } else if (typeof backend === "string") {
                setError(backend);
            } else {
                setError("Ocurrió un error al guardar el producto con variantes.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Cálculos para la columna derecha de Resumen
    const totalVariantesCount = colorGroups.reduce((acc, g) => acc + g.sizes.length, 0);
    const colorNamesString = colorGroups.map((g) => g.nombre).join(", ");

    return (
        <div className="var-product-container">
            {/* ENCABEZADO SUPERIOR */}
            <header className="var-product-top-bar">
                <button
                    type="button"
                    className="var-product-back-btn"
                    onClick={onClose}
                >
                    <ChevronLeft size={16} />
                    Volver a productos
                </button>

                <div className="var-product-header-center">
                    <h1>{editing ? "Editar producto" : "Nuevo producto"}</h1>
                    <p>Completa la información para publicar un nuevo producto en tu catálogo.</p>
                </div>
            </header>

            {/* STEPPER DE 3 PASOS */}
            <nav className="var-stepper-container" aria-label="Progreso del formulario">
                {/* PASO 1 */}
                <button
                    type="button"
                    className={`var-step-item ${step === 1 ? "is-active" : step > 1 ? "is-completed" : "is-pending"}`}
                    onClick={() => setStep(1)}
                >
                    <div className="var-step-circle">
                        {step > 1 ? <Check size={16} /> : "1"}
                    </div>
                    <div className="var-step-labels">
                        <strong>Información</strong>
                        <small>Datos generales</small>
                    </div>
                </button>

                <div className={`var-step-divider ${step >= 2 ? "is-active" : ""}`} />

                {/* PASO 2 */}
                <button
                    type="button"
                    className={`var-step-item ${step === 2 ? "is-active" : step > 2 ? "is-completed" : "is-pending"}`}
                    onClick={() => {
                        if (validateStep1()) setStep(2);
                    }}
                >
                    <div className="var-step-circle">
                        {step > 2 ? <Check size={16} /> : "2"}
                    </div>
                    <div className="var-step-labels">
                        <strong>Variantes</strong>
                        <small>Atributos y stock</small>
                    </div>
                </button>

                <div className={`var-step-divider ${step >= 3 ? "is-active" : ""}`} />

                {/* PASO 3 */}
                <button
                    type="button"
                    className={`var-step-item ${step === 3 ? "is-active" : "is-pending"}`}
                    onClick={() => {
                        if (validateStep1() && validateStep2()) setStep(3);
                    }}
                >
                    <div className="var-step-circle">3</div>
                    <div className="var-step-labels">
                        <strong>Imágenes</strong>
                        <small>Fotografías del producto</small>
                    </div>
                </button>
            </nav>

            {error && (
                <div className="var-error-banner">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* =========================================================
               PASO 1: INFORMACIÓN GENERAL (Imagen 2)
               ========================================================= */}
            {step === 1 && (
                <div className="var-card">
                    <div className="var-card-header">
                        <div className="var-card-icon-sq">
                            <FileText size={22} />
                        </div>
                        <div className="var-card-title-group">
                            <h3>Información del producto</h3>
                            <p>Completa los datos generales del producto.</p>
                        </div>
                    </div>

                    {/* NOMBRE */}
                    <div className="var-form-field">
                        <label>
                            Nombre del producto <span className="required-star">*</span>
                        </label>
                        <div className="var-input-wrapper">
                            <input
                                type="text"
                                name="nombre"
                                value={datos.nombre}
                                onChange={handleDataChange}
                                placeholder="Ej. Zapatillas deportivas"
                                className={`var-text-input ${errors.nombre ? "input-has-error" : ""}`}
                                style={{ paddingLeft: "14px" }}
                            />
                        </div>
                        {errors.nombre && (
                            <span className="var-field-error">{errors.nombre}</span>
                        )}
                    </div>

                    {/* CATEGORÍA CON SELECTOR ESPACIOSO */}
                    <div className="var-form-field">
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
                            <span className="var-field-error">{errors.categoria_id}</span>
                        )}
                    </div>

                    {/* FILA 2 COLUMNAS: PRECIO Y STOCK */}
                    <div className="var-form-row-2col">
                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
                                Precio ($) <span className="required-star">*</span>
                            </label>
                            <div className="var-input-wrapper">
                                <div className="var-input-icon">
                                    <DollarSign size={18} />
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    name="precio"
                                    value={datos.precio}
                                    onChange={handleDataChange}
                                    placeholder="0.00"
                                    className={`var-text-input ${errors.precio ? "input-has-error" : ""}`}
                                />
                            </div>
                            {errors.precio && (
                                <span className="var-field-error">{errors.precio}</span>
                            )}
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
                                Stock disponible <span className="required-star">*</span>
                            </label>
                            <div className="var-input-wrapper">
                                <div className="var-input-icon">
                                    <Package size={18} />
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    name="stock_general"
                                    value={datos.stock_general}
                                    onChange={handleDataChange}
                                    placeholder="0"
                                    className="var-text-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ESTADO CON INDICADOR VERDE */}
                    <div className="var-form-field">
                        <label>
                            Estado <span className="required-star">*</span>
                        </label>
                        <div className="var-select-status-wrapper">
                            <span className={`var-status-dot ${datos.estado}`} />
                            <select
                                name="estado"
                                value={datos.estado}
                                onChange={handleDataChange}
                                className="var-select-status"
                            >
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                                <option value="archivado">Archivado</option>
                            </select>
                            <div className="var-select-chevron">
                                <ChevronDown size={18} />
                            </div>
                        </div>
                    </div>

                    {/* CAMPO DE DISEÑO GENERAL (OPCIONAL) */}
                    <div className="var-form-field">
                        <label>Diseño o Modelo (opcional)</label>
                        <div className="var-diseno-field-container">
                            <div className="var-diseno-select-wrapper">
                                <div className="var-input-icon">
                                    <Sparkles size={18} />
                                </div>
                                <select
                                    name="diseño_id"
                                    value={datos.diseño_id}
                                    onChange={handleDataChange}
                                    className="var-diseno-select"
                                >
                                    <option value="">Sin diseño específico (estándar)</option>
                                    {dbDesigns.map((d) => (
                                        <option key={d.id_diseño} value={d.id_diseño}>
                                            {d.nombre}
                                        </option>
                                    ))}
                                </select>
                                <div className="var-select-chevron">
                                    <ChevronDown size={18} />
                                </div>
                            </div>

                            <button
                                type="button"
                                className="var-quick-add-btn"
                                onClick={() => setDesignModalOpen(true)}
                                title="Crear un nuevo diseño"
                            >
                                <Plus size={15} />
                                Nuevo diseño
                            </button>
                        </div>
                    </div>

                    {/* DESCRIPCIÓN CON CONTADOR */}
                    <div className="var-form-field">
                        <label>
                            Descripción del producto <span className="required-star">*</span>
                        </label>
                        <div className="var-textarea-wrapper">
                            <textarea
                                name="descripcion"
                                rows="4"
                                maxLength={2000}
                                value={datos.descripcion}
                                onChange={handleDataChange}
                                placeholder="Describe las características, materiales, dimensiones, etc..."
                                className="var-textarea"
                            />
                            <span className="var-textarea-counter">
                                {(datos.descripcion || "").length}/2000
                            </span>
                        </div>
                    </div>

                    {/* SLUG */}
                    <div className="var-form-field">
                        <label>Slug (opcional)</label>
                        <div className="var-input-wrapper">
                            <div className="var-input-icon">
                                <LinkIcon size={18} />
                            </div>
                            <input
                                type="text"
                                name="slug"
                                value={datos.slug}
                                onChange={handleDataChange}
                                placeholder="ej. zapatillas-deportivas"
                                className="var-text-input"
                                style={{ paddingRight: "180px" }}
                            />
                            <span className="var-slug-hint">Se generará automáticamente</span>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================
               PASO 2: VARIANTES (ATRIBUTOS Y STOCK) (Imagen 3)
               ========================================================= */}
            {step === 2 && (
                <div className="var-step-layout-2col">
                    {/* COLUMNA IZQUIERDA: CONFIGURACIÓN DE VARIANTES */}
                    <div className="var-card">
                        <div className="var-card-header">
                            <div className="var-card-icon-sq">
                                <Package size={22} />
                            </div>
                            <div className="var-card-title-group">
                                <h3>Variantes del producto</h3>
                                <p>
                                    Configura las combinaciones disponibles para el producto. Puedes
                                    agregar colores, diseños, tallas y stock.
                                </p>
                            </div>
                        </div>

                        {/* SECCIÓN 1: COLORES */}
                        <div className="var-step-section-heading">
                            <span className="var-step-badge-num">1</span>
                            <h4 className="var-step-section-title">Colores</h4>
                        </div>
                        <p className="var-step-section-subtitle">
                            Selecciona los colores disponibles para tu producto.
                        </p>

                        {/* LISTA DE CHIPS O ESTADO VACÍO */}
                        {colorGroups.length === 0 ? (
                            <div className="var-empty-state-card">
                                <p>No has agregado colores aún para este producto.</p>
                                <button
                                    type="button"
                                    className="var-add-color-btn"
                                    onClick={() => setColorModalOpen(true)}
                                >
                                    <Plus size={15} />
                                    Agregar color
                                </button>
                            </div>
                        ) : (
                            <div className="var-colors-chips-row">
                                {colorGroups.map((colorGroup, idx) => (
                                    <div
                                        key={idx}
                                        className={`var-color-chip ${selectedVariantColorIndex === idx ? "is-active" : ""}`}
                                        onClick={() => setSelectedVariantColorIndex(idx)}
                                    >
                                        <span
                                            className="var-color-chip-circle"
                                            style={{ backgroundColor: colorGroup.codigo_hex }}
                                        />
                                        <span>{colorGroup.nombre}</span>
                                        <button
                                            type="button"
                                            className="var-color-chip-remove"
                                            onClick={(e) => handleRemoveColor(idx, e)}
                                            title="Eliminar color"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    className="var-add-color-btn"
                                    onClick={() => setColorModalOpen(true)}
                                >
                                    <Plus size={15} />
                                    Agregar color
                                </button>
                            </div>
                        )}

                        {/* SECCIÓN 2: TALLAS Y STOCK */}
                        <div className="var-step-section-heading">
                            <span className="var-step-badge-num">2</span>
                            <h4 className="var-step-section-title">Tallas y stock</h4>
                        </div>
                        <p className="var-step-section-subtitle">
                            Para cada color, define las tallas disponibles y la cantidad en inventario.
                        </p>

                        {colorGroups.length === 0 ? (
                            <div className="var-empty-state-card" style={{ marginBottom: 0 }}>
                                <p>Agrega al menos un color arriba para configurar sus tallas y stock.</p>
                            </div>
                        ) : (
                            <div className="var-color-variant-rows">
                                {colorGroups.map((group, cIdx) => (
                                    <div
                                        key={cIdx}
                                        className="var-color-row-card"
                                        style={{ borderLeftColor: group.codigo_hex }}
                                    >
                                        {/* CABECERA DE LA FILA: COLOR + DISEÑO OPCIONAL + ELIMINAR */}
                                        <div className="var-color-row-top">
                                            <div className="var-color-row-label">
                                                <span
                                                    className="var-color-chip-circle"
                                                    style={{ backgroundColor: group.codigo_hex }}
                                                />
                                                <span>{group.nombre}</span>
                                            </div>

                                            {/* SELECTOR DE DISEÑO OPCIONAL POR FILA */}
                                            <div className="var-row-diseno-box">
                                                <Sparkles size={14} color="#6a2ca0" />
                                                <span>Diseño:</span>
                                                <select
                                                    className="var-row-diseno-select"
                                                    value={group.diseño_id || ""}
                                                    onChange={(e) =>
                                                        handleGroupDesignChange(cIdx, e.target.value)
                                                    }
                                                >
                                                    <option value="">
                                                        {datos.diseño_id
                                                            ? "Predeterminado del producto"
                                                            : "Sin diseño"}
                                                    </option>
                                                    {dbDesigns.map((d) => (
                                                        <option key={d.id_diseño} value={d.id_diseño}>
                                                            {d.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* BOTÓN ELIMINAR FILA DE COLOR */}
                                            <button
                                                type="button"
                                                className="var-delete-color-row-btn"
                                                title="Eliminar este color y sus tallas"
                                                onClick={() => handleRemoveColor(cIdx)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {/* PARES DE TALLA Y STOCK */}
                                        <div className="var-color-row-sizes-grid">
                                            {group.sizes.map((sizeItem, sIdx) => (
                                                <div key={sIdx} className="var-size-stock-pair">
                                                    <span className="var-size-label-tag">Talla</span>
                                                    <select
                                                        className="var-size-select"
                                                        value={sizeItem.nombre}
                                                        onChange={(e) =>
                                                            handleSizeSelectChange(cIdx, sIdx, e.target.value)
                                                        }
                                                    >
                                                        {dbSizes.length > 0 ? (
                                                            dbSizes.map((ds) => (
                                                                <option key={ds.id_talla} value={ds.nombre}>
                                                                    {ds.nombre}
                                                                </option>
                                                            ))
                                                        ) : (
                                                            STANDARD_SIZES.map((sz) => (
                                                                <option key={sz} value={sz}>
                                                                    {sz}
                                                                </option>
                                                            ))
                                                        )}
                                                    </select>

                                                    <span className="var-size-label-tag">Stock</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="var-stock-input"
                                                        value={sizeItem.stock}
                                                        onChange={(e) =>
                                                            handleStockChange(cIdx, sIdx, e.target.value)
                                                        }
                                                    />

                                                    {group.sizes.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="var-size-pair-remove-btn"
                                                            title="Quitar talla"
                                                            onClick={() =>
                                                                handleRemoveSizeFromColor(cIdx, sIdx)
                                                            }
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            {/* BOTÓN PARA AGREGAR OTRA TALLA A ESTE COLOR */}
                                            <button
                                                type="button"
                                                className="var-add-size-pair-btn"
                                                onClick={() => handleAddSizeToColor(cIdx)}
                                                title="Agregar otra talla a este color"
                                            >
                                                <Plus size={13} />
                                                Talla
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* BOTÓN AGREGAR VARIANTE DE COLOR */}
                                <button
                                    type="button"
                                    className="var-add-variant-row-btn"
                                    onClick={() => setColorModalOpen(true)}
                                >
                                    <Plus size={16} />
                                    Agregar variante de color
                                </button>
                            </div>
                        )}
                    </div>

                    {/* COLUMNA DERECHA: RESUMEN Y RECOMENDACIONES */}
                    <div>
                        {/* RESUMEN DE VARIANTES */}
                        <div className="var-summary-card">
                            <div className="var-summary-header">
                                <FileText size={18} color="#6a2ca0" />
                                <div>
                                    <h4>Resumen de variantes</h4>
                                    <p>Vista previa de las combinaciones generadas.</p>
                                </div>
                            </div>

                            {colorGroups.length === 0 ? (
                                <p style={{ fontSize: "12.5px", color: "#94a3b8", textAlign: "center", margin: "16px 0" }}>
                                    Aún no has agregado variantes. Configura colores y tallas para ver el resumen.
                                </p>
                            ) : (
                                <div className="var-summary-list">
                                    {colorGroups.map((g, idx) => {
                                        const sizeNames = g.sizes.map((s) => s.nombre).join(", ");
                                        const totalStock = g.sizes.reduce(
                                            (acc, s) => acc + (Number(s.stock) || 0),
                                            0
                                        );
                                        const desObj = dbDesigns.find(
                                            (d) => d.id_diseño === (g.diseño_id || Number(datos.diseño_id))
                                        );

                                        return (
                                            <div
                                                key={idx}
                                                className="var-summary-item"
                                                onClick={() => setSelectedVariantColorIndex(idx)}
                                            >
                                                <div className="var-summary-left">
                                                    <span
                                                        className="var-color-chip-circle"
                                                        style={{
                                                            backgroundColor: g.codigo_hex,
                                                            marginTop: "4px",
                                                        }}
                                                    />
                                                    <div>
                                                        <div className="var-summary-title">
                                                            {g.nombre}
                                                            {desObj && (
                                                                <span style={{ fontSize: "11px", color: "#6a2ca0", fontWeight: 500, marginLeft: "6px" }}>
                                                                    ({desObj.nombre})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="var-summary-detail">
                                                            Tallas: {sizeNames || "Sin tallas"}
                                                        </div>
                                                        <div className="var-summary-detail">
                                                            Stock total: {totalStock}
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronLeft
                                                    size={16}
                                                    color="#94a3b8"
                                                    style={{ transform: "rotate(180deg)" }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* INFORMACIÓN IMPORTANTE */}
                        <div className="var-info-tips-card">
                            <div className="var-info-tips-header">
                                <Info size={16} />
                                <span>Información importante</span>
                            </div>
                            <ul className="var-info-tips-list">
                                <li>
                                    <Check size={14} />
                                    <span>El stock se actualiza por talla, color y diseño.</span>
                                </li>
                                <li>
                                    <Check size={14} />
                                    <span>Puedes modificar las variantes en cualquier momento.</span>
                                </li>
                                <li>
                                    <Check size={14} />
                                    <span>
                                        Si no hay variantes, el producto se registrará como un solo
                                        artículo.
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* TOTAL DE VARIANTES */}
                        <div className="var-total-badge-card">
                            <div className="var-card-icon-sq" style={{ width: "36px", height: "36px" }}>
                                <Package size={18} />
                            </div>
                            <div>
                                <strong>Total de combinaciones: {totalVariantesCount}</strong>
                                <small>{colorNamesString ? `(${colorNamesString})` : "Sin colores"}</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================
               PASO 3: IMÁGENES DEL PRODUCTO (Imagen 1)
               ========================================================= */}
            {step === 3 && (
                <div className="var-step-layout-2col">
                    {/* COLUMNA IZQUIERDA: DROPZONE Y FOTOS DE LA VARIANTE */}
                    <div className="var-card">
                        <div className="var-card-header">
                            <div className="var-card-icon-sq">
                                <ImageIcon size={22} />
                            </div>
                            <div className="var-card-title-group">
                                <h3>Imágenes del producto</h3>
                                <p>
                                    Agrega las imágenes correspondientes a cada variante. Puedes subir
                                    varias imágenes por variante.
                                </p>
                            </div>
                        </div>

                        {/* BANNER AVISO CYAN */}
                        <div className="var-cyan-notice-banner">
                            <Info size={18} />
                            <span>
                                Las imágenes se organizan por variante. Selecciona una variante para
                                subir sus imágenes.
                            </span>
                        </div>

                        {colorGroups.length === 0 ? (
                            <div className="var-empty-state-card">
                                <p>Debes configurar al menos una variante en el Paso 2 antes de subir imágenes.</p>
                                <button
                                    type="button"
                                    className="var-prev-step-btn"
                                    onClick={() => setStep(2)}
                                >
                                    Ir al Paso 2: Variantes
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* SELECTOR DE VARIANTE A EDITAR IMÁGENES */}
                                <div className="var-select-variant-filter">
                                    <label>Selecciona una variante:</label>
                                    <div className="var-select-variant-box">
                                        <select
                                            className="var-select-variant-dropdown"
                                            value={selectedVariantColorIndex}
                                            onChange={(e) => {
                                                setSelectedVariantColorIndex(Number(e.target.value));
                                                setFeaturedImageIndex(0);
                                            }}
                                        >
                                            {colorGroups.map((g, idx) => (
                                                <option key={idx} value={idx}>
                                                    ● {g.nombre} (Tallas: {g.sizes.map((s) => s.nombre).join(", ")})
                                                </option>
                                            ))}
                                        </select>
                                        <div className="var-select-chevron">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                </div>

                                {/* SUBTÍTULO CON CONTEO DE IMÁGENES */}
                                <div className="var-variant-images-title-row">
                                    <div className="var-variant-images-title">
                                        Imágenes para esta variante ({activeColorGroup?.nombre})
                                    </div>
                                    <span className="var-count-pill-badge">
                                        {activeColorGroup?.imagenes?.length || 0} de {MAX_VARIANT_IMAGES}
                                    </span>
                                </div>

                                {/* PESTAÑAS ARCHIVO / URL PARA IMÁGENES */}
                                <div className="var-media-tabs">
                                    <button
                                        type="button"
                                        className={`var-media-tab-btn ${imageInputTab === "file" ? "active" : ""}`}
                                        onClick={() => {
                                            setImageInputTab("file");
                                            setImageUrlError("");
                                        }}
                                    >
                                        <ImageIcon size={14} />
                                        Subir archivo
                                    </button>
                                    <button
                                        type="button"
                                        className={`var-media-tab-btn ${imageInputTab === "url" ? "active" : ""}`}
                                        onClick={() => {
                                            setImageInputTab("url");
                                            setImageUrlError("");
                                        }}
                                    >
                                        <Globe size={14} />
                                        Pegar URL directa
                                    </button>
                                </div>

                                {/* OPCIÓN 1: SUBIR ARCHIVOS DE IMÁGENES */}
                                {imageInputTab === "file" ? (
                                    <div
                                        className={`var-dropzone-box ${dragOver ? "drag-over" : ""}`}
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
                                        <div className="var-dropzone-icon">
                                            <UploadCloud size={44} />
                                        </div>
                                        <h4>Arrastra y suelta tus imágenes aquí</h4>
                                        <p style={{ margin: "2px 0 4px", color: "#64748b" }}>
                                            o haz clic para seleccionar archivos
                                        </p>
                                        <p style={{ margin: "0 0 16px", fontSize: "11.5px", color: "#94a3b8" }}>
                                            JPG, PNG, WEBP • Máx. 5 MB por imagen • Hasta {MAX_VARIANT_IMAGES} imágenes
                                            por variante
                                        </p>

                                        <button
                                            type="button"
                                            className="simple-add-photos-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                            }}
                                        >
                                            <ImageIcon size={15} />
                                            Seleccionar imágenes
                                        </button>
                                    </div>
                                ) : (
                                    /* OPCIÓN 2: AGREGAR IMAGEN POR URL */
                                    <div className="var-url-input-container">
                                        <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>
                                            Enlace directo de la imagen (JPG, PNG, WEBP)
                                        </label>
                                        <div className="var-url-input-row">
                                            <div style={{ position: "relative", flex: 1 }}>
                                                <LinkIcon size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                                                <input
                                                    type="url"
                                                    className="var-url-input-field"
                                                    placeholder="https://ejemplo.com/imagen.jpg"
                                                    value={imageUrlInput}
                                                    onChange={(e) => handleImageUrlInputChange(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            handleAddImageByUrl();
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="var-url-add-btn"
                                                onClick={handleAddImageByUrl}
                                                disabled={isValidatingImageUrl || !imageUrlInput.trim()}
                                            >
                                                {isValidatingImageUrl ? (
                                                    <>
                                                        <Loader2 size={14} className="spin-icon" />
                                                        Validando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={14} />
                                                        Agregar
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {imageUrlError && (
                                            <div className="var-url-error-msg">
                                                <AlertCircle size={14} />
                                                <span>{imageUrlError}</span>
                                            </div>
                                        )}

                                        {imageUrlPreview && !imageUrlError && (
                                            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                                <img
                                                    src={imageUrlPreview}
                                                    alt="Vista previa URL"
                                                    style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "6px" }}
                                                    onError={() => setImageUrlError("No se pudo cargar la imagen desde este enlace.")}
                                                />
                                                <span style={{ fontSize: "12px", color: "#64748b" }}>Vista previa del enlace</span>
                                            </div>
                                        )}

                                        <p className="var-url-hint-text">
                                            Introduce una dirección URL accesible públicamente a una imagen en formato JPG, PNG o WEBP.
                                        </p>
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

                                {/* GRILLA DE MINIATURAS DE LA VARIANTE */}
                                <div className="var-variant-thumbnails-grid">
                                    {(activeColorGroup?.imagenes || []).map((img, idx) => (
                                        <div
                                            key={idx}
                                            className={`var-img-thumbnail-item ${previewMediaType === "image" && featuredImageIndex === idx ? "is-selected-view" : ""}`}
                                            onClick={() => {
                                                setPreviewMediaType("image");
                                                setFeaturedImageIndex(idx);
                                            }}
                                        >
                                            <img
                                                src={mediaUrl(img.imagen)}
                                                alt={`Foto variante ${idx + 1}`}
                                            />
                                            {img.principal && (
                                                <span className="simple-thumb-main-tag">
                                                    Principal
                                                </span>
                                            )}
                                            <div className="var-thumb-actions-hover">
                                                {!img.principal && (
                                                    <button
                                                        type="button"
                                                        className="var-thumb-star-btn"
                                                        onClick={(e) => handleSetPrincipalImage(idx, e)}
                                                        title="Establecer como principal"
                                                    >
                                                        <Sparkles size={11} />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="var-thumb-remove-btn"
                                                    onClick={(e) => handleDeleteVariantImage(idx, e)}
                                                    title="Eliminar imagen"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {(activeColorGroup?.imagenes?.length || 0) < MAX_VARIANT_IMAGES && (
                                        <div
                                            className="var-add-more-thumb-btn"
                                            onClick={() => {
                                                if (imageInputTab === "file") {
                                                    fileInputRef.current?.click();
                                                } else {
                                                    setImageInputTab("file");
                                                    setTimeout(() => fileInputRef.current?.click(), 50);
                                                }
                                            }}
                                        >
                                            <Plus size={18} />
                                            <span>Agregar más</span>
                                        </div>
                                    )}
                                </div>

                                {/* SECCIÓN DE VIDEO PARA ESTA VARIANTE */}
                                <div className="var-video-section-box">
                                    <div className="var-variant-images-title-row" style={{ marginTop: 0, marginBottom: "12px" }}>
                                        <div className="var-variant-images-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <Film size={18} color="#6a2ca0" />
                                            Video de la variante (opcional)
                                        </div>
                                        <span className="var-count-pill-badge">
                                            {activeColorGroup?.video ? "1 de 1" : "0 de 1"} • Máx 15 MB • Máx 60s
                                        </span>
                                    </div>

                                    {activeColorGroup?.video ? (
                                        <div className="var-video-preview-wrapper">
                                            <video
                                                src={mediaUrl(activeColorGroup.video.imagen)}
                                                controls
                                                preload="metadata"
                                                playsInline
                                                className="var-video-player"
                                            />
                                            <div className="var-video-meta-bar">
                                                <span className="var-video-badge">
                                                    <Video size={13} />
                                                    {activeColorGroup.video.file?.name || "Video de la variante"}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="var-video-delete-btn"
                                                    onClick={handleDeleteVariantVideo}
                                                    title="Eliminar video de la variante"
                                                >
                                                    <Trash2 size={13} />
                                                    Eliminar video
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* PESTAÑAS ARCHIVO / URL PARA VIDEO */}
                                            <div className="var-media-tabs" style={{ marginBottom: "12px" }}>
                                                <button
                                                    type="button"
                                                    className={`var-media-tab-btn ${videoInputTab === "file" ? "active" : ""}`}
                                                    onClick={() => {
                                                        setVideoInputTab("file");
                                                        setVideoError("");
                                                    }}
                                                >
                                                    <UploadCloud size={14} />
                                                    Subir video
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`var-media-tab-btn ${videoInputTab === "url" ? "active" : ""}`}
                                                    onClick={() => {
                                                        setVideoInputTab("url");
                                                        setVideoError("");
                                                    }}
                                                >
                                                    <Globe size={14} />
                                                    URL de video
                                                </button>
                                            </div>

                                            {videoInputTab === "file" ? (
                                                <div
                                                    className="var-video-empty-box"
                                                    onClick={() => videoFileInputRef.current?.click()}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <Film size={32} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
                                                    <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                                                        Sube un video para la variante {activeColorGroup?.nombre}
                                                    </p>
                                                    <p style={{ margin: 0, fontSize: "11.5px", color: "#94a3b8" }}>
                                                        Formatos MP4, WEBM • Máx. 15 MB • Máx. 60 segundos
                                                    </p>
                                                    <button
                                                        type="button"
                                                        className="simple-add-photos-btn"
                                                        style={{ margin: "12px auto 0" }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            videoFileInputRef.current?.click();
                                                        }}
                                                    >
                                                        <Video size={14} />
                                                        Seleccionar archivo
                                                    </button>
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
                                                </div>
                                            ) : (
                                                <div className="var-url-input-container" style={{ marginBottom: 0 }}>
                                                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>
                                                        Enlace directo del video (MP4 o WebM)
                                                    </label>
                                                    <div className="var-url-input-row">
                                                        <div style={{ position: "relative", flex: 1 }}>
                                                            <LinkIcon size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                                                            <input
                                                                type="url"
                                                                className="var-url-input-field"
                                                                placeholder="https://ejemplo.com/video.mp4"
                                                                value={videoUrlInput}
                                                                onChange={(e) => {
                                                                    setVideoUrlInput(e.target.value);
                                                                    setVideoError("");
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") {
                                                                        e.preventDefault();
                                                                        handleAddVideoByUrl();
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="var-url-add-btn"
                                                            onClick={handleAddVideoByUrl}
                                                            disabled={isValidatingVideo || !videoUrlInput.trim()}
                                                        >
                                                            {isValidatingVideo ? (
                                                                <>
                                                                    <Loader2 size={14} className="spin-icon" />
                                                                    Validando...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Plus size={14} />
                                                                    Agregar
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {videoError && (
                                                <div className="var-url-error-msg" style={{ marginTop: "10px" }}>
                                                    <AlertCircle size={14} />
                                                    <span>{videoError}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* COLUMNA DERECHA: RECOMENDACIONES Y VISTA PREVIA */}
                    <div>
                        {/* RECOMENDACIONES */}
                        <div className="var-summary-card">
                            <div className="var-summary-header">
                                <Lightbulb size={18} color="#6a2ca0" />
                                <div>
                                    <h4>Recomendaciones</h4>
                                </div>
                            </div>
                            <ul className="var-info-tips-list">
                                <li>
                                    <Check size={14} />
                                    <span>Usa imágenes de alta calidad (mín. 800x800 px).</span>
                                </li>
                                <li>
                                    <Check size={14} />
                                    <span>Muestra el producto desde diferentes ángulos.</span>
                                </li>
                                <li>
                                    <Check size={14} />
                                    <span>Puedes agregar hasta 1 video por variante (máx 15 MB, 60s).</span>
                                </li>
                                <li>
                                    <Check size={14} />
                                    <span>La imagen marcada como principal representará la variante.</span>
                                </li>
                            </ul>
                        </div>

                        {/* VISTA PREVIA DE LA VARIANTE */}
                        <div className="var-preview-card">
                            <div className="var-summary-header">
                                <ImageIcon size={18} color="#6a2ca0" />
                                <div>
                                    <h4>Vista previa de la variante</h4>
                                    <p>Así se verá en la tienda la imagen o video seleccionado.</p>
                                </div>
                            </div>

                            <div className="var-preview-featured-box">
                                {previewMediaType === "video" && activeColorGroup?.video ? (
                                    <video
                                        src={mediaUrl(activeColorGroup.video.imagen)}
                                        controls
                                        preload="metadata"
                                        playsInline
                                        style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000", borderRadius: "10px" }}
                                    />
                                ) : activeColorGroup?.imagenes?.length > 0 ? (
                                    <img
                                        src={mediaUrl(
                                            activeColorGroup.imagenes[featuredImageIndex]?.imagen ||
                                                activeColorGroup.imagenes[0]?.imagen
                                        )}
                                        alt="Vista previa"
                                    />
                                ) : activeColorGroup?.video ? (
                                    <video
                                        src={mediaUrl(activeColorGroup.video.imagen)}
                                        controls
                                        preload="metadata"
                                        playsInline
                                        style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000", borderRadius: "10px" }}
                                    />
                                ) : (
                                    <div style={{ textAlign: "center", color: "#94a3b8" }}>
                                        <ImageIcon size={40} style={{ margin: "0 auto 8px" }} />
                                        <small style={{ display: "block" }}>
                                            No hay imágenes ni videos cargados para {activeColorGroup?.nombre || "la variante"}
                                        </small>
                                    </div>
                                )}
                            </div>

                            {((activeColorGroup?.imagenes?.length || 0) > 0 || activeColorGroup?.video) && (
                                <div className="var-preview-mini-thumbs">
                                    {(activeColorGroup?.imagenes || []).slice(0, 5).map((img, idx) => (
                                        <div
                                            key={idx}
                                            className={`var-mini-thumb ${previewMediaType === "image" && featuredImageIndex === idx ? "active" : ""}`}
                                            onClick={() => {
                                                setPreviewMediaType("image");
                                                setFeaturedImageIndex(idx);
                                            }}
                                        >
                                            <img src={mediaUrl(img.imagen)} alt={`Mini ${idx}`} />
                                        </div>
                                    ))}
                                    {activeColorGroup?.video && (
                                        <div
                                            className={`var-mini-thumb ${previewMediaType === "video" ? "active" : ""}`}
                                            onClick={() => setPreviewMediaType("video")}
                                            title="Ver video de la variante"
                                            style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: "#1e1b4b" }}
                                        >
                                            <Play size={16} color="#ffffff" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================
               BARRA INFERIOR DE NAVEGACIÓN
               ========================================================= */}
            <footer className="var-bottom-actions-bar">
                {step > 1 ? (
                    <button
                        type="button"
                        className="var-prev-step-btn"
                        onClick={handlePrev}
                    >
                        <ChevronLeft size={16} />
                        Paso anterior
                    </button>
                ) : (
                    <div />
                )}

                {step < 3 ? (
                    <button
                        type="button"
                        className="var-next-step-btn"
                        onClick={handleNext}
                    >
                        <span>
                            {step === 1 ? "Siguiente: Variantes" : "Siguiente: Imágenes"}
                        </span>
                        <ChevronLeft size={16} style={{ transform: "rotate(180deg)" }} />
                    </button>
                ) : (
                    <button
                        type="button"
                        className="var-next-step-btn"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        <Save size={16} />
                        <span>{loading ? "Guardando..." : "Guardar producto"}</span>
                    </button>
                )}
            </footer>

            {/* MODAL PARA AGREGAR NUEVO COLOR */}
            {colorModalOpen && (
                <div
                    className="var-inline-modal-overlay"
                    onClick={() => setColorModalOpen(false)}
                >
                    <div
                        className="var-inline-modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h3 style={{ margin: 0, fontSize: "16px", color: "#1e1b4b" }}>
                                Agregar nuevo color
                            </h3>
                            <button
                                type="button"
                                onClick={() => setColorModalOpen(false)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* PALETA DE SELECCIÓN RÁPIDA */}
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px" }}>
                                Colores sugeridos:
                            </label>
                            <div className="var-quick-colors-grid">
                                {PRESET_COLORS.map((preset) => (
                                    <button
                                        key={preset.nombre}
                                        type="button"
                                        className="var-preset-color-chip"
                                        onClick={() => {
                                            setNewColorData({
                                                nombre: preset.nombre,
                                                codigo_hex: preset.hex,
                                            });
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: "12px",
                                                height: "12px",
                                                borderRadius: "50%",
                                                backgroundColor: preset.hex,
                                                border: "1px solid rgba(0,0,0,0.15)",
                                            }}
                                        />
                                        <span>{preset.nombre}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleAddColor(newColorData.nombre, newColorData.codigo_hex);
                            }}
                        >
                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                                    Nombre del color *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej. Rojo Pasión, Azul Marino, Verde Oliva..."
                                    value={newColorData.nombre}
                                    onChange={(e) =>
                                        setNewColorData((prev) => ({
                                            ...prev,
                                            nombre: e.target.value,
                                        }))
                                    }
                                    autoFocus
                                    className="var-text-input"
                                    style={{ paddingLeft: "14px" }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                                    Muestra de color (hexadecimal)
                                </label>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <input
                                        type="color"
                                        value={newColorData.codigo_hex}
                                        onChange={(e) =>
                                            setNewColorData((prev) => ({
                                                ...prev,
                                                codigo_hex: e.target.value,
                                            }))
                                        }
                                        style={{ width: "46px", height: "46px", borderRadius: "10px", border: "1px solid #e2e8f0", cursor: "pointer", padding: "4px" }}
                                    />
                                    <input
                                        type="text"
                                        value={newColorData.codigo_hex}
                                        onChange={(e) =>
                                            setNewColorData((prev) => ({
                                                ...prev,
                                                codigo_hex: e.target.value,
                                            }))
                                        }
                                        className="var-text-input"
                                        style={{ flex: 1, paddingLeft: "14px" }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button
                                    type="button"
                                    className="var-prev-step-btn"
                                    onClick={() => setColorModalOpen(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="var-next-step-btn"
                                    disabled={!newColorData.nombre.trim()}
                                >
                                    Agregar color
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL PARA AGREGAR NUEVO DISEÑO */}
            {designModalOpen && (
                <div
                    className="var-inline-modal-overlay"
                    onClick={() => setDesignModalOpen(false)}
                >
                    <div
                        className="var-inline-modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h3 style={{ margin: 0, fontSize: "16px", color: "#1e1b4b" }}>
                                Crear nuevo diseño o modelo
                            </h3>
                            <button
                                type="button"
                                onClick={() => setDesignModalOpen(false)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateDesignSubmit}>
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                                    Nombre del diseño *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej. Estampado Floral, Rayas, Clásico, Minimalista..."
                                    value={newDesignName}
                                    onChange={(e) => setNewDesignName(e.target.value)}
                                    autoFocus
                                    className="var-text-input"
                                    style={{ paddingLeft: "14px" }}
                                    required
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button
                                    type="button"
                                    className="var-prev-step-btn"
                                    onClick={() => setDesignModalOpen(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="var-next-step-btn"
                                    disabled={!newDesignName.trim()}
                                >
                                    Guardar diseño
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VariableProductForm;
