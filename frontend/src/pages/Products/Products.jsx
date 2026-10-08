import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
    SlidersHorizontal,
    X,
    ChevronDown,
    Search,
    Flame,
    Percent,
    RotateCcw,
    Layers,
} from "lucide-react";

import ProductCard from "./ProductCard/ProductCard";
import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";

import { getCategories, getProducts } from "../../services/adminService";
import { getOffers } from "../../services/clientService";
import SEO from "../../components/SEO/SEO";
import "./Products.css";


const prettifySlug = (s) => {
    if (!s) return "";

    return s
        .split("-")
        .map((w) =>
            w
                ? w[0].toUpperCase() + w.slice(1)
                : w
        )
        .join(" ");
};


function Products() {

    const navigate = useNavigate();
    const params = useParams();

    const [searchParams, setSearchParams] =
        useSearchParams();

    const query =
        searchParams.get("q") || "";

    const categoriaParam =
        searchParams.get("categoria") || "";

    const soloOfertas =
        searchParams.get("oferta") === "1";

    const slug =
        params.slug || "";


    /* =========================================================
       ESTADOS
    ========================================================= */

    const [productos, setProductos] =
        useState([]);

    const [categorias, setCategorias] =
        useState([]);

    const [ofertas, setOfertas] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [unknownSlug, setUnknownSlug] =
        useState(false);

    const [filtrosAbiertos, setFiltrosAbiertos] =
        useState(false);

    const [categoriasExpandidas, setCategoriasExpandidas] =
        useState(true);

    const [categoriasAcordeon, setCategoriasAcordeon] =
        useState({});


    /* =========================================================
       FILTROS
    ========================================================= */

    const [busqueda, setBusqueda] =
        useState(query);

    const [categoria, setCategoria] =
        useState(categoriaParam);

    const [precioMin, setPrecioMin] =
        useState("");

    const [precioMax, setPrecioMax] =
        useState("");

    const [soloConDescuento, setSoloConDescuento] =
        useState(soloOfertas);

    const [orden, setOrden] =
        useState("relevancia");

    const [tendencia, setTendencia] =
        useState(false);

    const highlightParam =
        searchParams.get("highlight") || "";


    /* =========================================================
       CARGAR PRODUCTOS
    ========================================================= */

    useEffect(() => {

        const controller =
            new AbortController();

        const cargar = async () => {

            try {

                setLoading(true);

                const [
                    prodRes,
                    catRes,
                    ofRes
                ] = await Promise.all([

                    getProducts({
                        signal: controller.signal,
                        tendencia: tendencia
                    }),

                    getCategories({
                        signal: controller.signal
                    }),

                    getOffers({
                        signal: controller.signal
                    }).catch(() => ({
                        data: []
                    })),

                ]);


                const productosData =
                    prodRes?.data || [];

                const categoriasData =
                    catRes?.data || [];

                const ofertasData =
                    ofRes?.data || [];


                setProductos(
                    Array.isArray(productosData)
                        ? productosData.filter(
                            (p) =>
                                p.estado === "activo"
                        )
                        : []
                );


                setCategorias(
                    Array.isArray(categoriasData)
                        ? categoriasData
                        : []
                );


                setOfertas(
                    Array.isArray(ofertasData)
                        ? ofertasData
                        : []
                );

            } catch (error) {

                if (
                    error?.name !== "CanceledError" &&
                    error?.code !== "ERR_CANCELED"
                ) {

                    console.error(
                        "Error cargando productos:",
                        error
                    );

                }

            } finally {

                setLoading(false);

            }

        };


        cargar();


        return () => {
            controller.abort();
        };

    }, [tendencia]);


    /* =========================================================
       RESOLVER SLUG
    ========================================================= */

    useEffect(() => {

        if (loading) return;

        if (!slug) {

            setUnknownSlug(false);

            return;
        }


        const match =
            categorias.find(
                (c) =>
                    c.slug === slug || String(c.id_categoria) === slug
            );


        if (match) {

            setCategoria(
                String(match.id_categoria)
            );

            setUnknownSlug(false);

        } else {

            setCategoria("");

            setUnknownSlug(true);

        }

    }, [
        slug,
        categorias,
        loading
    ]);


    /* =========================================================
       RESOLVER HIGHLIGHT DESDE HERO
    ========================================================= */

    useEffect(() => {

        if (loading || !highlightParam) return;

        const categoriasMap = {
            "family": ["Hombre", "Mujeres", "Niños", "Mascotas"],
            "toys": ["Tecnología", "Juguetes"],
            "accessories": ["Accesorios"]
        };

        const categoriasAHiglight = categoriasMap[highlightParam];

        if (!categoriasAHiglight) return;

        const categoriasIds = categorias
            .filter(cat => categoriasAHiglight.includes(cat.nombre))
            .map(cat => String(cat.id_categoria));

        if (categoriasIds.length > 0) {
            setCategoria(categoriasIds[0]);
        } else {
            // Si no se encuentran categorías por nombre, intentar por slug
            const slugMap = {
                "family": ["hombre", "mujeres", "ninos", "mascotas"],
                "toys": ["tecnologia", "juguetes"],
                "accessories": ["accesorios"]
            };
            const slugsToMatch = slugMap[highlightParam];
            if (slugsToMatch) {
                const matchedBySlug = categorias
                    .filter(cat => slugsToMatch.includes(cat.slug?.toLowerCase()))
                    .map(cat => String(cat.id_categoria));
                if (matchedBySlug.length > 0) {
                    setCategoria(matchedBySlug[0]);
                }
            }
        }

    }, [
        highlightParam,
        categorias,
        loading
    ]);


    /* =========================================================
       SINCRONIZAR URL
    ========================================================= */

    useEffect(() => {

        setBusqueda(query);

    }, [query]);


    useEffect(() => {

        if (slug) return;

        setCategoria(categoriaParam);

    }, [
        categoriaParam,
        slug
    ]);


    useEffect(() => {

        setSoloConDescuento(
            soloOfertas
        );

    }, [soloOfertas]);


    // Sincronizar filtros con URL en tiempo real
    useEffect(() => {

        const params = new URLSearchParams();

        if (busqueda.trim()) {
            params.set("q", busqueda.trim());
        }

        if (categoria) {
            params.set("categoria", categoria);
        }

        if (soloConDescuento) {
            params.set("oferta", "1");
        }

        if (tendencia) {
            params.set("tendencia", "1");
        }

        setSearchParams(params);

    }, [busqueda, categoria, soloConDescuento, tendencia]);


    /* =========================================================
       CATEGORÍAS PADRE
       - Solo las que no tienen padre.
       - Excluimos las archivadas para no mostrarlas en el sidebar.
    ========================================================= */

    const categoriasPadres = useMemo(() => {

        return (categorias || []).filter(
            (cat) =>
                !cat.categoria_padre_id &&
                !cat.categoria_padre &&
                cat.estado !== "archivado"
        );

    }, [categorias]);

    const conteoPorCategoria = useMemo(() => {
        const counts = {};
        (productos || []).forEach((p) => {
            const catId =
                p.categoria?.id_categoria ||
                p.categoria_id ||
                (typeof p.categoria === "number" || typeof p.categoria === "string"
                    ? p.categoria
                    : null);
            if (catId != null) {
                counts[String(catId)] = (counts[String(catId)] || 0) + 1;
            }
        });
        return counts;
    }, [productos]);

    const getCategoryTotalCount = (cat) => {
        if (!cat) return 0;
        let total = conteoPorCategoria[String(cat.id_categoria)] || 0;
        if (Array.isArray(cat.subcategorias)) {
            cat.subcategorias.forEach((sub) => {
                total += conteoPorCategoria[String(sub.id_categoria)] || 0;
                if (Array.isArray(sub.subcategorias)) {
                    sub.subcategorias.forEach((subsub) => {
                        total += conteoPorCategoria[String(subsub.id_categoria)] || 0;
                    });
                }
            });
        }
        return total;
    };


    /* =========================================================
       PRODUCTOS EN OFERTA
    ========================================================= */

    const productosEnOferta =
        useMemo(() => {

            const ids = new Set();

            (ofertas || []).forEach((oferta) => {
                if (oferta.activa === false) return;

                const id =
                    oferta.producto?.id_producto ||
                    oferta.producto_detalle?.id_producto ||
                    oferta.id_producto ||
                    oferta.producto_id ||
                    null;

                if (id) {
                    ids.add(id);
                }

                // Categorías de la oferta
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

                if (catIdsOferta.size > 0 && Array.isArray(productos)) {
                    productos.forEach((p) => {
                        const cId = p.categoria?.id_categoria;
                        const pId = p.categoria?.id_categoria_padre || p.categoria?.categoria_padre?.id_categoria;
                        if ((cId && catIdsOferta.has(cId)) || (pId && catIdsOferta.has(pId))) {
                            ids.add(p.id_producto);
                        }
                    });
                }
            });

            return ids;

        }, [ofertas, productos]);


    /* =========================================================
       DESCUENTO
    ========================================================= */

    const descuentoPorProducto =
        useMemo(() => {

            const map = new Map();

            (ofertas || []).forEach((oferta) => {
                if (oferta.activa === false) return;

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

                const valor = Number(
                    oferta.porcentaje ||
                    oferta.valor ||
                    oferta.descuento ||
                    0
                );

                if (valor <= 0) return;

                const idsAfectados = new Set();
                if (idDirecto) idsAfectados.add(idDirecto);

                if (catIdsOferta.size > 0 && Array.isArray(productos)) {
                    productos.forEach((p) => {
                        const cId = p.categoria?.id_categoria;
                        const pId = p.categoria?.id_categoria_padre || p.categoria?.categoria_padre?.id_categoria;
                        if ((cId && catIdsOferta.has(cId)) || (pId && catIdsOferta.has(pId))) {
                            idsAfectados.add(p.id_producto);
                        }
                    });
                }

                idsAfectados.forEach((prodId) => {
                    const prodObj = (productos || []).find((p) => p.id_producto === prodId);
                    const original = Number(
                        prodObj?.precio ??
                        oferta.producto_detalle?.precio ??
                        oferta.producto?.precio ??
                        0
                    );

                    let porcentaje = 0;
                    if (oferta.tipo_descuento === "porcentaje" || (!oferta.tipo_descuento && valor <= 100)) {
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

        }, [ofertas, productos]);


    /* =========================================================
       FILTRAR PRODUCTOS
    ========================================================= */

    const productosFiltrados =
        useMemo(() => {

            let lista =
                [...productos];


            /* BUSQUEDA */

            if (busqueda.trim()) {

                const texto =
                    busqueda
                        .toLowerCase()
                        .trim();


                lista =
                    lista.filter(
                        (producto) =>
                            (
                                producto.nombre ||
                                ""
                            )
                                .toLowerCase()
                                .includes(texto)
                    );

            }


            /* CATEGORIA
               - Si la categoría seleccionada es padre, también
                 mostramos los productos de sus subcategorías.
               - Si es hija, solo esa. */

            if (categoria) {

                const idCategoria =
                    Number(categoria);


                // IDs de la categoría seleccionada + sus descendientes
                const idsValidos = new Set([idCategoria]);

                categoriasPadres.forEach((padre) => {

                    if (padre.id_categoria === idCategoria) {

                        (padre.subcategorias || []).forEach((sub) => {

                            if (sub.estado !== "archivado") {

                                idsValidos.add(
                                    Number(sub.id_categoria)
                                );

                            }

                        });

                    }

                });


                lista =
                    lista.filter(
                        (producto) => {

                            // NUEVO: Usar categorias (múltiples) en lugar de categoria (única)
                            const productoCategoriaIds = producto.categorias?.map(c => Number(c.id_categoria)) ||
                                                           (producto.categoria?.id_categoria ? [Number(producto.categoria.id_categoria)] : []) ||
                                                           [];

                            // Verificar si el producto pertenece a alguna de las categorías válidas
                            return productoCategoriaIds.some(id => idsValidos.has(id));

                        }
                    );

            }


            /* PRECIO MINIMO */

            if (
                precioMin !== "" &&
                !Number.isNaN(
                    Number(precioMin)
                )
            ) {

                lista =
                    lista.filter(
                        (producto) =>
                            Number(
                                producto.precio
                            ) >=
                            Number(precioMin)
                    );

            }


            /* PRECIO MAXIMO */

            if (
                precioMax !== "" &&
                !Number.isNaN(
                    Number(precioMax)
                )
            ) {

                lista =
                    lista.filter(
                        (producto) =>
                            Number(
                                producto.precio
                            ) <=
                            Number(precioMax)
                    );

            }


            /* OFERTAS */

            if (soloConDescuento) {

                lista =
                    lista.filter(
                        (producto) =>
                            productosEnOferta.has(
                                producto.id_producto
                            ) ||
                            (
                                producto.descuento &&
                                Number(
                                    producto.descuento
                                ) > 0
                            )
                    );

            }


            /* ORDEN */

            switch (orden) {

                case "precio-asc":

                    lista.sort(
                        (a, b) =>
                            Number(a.precio) -
                            Number(b.precio)
                    );

                    break;


                case "precio-desc":

                    lista.sort(
                        (a, b) =>
                            Number(b.precio) -
                            Number(a.precio)
                    );

                    break;


                case "nombre":

                    lista.sort(
                        (a, b) =>
                            (
                                a.nombre || ""
                            ).localeCompare(
                                b.nombre || ""
                            )
                    );

                    break;


                default:
                    break;

            }


            return lista;

        }, [
            productos,
            busqueda,
            categoria,
            precioMin,
            precioMax,
            soloConDescuento,
            productosEnOferta,
            orden,
            categoriasPadres,
        ]);


    /* =========================================================
       FILTROS
    ========================================================= */

    const aplicarFiltros = () => {

        const params =
            new URLSearchParams();


        if (busqueda.trim()) {

            params.set(
                "q",
                busqueda.trim()
            );

        }


        if (categoria) {

            params.set(
                "categoria",
                categoria
            );

        }


        if (soloConDescuento) {

            params.set(
                "oferta",
                "1"
            );

        }


        setSearchParams(params);

        setFiltrosAbiertos(false);

    };


    const limpiarFiltros = () => {

        setBusqueda("");

        setCategoria("");

        setPrecioMin("");

        setPrecioMax("");

        setSoloConDescuento(false);

        setOrden("relevancia");

        setSearchParams({});

        setFiltrosAbiertos(false);

    };


    const hayFiltrosActivos =
        Boolean(
            busqueda ||
            categoria ||
            precioMin ||
            precioMax ||
            soloConDescuento ||
            orden !== "relevancia"
        );


    /* =========================================================
       TITULO
    ========================================================= */

    const tituloProductos =
        query
            ? `Resultados para "${query}"`
            : categoria
                ? (
                    categorias.find(
                        (c) =>
                            String(
                                c.id_categoria
                            ) ===
                            String(categoria)
                    )?.nombre ||
                    "Productos"
                )
                : "Todos los productos";


    /* =========================================================
       SEO DINÁMICO
    ========================================================= */

    const seoConfig = useMemo(() => {
        const hasQueryParams = query || categoria || soloConDescuento || tendencia;
        const currentPath = window.location.pathname;

        // Detectar tipo de ruta
        const isHombre = currentPath === "/hombre";
        const isMujer = currentPath === "/mujer";
        const isNino = currentPath === "/nino";
        const isCategoria = currentPath.startsWith("/categoria/");
        const isProducts = currentPath === "/products";

        let title = "Catálogo de Productos";
        let description = "Descubre todos los productos en MiVenta. Explora nuestra amplia colección de moda, ropa deportiva y ofertas exclusivas con envíos a toda Colombia.";
        let path = currentPath;
        let noindex = false;

        if (isHombre) {
            title = "Moda para Hombre";
            description = "Explora nuestra colección de moda masculina y ropa deportiva para hombre en MiVenta. Encuentra prendas con estilo, comodidad y calidad garantizada.";
            path = "/hombre";
        } else if (isMujer) {
            title = "Moda para Mujer";
            description = "Descubre las últimas tendencias en moda femenina y ropa deportiva para mujer en MiVenta. Prendas exclusivas, calidad y envíos a todo el país.";
            path = "/mujer";
        } else if (isNino) {
            title = "Moda Infantil";
            description = "Explora nuestra colección de moda infantil y ropa para niños en MiVenta. Comodidad, durabilidad y estilo para los más pequeños.";
            path = "/nino";
        } else if (isCategoria && slug) {
            const catActual = categorias.find(
                (c) => c.slug === slug || String(c.id_categoria) === slug
            );
            if (catActual) {
                title = catActual.nombre;
                description = `Descubre nuestra colección de ${catActual.nombre} en MiVenta. Encuentra los mejores productos, calidad y precios en esta categoría.`;
                path = `/categoria/${catActual.slug}`;
            }
        } else if (isProducts) {
            title = "Catálogo de Productos";
            description = "Descubre todos los productos en MiVenta. Explora nuestra colección de moda, ropa deportiva y promociones con envío rápido a toda Colombia.";
            path = "/products";
        }

        // Si hay query parameters, noindex pero canonical a la base
        if (hasQueryParams) {
            noindex = true;
            // Forzar canonical a la URL base sin parámetros
            if (isHombre) {
                path = "/hombre";
            } else if (isMujer) {
                path = "/mujer";
            } else if (isNino) {
                path = "/nino";
            } else if (isCategoria && slug) {
                const catActual = categorias.find(
                    (c) => c.slug === slug || String(c.id_categoria) === slug
                );
                if (catActual) {
                    path = `/categoria/${catActual.slug}`;
                }
            } else {
                path = "/products";
            }
        }

        return { title, description, path, noindex };
    }, [query, categoria, soloConDescuento, tendencia, slug, categorias]);


    /* =========================================================
       PANEL DE FILTROS
    ========================================================= */

    const panelFiltros = (
        <aside className="products-sidebar">
            {/* ENCABEZADO */}
            <div className="sidebar-header-box">
                <div className="sidebar-title-row">
                    <div className="sidebar-title-group">
                        <SlidersHorizontal size={18} className="sidebar-header-icon" />
                        <h3>Filtros</h3>
                    </div>

                    {hayFiltrosActivos && (
                        <button
                            type="button"
                            className="sidebar-clear-btn"
                            onClick={limpiarFiltros}
                            title="Restablecer todos los filtros"
                        >
                            <RotateCcw size={13} />
                            <span>Limpiar</span>
                        </button>
                    )}
                </div>
            </div>

            {/* SWITCHES MODERNOS */}
            <div className="sidebar-group sidebar-toggles-group">
                <label className="sidebar-toggle-card">
                    <div className="sidebar-toggle-label">
                        <Flame size={16} className="toggle-icon toggle-icon--flame" />
                        <span className="toggle-text">En tendencia</span>
                    </div>
                    <div className="modern-switch">
                        <input
                            type="checkbox"
                            checked={tendencia}
                            onChange={(e) => setTendencia(e.target.checked)}
                        />
                        <span className="modern-slider" />
                    </div>
                </label>

                <label className="sidebar-toggle-card">
                    <div className="sidebar-toggle-label">
                        <Percent size={15} className="toggle-icon toggle-icon--discount" />
                        <span className="toggle-text">Solo con descuento</span>
                    </div>
                    <div className="modern-switch">
                        <input
                            type="checkbox"
                            checked={soloConDescuento}
                            onChange={(e) => setSoloConDescuento(e.target.checked)}
                        />
                        <span className="modern-slider" />
                    </div>
                </label>
            </div>

            <div className="sidebar-divider" />

            {/* BUSCADOR */}
            <div className="sidebar-group">
                <span className="sidebar-group-title">Buscar</span>
                <div className="sidebar-search-box">
                    <Search size={15} className="sidebar-search-icon" />
                    <input
                        className="sidebar-search-input"
                        type="text"
                        placeholder="¿Qué buscas?..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                    {busqueda && (
                        <button
                            type="button"
                            className="sidebar-search-clear"
                            onClick={() => setBusqueda("")}
                            aria-label="Borrar búsqueda"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            <div className="sidebar-divider" />

            {/* PRECIO */}
            <div className="sidebar-group">
                <div className="sidebar-price-header">
                    <span className="sidebar-group-title">Rango de precio</span>
                    {(precioMin || precioMax) && (
                        <button
                            type="button"
                            className="sidebar-price-reset"
                            onClick={() => {
                                setPrecioMin("");
                                setPrecioMax("");
                            }}
                        >
                            Borrar
                        </button>
                    )}
                </div>

                <div className="sidebar-price-inputs">
                    <div className="sidebar-price-input-wrapper">
                        <span className="price-prefix">$</span>
                        <input
                            type="number"
                            min="0"
                            placeholder="Mínimo"
                            value={precioMin}
                            onChange={(e) => setPrecioMin(e.target.value)}
                        />
                    </div>
                    <span className="price-separator">—</span>
                    <div className="sidebar-price-input-wrapper">
                        <span className="price-prefix">$</span>
                        <input
                            type="number"
                            min="0"
                            placeholder="Máximo"
                            value={precioMax}
                            onChange={(e) => setPrecioMax(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="sidebar-divider" />

            {/* CATEGORÍAS */}
            <div className="sidebar-group">
                <div className="sidebar-section-header">
                    <div className="sidebar-title-group">
                        <Layers size={16} className="sidebar-header-icon" />
                        <span className="sidebar-group-title">Categorías</span>
                    </div>

                    <button
                        type="button"
                        className="sidebar-toggle-categories"
                        onClick={() => setCategoriasExpandidas(!categoriasExpandidas)}
                        aria-label={categoriasExpandidas ? "Ocultar categorías" : "Mostrar categorías"}
                    >
                        <ChevronDown
                            size={16}
                            className={`category-chevron ${categoriasExpandidas ? "category-chevron--expanded" : ""}`}
                        />
                    </button>
                </div>

                {categoriasExpandidas && (
                    <div className="sidebar-categories-list">
                        <button
                            type="button"
                            className={`category-pill ${!categoria ? "active" : ""}`}
                            onClick={() => {
                                setCategoria("");
                                navigate("/products");
                            }}
                        >
                            <span className="category-pill-name">Todos los productos</span>
                            <span className="category-pill-badge">{productos.length}</span>
                        </button>

                        {categoriasPadres.map((padre) => {
                            const subcats = (padre.subcategorias || []).filter(
                                (s) => s.estado !== "archivado"
                            );
                            const isPadreActive = String(categoria) === String(padre.id_categoria);
                            const isExpanded = categoriasAcordeon[padre.id_categoria] || false;
                            const hasSubcats = subcats.length > 0;
                            const padreCount = getCategoryTotalCount(padre);

                            return (
                                <div key={padre.id_categoria} className="category-group">
                                    <button
                                        type="button"
                                        className={`category-pill ${isPadreActive ? "active" : ""}`}
                                        onClick={() => {
                                            if (hasSubcats) {
                                                setCategoriasAcordeon((prev) => ({
                                                    ...prev,
                                                    [padre.id_categoria]: !isExpanded,
                                                }));
                                            }
                                            if (padre.slug) {
                                                navigate(`/categoria/${padre.slug}`);
                                            } else {
                                                setCategoria(String(padre.id_categoria));
                                            }
                                        }}
                                    >
                                        <span className="category-pill-name">{padre.nombre}</span>
                                        <div className="category-pill-meta">
                                            {padreCount > 0 && (
                                                <span className="category-pill-badge">{padreCount}</span>
                                            )}
                                            {hasSubcats && (
                                                <ChevronDown
                                                    size={13}
                                                    className={`category-subchevron ${
                                                        isExpanded ? "category-subchevron--expanded" : ""
                                                    }`}
                                                />
                                            )}
                                        </div>
                                    </button>

                                    {hasSubcats && isExpanded && (
                                        <div className="category-sublist">
                                            {subcats.map((sub) => {
                                                const isSubActive = String(categoria) === String(sub.id_categoria);
                                                const subSubcats = (sub.subcategorias || []).filter(
                                                    (ss) => ss.estado !== "archivado"
                                                );
                                                const hasSubSubcats = subSubcats.length > 0;
                                                const isSubExpanded = categoriasAcordeon[sub.id_categoria] || false;
                                                const subCount = getCategoryTotalCount(sub);

                                                return (
                                                    <div key={sub.id_categoria} className="category-subgroup">
                                                        <button
                                                            type="button"
                                                            className={`category-subpill ${isSubActive ? "active" : ""}`}
                                                            onClick={() => {
                                                                if (hasSubSubcats) {
                                                                    setCategoriasAcordeon((prev) => ({
                                                                        ...prev,
                                                                        [sub.id_categoria]: !isSubExpanded,
                                                                    }));
                                                                }
                                                                if (sub.slug) {
                                                                    navigate(`/categoria/${sub.slug}`);
                                                                } else {
                                                                    setCategoria(String(sub.id_categoria));
                                                                }
                                                            }}
                                                        >
                                                            <span className="category-subpill-name">{sub.nombre}</span>
                                                            <div className="category-pill-meta">
                                                                {subCount > 0 && (
                                                                    <span className="category-pill-badge">{subCount}</span>
                                                                )}
                                                                {hasSubSubcats && (
                                                                    <ChevronDown
                                                                        size={12}
                                                                        className={`category-subchevron ${
                                                                            isSubExpanded ? "category-subchevron--expanded" : ""
                                                                        }`}
                                                                    />
                                                                )}
                                                            </div>
                                                        </button>

                                                        {hasSubSubcats && isSubExpanded && (
                                                            <div className="category-subsublist">
                                                                {subSubcats.map((subSub) => {
                                                                    const isSubSubActive =
                                                                        String(categoria) === String(subSub.id_categoria);
                                                                    return (
                                                                        <button
                                                                            key={subSub.id_categoria}
                                                                            type="button"
                                                                            className={`category-subsubpill ${
                                                                                isSubSubActive ? "active" : ""
                                                                            }`}
                                                                            onClick={() => {
                                                                                if (subSub.slug) {
                                                                                    navigate(`/categoria/${subSub.slug}`);
                                                                                } else {
                                                                                    setCategoria(String(subSub.id_categoria));
                                                                                }
                                                                            }}
                                                                        >
                                                                            {subSub.nombre}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </aside>
    );


    /* =========================================================
       RENDER
    ========================================================= */

    /* =========================================================
       BREADCRUMB
    ========================================================= */

    const breadcrumbItems = useMemo(() => {

        const items = [
            {
                label: "Productos",
                to: "/products"
            }
        ];


        if (categoria) {

            const catActual =
                categorias.find(
                    (c) =>
                        String(
                            c.id_categoria
                        ) ===
                        String(categoria)
                );


            if (catActual) {

                if (
                    catActual.categoria_padre_id ||
                    catActual.categoria_padre
                ) {

                    const padre =
                        categorias.find(
                            (c) =>
                                String(
                                    c.id_categoria
                                ) ===
                                String(
                                    catActual.categoria_padre_id ||
                                    catActual.categoria_padre
                                )
                        );


                    if (padre) {

                        items.push({
                            label: padre.nombre,
                            to: `/categoria/${padre.slug}`
                        });

                    }

                }


                items.push({
                    label: catActual.nombre
                });

            }

        }


        if (query) {

            items.push({
                label: `Resultados: "${query}"`
            });

        }


        return items;

    }, [
        categorias,
        categoria,
        query
    ]);


    return (

        <main className="products-page">

            <SEO
                title={seoConfig.title}
                description={seoConfig.description}
                path={seoConfig.path}
                noindex={seoConfig.noindex}
            />

            <div className="products-container">


                {/* =================================================
                    BREADCRUMB
                ================================================= */}

                <Breadcrumb items={breadcrumbItems} />


                {/* =================================================
                    CONTENIDO PRINCIPAL
                ================================================= */}

                <div className="products-layout">


                    {panelFiltros}


                    <section className="products-content">


                        {/* =========================================
                            HEADER
                        ========================================= */}

                        <header className="products-header">

                            <div className="products-heading">

                                <h1>
                                    {tituloProductos}
                                </h1>


                                <p>
                                    Explora nuestro
                                    catálogo completo
                                    y encuentra lo
                                    que buscas.
                                </p>

                            </div>


                            <div className="products-toolbar">


                                <button
                                    type="button"
                                    className="mobile-filter-button"
                                    onClick={() =>
                                        setFiltrosAbiertos(
                                            true
                                        )
                                    }
                                >

                                    <SlidersHorizontal
                                        size={17}
                                    />

                                    Filtros

                                </button>


                                <div className="products-count">

                                    Mostrando{" "}
                                    <strong>
                                        {productosFiltrados.length}
                                    </strong>{" "}
                                    de{" "}
                                    <strong>
                                        {productos.length}
                                    </strong>{" "}
                                    productos

                                </div>


                                <div className="products-sort">

                                    <span>
                                        Ordenar
                                    </span>

                                    <select
                                        value={orden}
                                        onChange={(e) => {
                                            const valor = e.target.value;
                                            setOrden(valor);
                                            if (valor === "tendencia") {
                                                setTendencia(true);
                                            } else {
                                                setTendencia(false);
                                            }
                                        }}
                                    >

                                        <option value="relevancia">
                                            Relevancia
                                        </option>

                                        <option value="tendencia">
                                            Tendencia
                                        </option>

                                        <option value="precio-asc">
                                            Precio menor
                                        </option>

                                        <option value="precio-desc">
                                            Precio mayor
                                        </option>

                                        <option value="nombre">
                                            Nombre A-Z
                                        </option>

                                    </select>

                                    <ChevronDown
                                        size={15}
                                    />

                                </div>

                            </div>

                        </header>


                        {/* =========================================
                            PRODUCTOS
                        ========================================= */}

                        {loading ? (

                            <div className="products-message">

                                <div className="loading-spinner" />

                                <p>
                                    Cargando productos...
                                </p>

                            </div>

                        ) : unknownSlug ? (

                            <div className="products-empty">

                                <h3>
                                    No encontramos{" "}
                                    "{prettifySlug(slug)}"
                                </h3>

                                <p>
                                    La categoría que
                                    buscas no existe
                                    o ya no está
                                    disponible.
                                </p>

                                <Link
                                    to="/products"
                                    className="empty-action"
                                >
                                    Ver todos los productos
                                </Link>

                            </div>

                        ) : productosFiltrados.length === 0 ? (

                            <div className="products-empty">

                                <h3>
                                    No encontramos
                                    productos
                                </h3>

                                <p>
                                    Prueba ajustando
                                    los filtros o
                                    usando otras
                                    palabras clave.
                                </p>

                                <button
                                    type="button"
                                    onClick={
                                        limpiarFiltros
                                    }
                                    className="empty-action"
                                >
                                    Limpiar filtros
                                </button>

                            </div>

                        ) : (

                            <div className="products-grid">

                                {productosFiltrados.map(
                                    (producto) => (

                                        <ProductCard
                                            key={
                                                producto.id_producto
                                            }

                                            product={{
                                                ...producto,

                                                descuento:
                                                    descuentoPorProducto.get(
                                                        producto.id_producto
                                                    ) ||
                                                    producto.descuento ||
                                                    0
                                            }}
                                        />

                                    )
                                )}

                            </div>

                        )}


                        {/*
                            PAGINACIÓN
                            — Deshabilitada temporalmente.
                            — El backend aún no pagina; cuando
                              lo haga se reactiva con la cantidad
                              real de páginas.
                        */}

                    </section>

                </div>

            </div>


            {/* =====================================================
                MODAL FILTROS MOBILE
            ===================================================== */}

            {filtrosAbiertos && (

                <div
                    className="filters-modal"
                    onClick={() =>
                        setFiltrosAbiertos(false)
                    }
                >

                    <div
                        className="filters-modal-inner"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        <div className="filters-modal-head">

                            <h3>
                                Filtros
                            </h3>

                            <button
                                type="button"
                                onClick={() =>
                                    setFiltrosAbiertos(
                                        false
                                    )
                                }
                                aria-label="Cerrar filtros"
                            >
                                <X size={21} />
                            </button>

                        </div>


                        {panelFiltros}


                        <div className="filters-modal-footer">

                            <button
                                type="button"
                                className="filters-modal-clear"
                                onClick={limpiarFiltros}
                            >
                                Limpiar
                            </button>

                            <button
                                type="button"
                                className="filters-modal-apply"
                                onClick={() => {
                                    aplicarFiltros();
                                    setFiltrosAbiertos(false);
                                }}
                            >
                                Aplicar filtros
                            </button>

                        </div>

                    </div>

                </div>

            )}


            {/* =====================================================
                DETALLE PRODUCTO
            ===================================================== */}

        </main>

    );
}


export default Products;