import "./ProductCard.css";
import NoImage from "../../../assets/images/Imagen no disponible.png";
import { mediaUrl } from "../../../utils/mediaUrl";
import { isVideoResource } from "../../../utils/mediaValidation";

import { ShoppingCart, Spinner } from "@phosphor-icons/react";
import { Play } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useState, useRef, useMemo } from "react";
import { useCart } from "../../../hooks/useCart";


function ProductCard({ product, onSelect }) {

    const navigate = useNavigate();

    const { addItem } = useCart();

    const [isAdding, setIsAdding] = useState(false);


    /*
    ============================================================
    OBTENER IMAGEN DEL PRODUCTO
    ============================================================
    */

    const getProductImage = () => {

        if (!product) {
            return NoImage;
        }

        /*
        Primero buscamos la imagen principal
        dentro de las variantes.
        */

        const variantes = product.variantes || [];

        for (const variante of variantes) {

            const imagenes = variante.imagenes || [];

            const imagenPrincipal = imagenes.find(
                (imagen) => imagen.principal === true && imagen.tipo !== "video" && !isVideoResource(imagen.imagen)
            );

            if (imagenPrincipal?.imagen) {
                return mediaUrl(imagenPrincipal.imagen, NoImage);
            }

            /*
            Si no existe principal,
            usamos la primera imagen disponible (no video).
            */

            const primeraImagen = imagenes.find(
                (imagen) => imagen.tipo !== "video" && !isVideoResource(imagen.imagen)
            );

            if (primeraImagen?.imagen) {
                return mediaUrl(primeraImagen.imagen, NoImage);
            }

        }


        /*
        Algunos endpoints pueden devolver
        la imagen directamente en el producto.
        */

        if (product.imagen) {
            return mediaUrl(product.imagen, NoImage);
        }

        if (product.imagen_url) {
            return mediaUrl(product.imagen_url, NoImage);
        }


        /*
        Si no existe ninguna imagen,
        mostramos NoImage.
        */

        return NoImage;

    };


    const imageUrl = getProductImage();

    /*
    ============================================================
    OBTENER VIDEO DEL PRODUCTO PARA PREVISUALIZACIÓN EN HOVER
    ============================================================
    */

    const videoUrl = useMemo(() => {
        if (!product) return null;

        // 1. Variantes
        const variantes = Array.isArray(product.variantes) ? product.variantes : [];
        for (const variante of variantes) {
            const imagenes = Array.isArray(variante.imagenes) ? variante.imagenes : [];
            const vid = imagenes.find(
                (img) => img.tipo === "video" || isVideoResource(img.imagen || img)
            );
            if (vid?.imagen) return mediaUrl(vid.imagen);
            if (vid?.url) return mediaUrl(vid.url);
        }

        // 2. Imágenes generales (productos simples)
        if (Array.isArray(product.imagenes_generales) && product.imagenes_generales.length > 0) {
            const vid = product.imagenes_generales.find(
                (img) => img.tipo === "video" || isVideoResource(img.imagen || img)
            );
            if (vid?.imagen) return mediaUrl(vid.imagen);
            if (vid?.url) return mediaUrl(vid.url);
        }

        // 3. Imágenes directas en producto
        if (Array.isArray(product.imagenes) && product.imagenes.length > 0) {
            const vid = product.imagenes.find(
                (img) => img.tipo === "video" || isVideoResource(img.imagen || img)
            );
            if (vid?.imagen) return mediaUrl(vid.imagen);
            if (vid?.url) return mediaUrl(vid.url);
        }

        // 4. Video directo
        if (product.video && isVideoResource(product.video)) return mediaUrl(product.video);
        if (product.video_url && isVideoResource(product.video_url)) return mediaUrl(product.video_url);

        return null;
    }, [product]);

    /*
    ============================================================
    ESTADOS Y MANEJADORES DE PREVISUALIZACIÓN DE VIDEO (HOVER)
    ============================================================
    */

    const videoRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [hasVideoError, setHasVideoError] = useState(false);

    const handleMouseEnter = () => {
        if (!videoUrl || hasVideoError) return;
        setIsHovered(true);
        if (videoRef.current) {
            try {
                videoRef.current.currentTime = 0;
            } catch {
                // Ignore
            }
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    // Prevenir rechazo si el usuario retira el ratón rápidamente
                });
            }
        }
    };

    const handleMouseLeave = () => {
        if (!videoUrl) return;
        setIsHovered(false);
        if (videoRef.current) {
            videoRef.current.pause();
            try {
                videoRef.current.currentTime = 0;
            } catch {
                // Ignore
            }
        }
    };


    /*
    ============================================================
    ABRIR PRODUCTO
    ============================================================
    Por defecto navega a la página de detalle propia
    (/producto/:slug). Si el consumidor pasa explícitamente
    onSelect, mantenemos compatibilidad con el modal legacy.
    ============================================================
    */

    const handleOpenProduct = () => {

        if (onSelect) {

            onSelect(product.id_producto);

            return;

        }


        if (product?.slug) {

            navigate(`/producto/${product.slug}`);

        }

    };


    /*
    ============================================================
    AGREGAR AL CARRITO
    ============================================================
    */

    const handleAddToCart = async (e) => {

        e.stopPropagation();

        if (!product || isAdding) {
            return;
        }

        setIsAdding(true);

        try {
            const variante = product.variantes?.find(
                (v) => v.stock > 0
            );

            if (!variante) {
                alert(
                    "Este producto no tiene stock disponible."
                );

                setIsAdding(false);

                return;

            }

            const imagen = getProductImage();

            const payload = {
                variante_id: variante.id_variante,
                sku: variante.sku,
                stock: variante.stock,
                producto_id: product.id_producto,
                producto_nombre: product.nombre,
                producto_slug: product.slug,
                producto_precio: product.precio,
                color: product.producto_simple ? "" : (variante.color?.nombre || ""),
                talla: product.producto_simple ? "" : (variante.talla?.nombre || ""),
                imagen,
                cantidad: 1,
            };

            const result = await addItem(payload);

            if (!result?.ok) {
                alert(
                    "No se pudo agregar al carrito. Intenta de nuevo."
                );

            }
        } catch (error) {
            console.error("Error al agregar al carrito:", error);
            alert("Error al agregar al carrito. Intenta de nuevo.");
        } finally {
            setIsAdding(false);
        }

    };


    /*
    ============================================================
    IMAGEN ROTA
    ============================================================
    */

    const handleImageError = (e) => {

        /*
        Evitamos un ciclo infinito
        si NoImage también tuviera algún problema.
        */

        if (
            e.currentTarget.src.includes("Imagen") ||
            e.currentTarget.src.includes("no-image")
        ) {

            return;

        }


        e.currentTarget.src = NoImage;

        e.currentTarget.classList.add(
            "is-fallback"
        );

    };


    /*
    ============================================================
    RENDER
    ============================================================
    */

    return (

        <article
            className={`mv-product-card ${videoUrl && !hasVideoError ? "has-video" : ""}`}
            onClick={handleOpenProduct}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >

            {/* ==================================================
                IMAGEN Y PREVISUALIZACIÓN DE VIDEO
            ================================================== */}

            <div className="mv-product-img-wrap">

                <img
                    src={imageUrl}
                    alt={product.nombre}
                    onError={handleImageError}
                    loading="lazy"
                    decoding="async"
                    className="mv-product-main-img"
                />

                {videoUrl && !hasVideoError && (
                    <>
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            className={`mv-product-video-preview ${isHovered && isVideoReady ? "is-visible" : ""}`}
                            onLoadedData={() => setIsVideoReady(true)}
                            onPlaying={() => setIsVideoReady(true)}
                            onError={() => setHasVideoError(true)}
                        />

                        <div
                            className={`mv-product-video-badge ${isHovered && isVideoReady ? "is-hovered" : ""}`}
                            title="Vista previa en video disponible"
                        >
                            <Play size={10} fill="currentColor" />
                            <span>{isHovered && isVideoReady ? "Reproduciendo" : "Video"}</span>
                        </div>
                    </>
                )}

                {/* ==================================================
                    BADGE DESCUENTO
                ================================================== */}

                {Number(product.descuento) > 0 && (

                    <span className="mv-product-badge">

                        -{product.descuento}%

                    </span>

                )}

            </div>


            {/* ==================================================
                CUERPO
            ================================================== */}

            <div className="mv-product-body">


                {/* ==================================================
                    CATEGORÍA
                ================================================== */}

                <span className="mv-product-category">

                    {product.categoria?.nombre ||
                        product.categoria ||
                        "Categoría"}

                </span>


                {/* ==================================================
                    NOMBRE
                ================================================== */}

                <h3 className="mv-product-name">

                    {product.nombre}

                </h3>


                {/* ==================================================
                    PRECIO
                ================================================== */}

                <div className="mv-product-prices">

                    {product.precio_anterior && (

                        <span className="mv-product-price-original">

                            $
                            {Number(
                                product.precio_anterior
                            ).toLocaleString("es-CO")}

                        </span>

                    )}


                    <span className="mv-product-price">

                        $
                        {Number(
                            product.precio
                        ).toLocaleString("es-CO")}

                    </span>

                </div>


                {/* ==================================================
                    BOTÓN CARRITO
                ================================================== */}

                <button
                    type="button"
                    className="mv-product-add-btn"
                    onClick={handleAddToCart}
                    disabled={isAdding}
                >

                    {isAdding ? (
                        <Spinner size={19} className="spin" />
                    ) : (
                        <ShoppingCart size={19} weight="bold" />
                    )}

                    <span>
                        {isAdding ? "Agregando..." : "Agregar al carrito"}
                    </span>

                </button>

            </div>

        </article>

    );

}


export default ProductCard;