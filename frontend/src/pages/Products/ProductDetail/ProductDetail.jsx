import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    Loader2,
    ShoppingCart,
    Truck,
    ShieldCheck,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    Minus,
    Plus,
    Maximize2,
    X,
    Play,
    Volume2,
    VolumeX,
} from "lucide-react";

import api from "../../../services/api";
import { getProducts, getProduct } from "../../../services/adminService";
import { useCart } from "../../../hooks/useCart";
import NoImage from "../../../assets/images/Imagen no disponible.png";
import { mediaUrl } from "../../../utils/mediaUrl";
import { isVideoResource } from "../../../utils/mediaValidation";
import SEO from "../../../components/SEO/SEO";
import "./ProductDetail.css";

const formatearPesos = (valor) => {
    const numero = Number(valor);
    if (Number.isNaN(numero)) return "$0";
    return `$${numero.toLocaleString("es-CO")}`;
};

function ProductDetail({ productId }) {
    const { addItem } = useCart();
    const navigate = useNavigate();

    const [producto, setProducto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [imagenActiva, setImagenActiva] = useState(0);
    const [colorSeleccionado, setColorSeleccionado] = useState(null);
    const [tallaSeleccionada, setTallaSeleccionada] = useState(null);
    const [cantidad, setCantidad] = useState(1);
    const [tabActiva, setTabActiva] = useState("descripcion");
    const [showZoom, setShowZoom] = useState(false);

    // Ref para el carrusel de recomendaciones
    const carouselRef = useRef(null);
    const [recomendaciones, setRecomendaciones] = useState([]);

    // Ref y estados para el video principal con reproducción por scroll
    const videoRef = useRef(null);
    const videoContainerRef = useRef(null);
    const [isMuted, setIsMuted] = useState(true);

    /* =====================================================
       CARGAR PRODUCTO
    ===================================================== */
    useEffect(() => {
        if (!productId) return;
        let cancelado = false;

        const cargar = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data } = await getProduct(productId);
                if (!cancelado) {
                    setProducto(data);
                }
            } catch (err) {
                console.error(err);
                if (!cancelado) {
                    setError("No fue posible cargar el producto.");
                }
            } finally {
                if (!cancelado) {
                    setLoading(false);
                }
            }
        };

        cargar();
        return () => { cancelado = true; };
    }, [productId]);

    /* =====================================================
       GALERÍA
    ===================================================== */
    const galeria = useMemo(() => {
        if (!producto) return [];

        const mapa = new Map();
        (producto.variantes || []).forEach((v) => {
            (v.imagenes || []).forEach((img) => {
                const url = img.imagen;
                if (url && !mapa.has(url)) {
                    mapa.set(url, {
                        ...img,
                        variante_id: v.id_variante,
                        color_id: v.color?.id_color,
                    });
                }
            });
        });

        const todas = Array.from(mapa.values());

        if (todas.length === 0 && producto.imagenes?.length > 0) {
            return producto.imagenes;
        }

        if (todas.length === 0 && producto.imagen_principal) {
            return [{ imagen: producto.imagen_principal, principal: true }];
        }

        return todas.sort((a, b) => {
            if (a.principal && !b.principal) return -1;
            if (!a.principal && b.principal) return 1;
            return (a.orden || 0) - (b.orden || 0);
        });
    }, [producto]);

    /* =====================================================
       COLORES Y TALLAS
    ===================================================== */
    const colores = useMemo(() => {
        if (!producto || producto.producto_simple) return [];
        const mapa = new Map();
        (producto.variantes || []).forEach((v) => {
            if (v.color && !mapa.has(v.color.id_color)) {
                mapa.set(v.color.id_color, v.color);
            }
        });
        return Array.from(mapa.values());
    }, [producto]);

    const tallas = useMemo(() => {
        if (!producto || producto.producto_simple) return [];
        const mapa = new Map();
        (producto.variantes || []).forEach((v) => {
            if (v.talla && !mapa.has(v.talla.id_talla)) {
                mapa.set(v.talla.id_talla, v.talla);
            }
        });
        return Array.from(mapa.values());
    }, [producto]);

    /* =====================================================
       RESETEAR SELECCIÓN
    ===================================================== */
    useEffect(() => {
        setImagenActiva(0);
        setColorSeleccionado(colores[0]?.id_color || null);
        setTallaSeleccionada(tallas[0]?.id_talla || null);
        setCantidad(1);
    }, [productId, colores, tallas]);

    /* =====================================================
       IMAGEN O VIDEO ACTUAL
    ===================================================== */
    const mediaActivo = useMemo(() => {
        if (galeria.length === 0) return null;
        return galeria[imagenActiva] || galeria[0] || null;
    }, [galeria, imagenActiva]);

    const esVideoActivo = useMemo(() => {
        if (!mediaActivo) return false;
        return mediaActivo.tipo === "video" || isVideoResource(mediaActivo.imagen);
    }, [mediaActivo]);

    const imagenActual = useMemo(() => {
        if (galeria.length === 0) return NoImage;
        const target = galeria[imagenActiva] || galeria[0];
        return mediaUrl(target?.imagen, NoImage);
    }, [galeria, imagenActiva]);

    /* =====================================================
       REPRODUCCIÓN AUTOMÁTICA DEL VIDEO AL SCROLL
       Solo se reproduce cuando el usuario visualiza el video
    ===================================================== */
    useEffect(() => {
        if (!esVideoActivo) return;

        const targetEl = videoContainerRef.current || videoRef.current;
        const videoEl = videoRef.current;
        if (!targetEl || !videoEl) return;

        // Asegurar silenciado inicial para permitir reproducción automática sin bloqueo del navegador
        videoEl.muted = isMuted;

        let observer = null;
        if ("IntersectionObserver" in window) {
            observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
                            const playPromise = videoEl.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(() => {
                                    // Bloqueo o abort ignorado limpiamente
                                });
                            }
                        } else if (!entry.isIntersecting || entry.intersectionRatio < 0.2) {
                            videoEl.pause();
                        }
                    });
                },
                {
                    threshold: [0, 0.2, 0.25, 0.5, 0.75, 1],
                }
            );
            observer.observe(targetEl);
        } else {
            videoEl.play().catch(() => {});
        }

        return () => {
            if (observer) {
                observer.disconnect();
            }
        };
    }, [esVideoActivo, imagenActual]);

    // Mantener la propiedad muted del elemento sincronizada con el estado
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
        }
    }, [isMuted]);

    const handleToggleAudio = (e) => {
        e.stopPropagation();
        setIsMuted((prev) => {
            const next = !prev;
            if (videoRef.current) {
                videoRef.current.muted = next;
                videoRef.current.play().catch(() => {});
            }
            return next;
        });
    };

    /* =====================================================
       RECOMENDACIONES ("También te puede interesar")
    ===================================================== */
    useEffect(() => {
        if (!producto?.id_producto) return;

        const cargarRecomendaciones = async () => {
            try {
                const response = await api.get(`products/${producto.id_producto}/recomendaciones/`);
                const items = response.data?.results || response.data || [];
                if (items.length > 0) {
                    setRecomendaciones(items);
                } else {
                    const fallback = await getProducts({ page_size: 10 });
                    const list = (fallback.data?.results || fallback.data || [])
                        .filter(p => p.id_producto !== producto.id_producto);
                    setRecomendaciones(list);
                }
            } catch (err) {
                try {
                    const fallback = await getProducts({ page_size: 10 });
                    const list = (fallback.data?.results || fallback.data || [])
                        .filter(p => p.id_producto !== producto.id_producto);
                    setRecomendaciones(list);
                } catch (e) {
                    console.error(e);
                }
            }
        };

        cargarRecomendaciones();
    }, [producto?.id_producto]);

    /* =====================================================
       VARIANTE Y STOCK
    ===================================================== */
    const varianteSeleccionada = useMemo(() => {
        if (!producto) return null;
        return (
            (producto.variantes || []).find(
                (v) =>
                    (!colorSeleccionado || v.color?.id_color === colorSeleccionado) &&
                    (!tallaSeleccionada || v.talla?.id_talla === tallaSeleccionada)
            ) ||
            (producto.variantes || []).find(
                (v) => !colorSeleccionado || v.color?.id_color === colorSeleccionado
            ) ||
            (producto.variantes || [])[0] ||
            null
        );
    }, [producto, colorSeleccionado, tallaSeleccionada]);

    const stockDisponible = varianteSeleccionada?.stock ?? (producto?.stock ?? 15);
    const stockInfinito = varianteSeleccionada?.stock_infinito ?? false;

    const estadoStock = useMemo(() => {
        if (stockInfinito) return { clase: "ok", texto: "En stock" };
        if (stockDisponible <= 0) return { clase: "out", texto: "Sin stock" };
        return { clase: "ok", texto: "En stock" };
    }, [stockDisponible, stockInfinito]);

    /* =====================================================
       MANEJADORES
    ===================================================== */
    const handleSeleccionarColor = (idColor) => {
        setColorSeleccionado(idColor);
        const idx = galeria.findIndex(
            (img) => img.color_id === idColor || (producto?.variantes || []).find(v => v.id_variante === img.variante_id)?.color?.id_color === idColor
        );
        if (idx >= 0) setImagenActiva(idx);
    };

    const handleAgregarCarrito = async () => {
        if (!producto) return;

        const variante = varianteSeleccionada;
        const varianteId = variante?.id_variante || producto.id_producto;
        const precio = variante?.precio ?? producto.precio;
        const colorNombre = producto.producto_simple ? "" : (colores.find(c => c.id_color === colorSeleccionado)?.nombre || "");
        const tallaNombre = producto.producto_simple ? "" : (tallas.find(t => t.id_talla === tallaSeleccionada)?.nombre || "");

        if (!stockInfinito && stockDisponible <= 0 && variante) {
            alert("Este producto no tiene stock disponible.");
            return;
        }

        const imagenVariante =
            (variante?.imagenes || []).find((i) => i.principal)?.imagen ||
            (producto?.variantes || []).find(v => v.color?.id_color === variante?.color?.id_color && v.imagenes?.length > 0)?.imagenes?.[0]?.imagen;

        const imagen =
            mediaUrl(
                imagenVariante,
                null
            ) ||
            imagenActual ||
            NoImage;

        const payload = {
            variante_id: varianteId,
            sku: variante?.sku || `SKU-${producto.id_producto}`,
            stock: variante?.stock ?? 10,
            stock_infinito: variante?.stock_infinito || false,
            producto_id: producto.id_producto,
            producto_nombre: producto.nombre,
            producto_slug: producto.slug,
            producto_precio: precio,
            color: colorNombre,
            talla: tallaNombre,
            imagen,
            cantidad,
        };

        const result = await addItem(payload);
        if (result?.ok) {
            return;
        }
        alert("No se pudo agregar al carrito. Intenta de nuevo.");
    };

    const scrollCarousel = (direction) => {
        if (!carouselRef.current) return;
        const scrollAmount = 320;
        carouselRef.current.scrollBy({
            left: direction === "left" ? -scrollAmount : scrollAmount,
            behavior: "smooth",
        });
    };

    /* =====================================================
       SEO
    ===================================================== */
    const seoConfig = useMemo(() => {
        if (!producto) return null;
        const foto = galeria.find((g) => g.tipo !== "video" && !isVideoResource(g.imagen));
        const ogImage = foto ? mediaUrl(foto.imagen, NoImage) : (producto.imagen_principal ? mediaUrl(producto.imagen_principal, NoImage) : NoImage);
        const cleanDesc = (producto.descripcion || "").replace(/<[^>]+>/g, "").trim();
        const shortDesc = cleanDesc.slice(0, 160) || "Encuentra la mejor ropa deportiva y moda en MiVenta con envíos a toda Colombia.";
        const priceNum = Number(varianteSeleccionada?.precio ?? producto.precio) || 0;
        const isInStock = stockInfinito || stockDisponible > 0;

        const productSchema = {
            "@context": "https://schema.org/",
            "@type": "Product",
            name: producto.nombre,
            image: [ogImage],
            description: shortDesc,
            sku: varianteSeleccionada?.sku || `MIV-${producto.id_producto}`,
            brand: {
                "@type": "Brand",
                name: "MiVenta",
            },
            offers: {
                "@type": "Offer",
                url: `https://www.miventa.co/producto/${producto.slug || productId}`,
                priceCurrency: "COP",
                price: priceNum,
                priceValidUntil: "2027-12-31",
                itemCondition: "https://schema.org/NewCondition",
                availability: isInStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                seller: {
                    "@type": "Organization",
                    name: "MiVenta",
                },
            },
        };

        return {
            title: `${producto.nombre} | MiVenta`,
            description: shortDesc,
            keywords: `${producto.nombre}, comprar ${producto.nombre}, ropa deportiva, moda colombia, MiVenta`,
            path: `/producto/${producto.slug || productId}`,
            image: ogImage,
            ogType: "product",
            structuredData: productSchema,
        };
    }, [producto, productId, galeria, varianteSeleccionada, stockDisponible, stockInfinito]);

    // Lista de miniaturas con fallback
    const galeriaRender = galeria.length > 0 ? galeria : [{ imagen: NoImage }];

    return (
        <main className="pd-page">
            {seoConfig && (
                <SEO
                    title={seoConfig.title}
                    description={seoConfig.description}
                    keywords={seoConfig.keywords}
                    path={seoConfig.path}
                    image={seoConfig.image}
                    ogType={seoConfig.ogType}
                    structuredData={seoConfig.structuredData}
                />
            )}

            {/* Elementos decorativos de fondo tipo mockup */}
            <div className="pd-bg-blob pd-bg-blob-top-right" aria-hidden="true" />
            <div className="pd-bg-blob pd-bg-blob-bottom-left" aria-hidden="true" />
            <div className="pd-bg-blob pd-bg-blob-bottom-right" aria-hidden="true" />

            {/* LOADING */}
            {loading && (
                <div className="pd-state-box">
                    <Loader2 size={36} className="pd-spin" />
                    <p>Cargando detalles del producto...</p>
                </div>
            )}

            {/* ERROR */}
            {!loading && error && (
                <div className="pd-state-box">
                    <p>{error}</p>
                    <button type="button" className="pd-back-btn" onClick={() => navigate(-1)}>
                        Volver
                    </button>
                </div>
            )}

            {/* CONTENIDO PRINCIPAL */}
            {!loading && !error && producto && (
                <div className="pd-container">
                    {/* BREADCRUMB */}
                    <nav className="pd-breadcrumb" aria-label="Navegación de migas de pan">
                        <span onClick={() => navigate("/")} className="pd-breadcrumb-link">
                            Inicio
                        </span>
                        <span className="pd-breadcrumb-sep">›</span>
                        <span onClick={() => navigate("/productos")} className="pd-breadcrumb-link">
                            Productos
                        </span>
                        <span className="pd-breadcrumb-sep">›</span>
                        <span className="pd-breadcrumb-active">
                            {producto.categorias?.[0]?.nombre || producto.categoria?.nombre || producto.nombre}
                        </span>
                    </nav>

                    {/* TARJETA SUPERIOR: GALERÍA + COMPRA */}
                    <section className="pd-card pd-hero-card">
                        <div className="pd-hero-grid">
                            {/* GALERÍA IZQUIERDA */}
                            <div className="pd-gallery-section">
                                {/* Miniaturas Verticales */}
                                <div className="pd-thumbs-column">
                                    <div className="pd-thumbs-stack">
                                        {galeriaRender.map((img, idx) => {
                                            const isVid = img.tipo === "video" || isVideoResource(img.imagen);
                                            return (
                                                <button
                                                    key={img.id_imagen || idx}
                                                    type="button"
                                                    className={`pd-thumb-item ${idx === imagenActiva ? "active" : ""} ${isVid ? "is-video-thumb" : ""}`}
                                                    onClick={() => setImagenActiva(idx)}
                                                    aria-label={isVid ? `Ver video ${idx + 1}` : `Ver imagen ${idx + 1}`}
                                                >
                                                    {isVid ? (
                                                        <div className="pd-thumb-video-placeholder">
                                                            <video
                                                                src={mediaUrl(img.imagen)}
                                                                preload="metadata"
                                                                muted
                                                                playsInline
                                                                className="pd-thumb-video-poster"
                                                            />
                                                            <div className="pd-thumb-video-badge">
                                                                <Play size={13} fill="currentColor" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={mediaUrl(img.imagen, NoImage)}
                                                            alt={`Miniatura ${idx + 1}`}
                                                            onError={(e) => { e.currentTarget.src = NoImage; }}
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {/* Contador de imágenes */}
                                    <div className="pd-thumbs-counter">
                                        {imagenActiva + 1} / {Math.max(galeriaRender.length, 1)}
                                    </div>
                                </div>

                                {/* Imagen o Video Principal Grande */}
                                <div className="pd-main-image-wrap">
                                    {esVideoActivo ? (
                                        <div className="pd-main-video-container" ref={videoContainerRef}>
                                            <video
                                                ref={videoRef}
                                                key={imagenActual}
                                                src={imagenActual}
                                                muted={isMuted}
                                                loop
                                                playsInline
                                                preload="auto"
                                                disablePictureInPicture
                                                controlsList="nodownload nofullscreen noremoteplayback"
                                                onContextMenu={(e) => e.preventDefault()}
                                                className="pd-main-video"
                                            />
                                            <button
                                                type="button"
                                                className={`pd-video-audio-btn ${isMuted ? "is-muted" : "is-active"}`}
                                                onClick={handleToggleAudio}
                                                title={isMuted ? "Activar audio" : "Silenciar audio"}
                                                aria-label={isMuted ? "Activar audio" : "Silenciar audio"}
                                            >
                                                {isMuted ? (
                                                    <>
                                                        <VolumeX size={18} />
                                                        <span>Activar audio</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Volume2 size={18} />
                                                        <span>Silenciar</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <img
                                                src={imagenActual}
                                                alt={producto.nombre}
                                                className="pd-main-image"
                                                onError={(e) => { e.currentTarget.src = NoImage; }}
                                            />
                                            {/* Botón de Zoom / Pantalla completa */}
                                            <button
                                                type="button"
                                                className="pd-zoom-btn"
                                                onClick={() => setShowZoom(true)}
                                                title="Ampliar imagen"
                                                aria-label="Ampliar imagen"
                                            >
                                                <Maximize2 size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* INFORMACIÓN DERECHA */}
                            <div className="pd-info-section">
                                {/* Badge de Estado */}
                                <div className="pd-stock-badge-wrap">
                                    <span className={`pd-stock-badge ${estadoStock.clase}`}>
                                        {estadoStock.texto}
                                    </span>
                                </div>

                                {/* Título */}
                                <h1 className="pd-product-title">{producto.nombre}</h1>

                                {/* Precio */}
                                <div className="pd-product-price">
                                    {formatearPesos(varianteSeleccionada?.precio ?? producto.precio)}
                                </div>

                                {/* Selección de Talla (solo si el producto tiene tallas creadas y no es simple) */}
                                {!producto.producto_simple && tallas.length > 0 && (
                                    <div className="pd-spec-group">
                                        <div className="pd-spec-label">Talla</div>
                                        <div className="pd-sizes-row">
                                            {tallas.map((t) => {
                                                const isSelected = tallaSeleccionada === t.id_talla;
                                                return (
                                                    <button
                                                        key={t.id_talla}
                                                        type="button"
                                                        className={`pd-size-btn ${isSelected ? "selected" : ""}`}
                                                        onClick={() => setTallaSeleccionada(isSelected ? null : t.id_talla)}
                                                    >
                                                        {t.nombre}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Selección de Color (solo si el producto tiene colores creados y no es simple) */}
                                {!producto.producto_simple && colores.length > 0 && (
                                    <div className="pd-spec-group">
                                        <div className="pd-spec-label">Color</div>
                                        <div className="pd-colors-row">
                                            {colores.map((c) => {
                                                const isSelected = colorSeleccionado === c.id_color;
                                                return (
                                                    <button
                                                        key={c.id_color}
                                                        type="button"
                                                        className={`pd-color-btn ${isSelected ? "selected" : ""}`}
                                                        onClick={() => handleSeleccionarColor(c.id_color)}
                                                        title={c.nombre}
                                                        aria-label={`Color ${c.nombre}`}
                                                    >
                                                        <span
                                                            className="pd-color-circle"
                                                            style={{ backgroundColor: c.codigo_hex || "#2d5a44" }}
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Descripción y Envíos arriba del botón para producto simple */}
                                {producto.producto_simple && (
                                    <div className="pd-simple-tabs-wrap">
                                        <div className="pd-simple-tabs-header">
                                            <button
                                                type="button"
                                                className={`pd-tab-btn ${tabActiva === "descripcion" ? "active" : ""}`}
                                                onClick={() => setTabActiva("descripcion")}
                                            >
                                                Descripción
                                            </button>
                                            <button
                                                type="button"
                                                className={`pd-tab-btn ${tabActiva === "envios" ? "active" : ""}`}
                                                onClick={() => setTabActiva("envios")}
                                            >
                                                Envíos y devoluciones
                                            </button>
                                        </div>

                                        <div className="pd-simple-tab-body">
                                            {tabActiva === "descripcion" && (
                                                <div className="pd-simple-desc-content">
                                                    <p className="pd-simple-desc-text">
                                                        {producto.descripcion ||
                                                            "Conjunto deportivo diseñado para brindarte comodidad y libertad de movimiento en tu día a día. Fabricado con materiales de alta calidad, es ideal para entrenar, salir o simplemente para un look casual y moderno."}
                                                    </p>
                                                </div>
                                            )}

                                            {tabActiva === "envios" && (
                                                <div className="pd-simple-shipping-content">
                                                    <div className="pd-shipping-benefit-item">
                                                        <Truck size={20} className="pd-purple-check" />
                                                        <div>
                                                            <strong>Envíos a toda Colombia</strong>
                                                            <p>Entregas rápidas de 2 a 5 días hábiles a nivel nacional.</p>
                                                        </div>
                                                    </div>
                                                    <div className="pd-shipping-benefit-item">
                                                        <RotateCcw size={20} className="pd-purple-check" />
                                                        <div>
                                                            <strong>Devoluciones sin costo</strong>
                                                            <p>Dispones de hasta 30 días para solicitar cambios o devolución.</p>
                                                        </div>
                                                    </div>
                                                    <div className="pd-shipping-benefit-item">
                                                        <ShieldCheck size={20} className="pd-purple-check" />
                                                        <div>
                                                            <strong>Compra protegida</strong>
                                                            <p>Transacciones con los más altos estándares de seguridad y soporte postventa.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Fila de Cantidad y Agregar al Carrito */}
                                <div className="pd-actions-row">
                                    {/* Selector de cantidad pill */}
                                    <div className="pd-quantity-pill">
                                        <button
                                            type="button"
                                            className="pd-qty-btn"
                                            disabled={cantidad <= 1}
                                            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                                            aria-label="Disminuir cantidad"
                                        >
                                            <Minus size={15} />
                                        </button>
                                        <span className="pd-qty-display">{cantidad}</span>
                                        <button
                                            type="button"
                                            className="pd-qty-btn"
                                            disabled={!stockInfinito && cantidad >= Math.max(1, stockDisponible)}
                                            onClick={() => setCantidad((c) => c + 1)}
                                            aria-label="Aumentar cantidad"
                                        >
                                            <Plus size={15} />
                                        </button>
                                    </div>

                                    {/* Botón rosado Agregar al carrito */}
                                    <button
                                        type="button"
                                        className="pd-add-to-cart-btn"
                                        disabled={!stockInfinito && stockDisponible <= 0}
                                        onClick={handleAgregarCarrito}
                                    >
                                        <ShoppingCart size={19} />
                                        <span>
                                            {!stockInfinito && stockDisponible <= 0 ? "Sin stock" : "Agregar al carrito"}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* TARJETA INTERMEDIA: TABS (solo para productos con variantes) */}
                    {!producto.producto_simple && (
                        <section className="pd-card pd-tabs-card">
                            <div className="pd-tabs-header">
                                <button
                                    type="button"
                                    className={`pd-tab-btn ${tabActiva === "descripcion" ? "active" : ""}`}
                                    onClick={() => setTabActiva("descripcion")}
                                >
                                    Descripción
                                </button>
                                <button
                                    type="button"
                                className={`pd-tab-btn ${tabActiva === "envios" ? "active" : ""}`}
                                onClick={() => setTabActiva("envios")}
                            >
                                Envíos y devoluciones
                            </button>
                        </div>

                        <div className="pd-tab-body">
                            {/* PESTAÑA: DESCRIPCIÓN */}
                            {tabActiva === "descripcion" && (
                                <div className="pd-desc-layout">
                                    <div className="pd-desc-text">
                                        <p>
                                            {producto.descripcion ||
                                                "Conjunto deportivo diseñado para brindarte comodidad y libertad de movimiento en tu día a día. Fabricado con materiales de alta calidad, es ideal para entrenar, salir o simplemente para un look casual y moderno."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* PESTAÑA: ENVÍOS Y DEVOLUCIONES */}
                            {tabActiva === "envios" && (
                                <div className="pd-shipping-benefits-list">
                                    <div className="pd-shipping-benefit-item">
                                        <Truck size={22} className="pd-purple-check" />
                                        <div>
                                            <strong>Envíos a toda Colombia</strong>
                                            <p>Entregas rápidas de 2 a 5 días hábiles a nivel nacional. Cobertura directa y segura.</p>
                                        </div>
                                    </div>
                                    <div className="pd-shipping-benefit-item">
                                        <RotateCcw size={22} className="pd-purple-check" />
                                        <div>
                                            <strong>Devoluciones sin costo</strong>
                                            <p>Dispones de hasta 30 días para solicitar cambio de talla o devolución total de tu dinero.</p>
                                        </div>
                                    </div>
                                    <div className="pd-shipping-benefit-item">
                                        <ShieldCheck size={22} className="pd-purple-check" />
                                        <div>
                                            <strong>Compra protegida</strong>
                                            <p>Transacciones con los más altos estándares de seguridad y soporte postventa garantizado.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                    {/* SECCIÓN INFERIOR: TAMBIÉN TE PUEDE INTERESAR */}
                    <section className="pd-related-section">
                        <div className="pd-related-top">
                            <div className="pd-related-title-box">
                                <h2 className="pd-related-title">
                                    <span className="pd-title-accent">También</span> te puede interesar
                                </h2>
                            </div>

                            <div className="pd-carousel-arrows">
                                <button
                                    type="button"
                                    className="pd-arrow-btn pd-arrow-prev"
                                    onClick={() => scrollCarousel("left")}
                                    aria-label="Anterior producto"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    type="button"
                                    className="pd-arrow-btn pd-arrow-next"
                                    onClick={() => scrollCarousel("right")}
                                    aria-label="Siguiente producto"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Carrusel de productos */}
                        <div className="pd-related-carousel" ref={carouselRef}>
                            {recomendaciones.map((prod) => {
                                const imgRel = mediaUrl(
                                    prod.imagenes?.[0]?.imagen ||
                                    prod.imagen_principal ||
                                    prod.variantes?.[0]?.imagenes?.[0]?.imagen,
                                    NoImage
                                );
                                return (
                                    <div
                                        key={prod.id_producto}
                                        className="pd-rel-card"
                                        onClick={() => {
                                            navigate(`/producto/${prod.slug || prod.id_producto}`);
                                            window.scrollTo({ top: 0, behavior: "smooth" });
                                        }}
                                    >
                                        <div className="pd-rel-card-img-wrap">
                                            <img
                                                src={imgRel}
                                                alt={prod.nombre}
                                                onError={(e) => { e.currentTarget.src = NoImage; }}
                                            />
                                        </div>
                                        <div className="pd-rel-card-info">
                                            <h3 className="pd-rel-card-name">{prod.nombre}</h3>
                                            <div className="pd-rel-card-price">{formatearPesos(prod.precio)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            )}

            {/* MODAL LIGHTBOX DE ZOOM */}
            {showZoom && (
                <div className="pd-zoom-modal" onClick={() => setShowZoom(false)}>
                    <div className="pd-zoom-container" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="pd-zoom-close"
                            onClick={() => setShowZoom(false)}
                            aria-label="Cerrar vista ampliada"
                        >
                            <X size={24} />
                        </button>
                        {esVideoActivo ? (
                            <video
                                src={imagenActual}
                                controls
                                autoPlay
                                playsInline
                                className="pd-zoom-full-video"
                            />
                        ) : (
                            <img src={imagenActual} alt={producto?.nombre || "Zoom"} className="pd-zoom-full-img" />
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}

export default ProductDetail;