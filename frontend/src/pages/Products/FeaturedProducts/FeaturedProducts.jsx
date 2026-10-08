    import { useEffect, useMemo, useState, useRef } from "react";
    import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

    import { getProducts } from "../../../services/adminService";
    import { getOffers } from "../../../services/clientService";

    import ProductCard from "../ProductCard/ProductCard";
    import ProductDetail from "../ProductDetail/ProductDetail";

    import "./FeaturedProducts.css";


    function FeaturedProducts() {

        const [products, setProducts] = useState([]);
        const [offers, setOffers] = useState([]);

        const [loading, setLoading] = useState(true);

        const [selectedProductId, setSelectedProductId] = useState(null);

        const viewportRef = useRef(null);
        const [viewportWidth, setViewportWidth] = useState(0);
        const [canScrollPrev, setCanScrollPrev] = useState(false);
        const [canScrollNext, setCanScrollNext] = useState(false);


        /*
        ============================================================
        CARGAR PRODUCTOS + OFERTAS
        ------------------------------------------------------------
        Traemos también las ofertas para calcular el descuento que
        se muestra en cada ProductCard (mismo patrón que Products.jsx).
        ============================================================
        */

        const loadProducts = async () => {

            try {

                const [prodRes, ofRes] = await Promise.all([

                    getProducts(),

                    // Si falla el endpoint de ofertas, seguimos mostrando
                    // productos sin descuento en vez de romper la home.
                    getOffers().catch(() => ({ data: [] })),

                ]);


                const activeProducts = Array.isArray(prodRes?.data)
                    ? prodRes.data.filter(
                        (product) => product.estado === "activo"
                    )
                    : [];

                setProducts(activeProducts);
                setOffers(Array.isArray(ofRes?.data) ? ofRes.data : []);

            } catch (error) {

                console.error(
                    "Error cargando productos destacados:",
                    error
                );

                setProducts([]);
                setOffers([]);

            } finally {

                setLoading(false);

            }

        };


        useEffect(() => {

            loadProducts();

        }, []);


        /*
        ============================================================
        DESCUENTO POR PRODUCTO
        ------------------------------------------------------------
        Solo consideramos ofertas vigentes (activa + ventana de
        fechas) y calculamos el porcentaje equivalente cuando el
        descuento es de tipo fijo, para que el badge siempre diga -X%.
        ============================================================
        */

        const descuentoPorProducto = useMemo(() => {

            const map = new Map();
            const ahora = Date.now();

            (offers || []).forEach((oferta) => {

                if (oferta.activa === false) return;

                const tsInicio = oferta.fecha_inicio
                    ? new Date(oferta.fecha_inicio).getTime()
                    : null;
                const tsFin = oferta.fecha_fin
                    ? new Date(oferta.fecha_fin).getTime()
                    : null;

                if (tsInicio !== null && Number.isNaN(tsInicio)) return;
                if (tsFin !== null && Number.isNaN(tsFin)) return;
                if (tsInicio !== null && ahora < tsInicio) return;
                if (tsFin !== null && ahora > tsFin) return;

                const idDirecto =
                    oferta.producto?.id_producto ||
                    oferta.producto_detalle?.id_producto ||
                    oferta.id_producto ||
                    oferta.producto_id ||
                    null;

                const catIdsOferta = new Set();
                if (Array.isArray(oferta.categorias_detalle)) {
                    oferta.categorias_detalle.forEach((c) => catIdsOferta.add(c.id_categoria));
                }
                if (Array.isArray(oferta.categorias)) {
                    oferta.categorias.forEach((c) => catIdsOferta.add(typeof c === "object" ? c.id_categoria : c));
                }
                if (Array.isArray(oferta.categorias_ids)) {
                    oferta.categorias_ids.forEach((cId) => catIdsOferta.add(cId));
                }

                const valor = Number(oferta.valor);
                if (!Number.isFinite(valor) || valor <= 0) return;

                // Identificar todos los productos a los que aplica esta oferta
                const idsAfectados = new Set();
                if (idDirecto) idsAfectados.add(idDirecto);

                if (catIdsOferta.size > 0 && Array.isArray(products)) {
                    products.forEach((p) => {
                        const cId = p.categoria?.id_categoria;
                        const pId = p.categoria?.id_categoria_padre || p.categoria?.categoria_padre?.id_categoria;
                        if ((cId && catIdsOferta.has(cId)) || (pId && catIdsOferta.has(pId))) {
                            idsAfectados.add(p.id_producto);
                        }
                    });
                }

                idsAfectados.forEach((prodId) => {
                    const prodObj = (products || []).find((p) => p.id_producto === prodId);
                    const original = Number(
                        prodObj?.precio ??
                        oferta.producto_detalle?.precio ??
                        oferta.producto?.precio ??
                        0
                    );

                    let porcentaje = 0;
                    if (oferta.tipo_descuento === "porcentaje") {
                        porcentaje = Math.round(valor);
                    } else if (original > 0) {
                        porcentaje = Math.round((valor / original) * 100);
                    }

                    if (porcentaje > 0) {
                        const actual = map.get(prodId);
                        if (!actual || porcentaje > actual) {
                            map.set(prodId, porcentaje);
                        }
                    }
                });

            });

            return map;

        }, [offers]);


        /*
        ============================================================
        PRODUCTOS CON DESCUENTO
        ------------------------------------------------------------
        Ordenamos los productos para mostrar primero los que tienen
        oferta activa y luego el resto, igual que hace /products.
        ============================================================
        */

        const productosOrdenados = useMemo(() => {

            return [...products].sort((a, b) => {

                const aDesc = descuentoPorProducto.get(a.id_producto) || 0;
                const bDesc = descuentoPorProducto.get(b.id_producto) || 0;

                return bDesc - aDesc;

            });

        }, [products, descuentoPorProducto]);


        /*
        ============================================================
        GESTIÓN DEL CARRUSEL (SCROLL & ESTADO DE BOTONES)
        ============================================================
        */

        const checkScrollButtons = () => {
            if (!viewportRef.current) return;
            const { scrollLeft, scrollWidth, clientWidth } = viewportRef.current;
            setCanScrollPrev(scrollLeft > 6);
            setCanScrollNext(scrollLeft + clientWidth < scrollWidth - 6);
        };

        const handleScroll = (direction) => {
            if (!viewportRef.current) return;
            const viewport = viewportRef.current;

            // Desplaza según el ancho visible del viewport (4 tarjetas en desktop)
            const scrollAmount = viewport.clientWidth;
            const delta = direction === "prev" ? -scrollAmount : scrollAmount;

            viewport.scrollBy({
                left: delta,
                behavior: "smooth",
            });
        };

        useEffect(() => {
            const updateWidth = () => {
                if (viewportRef.current) {
                    setViewportWidth(viewportRef.current.clientWidth);
                    checkScrollButtons();
                }
            };

            updateWidth();
            const timer1 = setTimeout(updateWidth, 100);
            const timer2 = setTimeout(updateWidth, 400);

            window.addEventListener("resize", updateWidth);
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                window.removeEventListener("resize", updateWidth);
            };
        }, [productosOrdenados, loading]);


        /*
        ============================================================
        RENDER
        ============================================================
        */

        return (

            <section className="featured-products">

                {/* ==================================================
                    ENCABEZADO CENTRADO — "ROPA EN TENDENCIA"
                ================================================== */}

                <div className="featured-header-centered">

                    <h2>
                        ROPA EN TENDENCIA
                    </h2>

                </div>


                {/* ==================================================
                    CARGANDO
                ================================================== */}

                {loading && (

                    <div className="products-message">

                        <span className="products-loader"></span>

                        <p>
                            Cargando productos...
                        </p>

                    </div>

                )}


                {/* ==================================================
                    SIN PRODUCTOS
                ================================================== */}

                {!loading && productosOrdenados.length === 0 && (

                    <div className="products-message">

                        <p>
                            No hay productos registrados.
                        </p>

                    </div>

                )}


                {/* ==================================================
                    PRODUCTOS (CARRUSEL DE 4 CENTRADO CON FLECHAS)
                ================================================== */}

                {!loading && productosOrdenados.length > 0 && (

                    <div
                        className="featured-carousel-container"
                        style={{
                            "--carousel-vp-width": viewportWidth
                                ? `${viewportWidth}px`
                                : "100cqw",
                        }}
                    >

                        {/* Flecha izquierda */}
                        <button
                            type="button"
                            className="featured-nav-btn featured-nav-prev"
                            onClick={() => handleScroll("prev")}
                            disabled={!canScrollPrev}
                            aria-label="Ver productos anteriores"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        {/* Viewport del carrusel */}
                        <div
                            className="featured-carousel-viewport"
                            ref={viewportRef}
                            onScroll={checkScrollButtons}
                        >

                            <div
                                className={`featured-carousel-track ${
                                    productosOrdenados.length < 4
                                        ? "is-centered"
                                        : ""
                                }`}
                            >

                                {productosOrdenados.map((product) => (

                                    <div
                                        key={product.id_producto}
                                        className="featured-carousel-item"
                                    >

                                        <ProductCard
                                            product={{
                                                ...product,
                                                descuento:
                                                    descuentoPorProducto.get(
                                                        product.id_producto
                                                    ) ||
                                                    product.descuento ||
                                                    0,
                                            }}
                                        />

                                    </div>

                                ))}

                            </div>

                        </div>

                        {/* Flecha derecha */}
                        <button
                            type="button"
                            className="featured-nav-btn featured-nav-next"
                            onClick={() => handleScroll("next")}
                            disabled={!canScrollNext}
                            aria-label="Ver siguientes productos"
                        >
                            <ChevronRight size={24} />
                        </button>

                    </div>

                )}


                {/* ==================================================
                    ACCESO AL CATÁLOGO COMPLETO
                ================================================== */}

                {!loading && productosOrdenados.length > 0 && (

                    <div className="featured-footer-action">

                        <a
                            href="/products"
                            className="featured-view-all-link"
                        >
                            Ver todos los productos
                            <ArrowRight size={18} />
                        </a>

                    </div>

                )}


                {/* ==================================================
                    MODAL PRODUCTO
                ================================================== */}

                {selectedProductId !== null && (

                    <ProductDetail
                        productId={selectedProductId}
                        onClose={() =>
                            setSelectedProductId(null)
                        }
                    />

                )}

            </section>

        );

    }


    export default FeaturedProducts;
