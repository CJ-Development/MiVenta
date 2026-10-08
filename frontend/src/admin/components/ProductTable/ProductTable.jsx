import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./ProductTable.css";

import {
    Search,
    Pencil,
    Archive,
    Trash2,
    RotateCcw,
    SlidersHorizontal,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Package,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    TrendingUp,
    Loader2,
    X,
} from "lucide-react";

import {
    getProducts,
    archiveProduct,
    reactivateProduct,
    deleteProduct,
    getCategories,
} from "../../../services/adminService";

import { mediaUrl } from "../../../utils/mediaUrl";
import NoImage from "../../../assets/images/Imagen no disponible.png";

// Helper para obtener imagen representativa del producto
function obtenerPrimeraImagen(producto) {
    if (producto.imagen) {
        return mediaUrl(producto.imagen, NoImage);
    }
    for (const variant of producto.variantes || []) {
        const principal = (variant.imagenes || []).find((img) => img.principal);
        if (principal?.imagen) {
            return mediaUrl(principal.imagen, NoImage);
        }
        if (variant.imagenes?.[0]?.imagen) {
            return mediaUrl(variant.imagenes[0].imagen, NoImage);
        }
    }
    return NoImage;
}

// Helper para calcular stock total
function obtenerStock(producto) {
    if (producto.stock !== undefined && producto.stock !== null) {
        return Number(producto.stock) || 0;
    }
    if (producto.stock_total !== undefined && producto.stock_total !== null) {
        return Number(producto.stock_total) || 0;
    }
    if (Array.isArray(producto.variantes)) {
        return producto.variantes.reduce((total, variante) => {
            const stock =
                variante.stock ??
                variante.stock_actual ??
                variante.cantidad_stock ??
                variante.inventario ??
                0;
            return total + (Number(stock) || 0);
        }, 0);
    }
    return 0;
}

// Helper para desglosar Categoría padre y Subcategoría
function obtenerCategorias(producto) {
    const cat = producto.categoria;
    if (!cat) {
        return {
            padre: "SIN CATEGORÍA",
            sub: "—",
            esSinCategoria: true,
        };
    }

    if (cat.categoria_padre) {
        return {
            padre: (cat.categoria_padre.nombre || "CATEGORÍA").toUpperCase(),
            sub: cat.nombre || "—",
            esSinCategoria: false,
        };
    }

    if (cat.id_categoria_padre && cat.id_categoria_padre !== cat.id_categoria) {
        return {
            padre: (cat.nombre_padre || "CATEGORÍA").toUpperCase(),
            sub: cat.nombre || "—",
            esSinCategoria: false,
        };
    }

    return {
        padre: (cat.nombre || "CATEGORÍA").toUpperCase(),
        sub: cat.nombre || "—",
        esSinCategoria: false,
    };
}

function ProductTable({ refreshKey, onEdit }) {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtros y búsqueda
    const [busqueda, setBusqueda] = useState("");
    const [filtroCategoria, setFiltroCategoria] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("");
    const [filtroStock, setFiltroStock] = useState("");
    const [orden, setOrden] = useState("recientes");

    // Paginación
    const [pagina, setPagina] = useState(1);
    const productosPorPagina = 8;

    // Checkboxes de selección múltiple
    const [selectedIds, setSelectedIds] = useState(new Set());

    const cargar = async () => {
        try {
            setLoading(true);
            const [{ data: products }, { data: cats }] = await Promise.all([
                getProducts(),
                getCategories(),
            ]);

            setProductos(products || []);
            setCategorias(cats || []);
            setError(null);
        } catch (err) {
            console.error("Error cargando productos:", err);
            setError("No fue posible cargar el catálogo de productos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargar();
    }, [refreshKey]);

    useEffect(() => {
        setPagina(1);
    }, [busqueda, filtroCategoria, filtroEstado, filtroStock, orden]);

    // Filtrar y ordenar productos
    const productosProcesados = useMemo(() => {
        let resultado = productos.filter((producto) => {
            const text = busqueda.trim().toLowerCase();

            const coincideBusqueda =
                !text ||
                producto.nombre?.toLowerCase().includes(text) ||
                producto.slug?.toLowerCase().includes(text);

            const coincideCategoria =
                !filtroCategoria ||
                producto.categoria?.id_categoria === Number(filtroCategoria);

            const stock = obtenerStock(producto);

            let coincideEstado = true;
            if (filtroEstado === "activo") {
                coincideEstado = producto.estado === "activo";
            } else if (filtroEstado === "inactivo") {
                coincideEstado = producto.estado === "inactivo";
            } else if (filtroEstado === "archivado") {
                coincideEstado = producto.estado === "archivado";
            } else if (filtroEstado === "bajo") {
                coincideEstado = stock > 0 && stock <= 10;
            } else if (filtroEstado === "agotado") {
                coincideEstado = stock <= 0;
            }

            const coincideStock =
                !filtroStock ||
                (filtroStock === "bajo" && stock > 0 && stock <= 10) ||
                (filtroStock === "agotado" && stock <= 0);

            return (
                coincideBusqueda &&
                coincideCategoria &&
                coincideEstado &&
                coincideStock
            );
        });

        resultado = [...resultado];

        if (orden === "nombre") {
            resultado.sort((a, b) =>
                (a.nombre || "").localeCompare(b.nombre || "")
            );
        } else if (orden === "precio-menor") {
            resultado.sort((a, b) => Number(a.precio || 0) - Number(b.precio || 0));
        } else if (orden === "precio-mayor") {
            resultado.sort((a, b) => Number(b.precio || 0) - Number(a.precio || 0));
        } else if (orden === "stock-mayor") {
            resultado.sort((a, b) => obtenerStock(b) - obtenerStock(a));
        } else if (orden === "stock-menor") {
            resultado.sort((a, b) => obtenerStock(a) - obtenerStock(b));
        }

        return resultado;
    }, [productos, busqueda, filtroCategoria, filtroEstado, filtroStock, orden]);

    // Estadísticas métricas generales
    const totalProductos = productos.length;
    const totalActivos = productos.filter((p) => p.estado === "activo").length;
    const totalStockBajo = productos.filter((p) => {
        const s = obtenerStock(p);
        return s > 0 && s <= 10;
    }).length;
    const totalSinStock = productos.filter((p) => obtenerStock(p) <= 0).length;

    // Cálculo de páginas
    const totalPaginas = Math.max(
        1,
        Math.ceil(productosProcesados.length / productosPorPagina)
    );

    const productosPagina = productosProcesados.slice(
        (pagina - 1) * productosPorPagina,
        pagina * productosPorPagina
    );

    const desde =
        productosProcesados.length === 0
            ? 0
            : (pagina - 1) * productosPorPagina + 1;

    const hasta = Math.min(
        pagina * productosPorPagina,
        productosProcesados.length
    );

    const cambiarPagina = (numero) => {
        if (numero < 1 || numero > totalPaginas) return;
        setPagina(numero);
    };

    // Selección múltiple con checkbox
    const todosSeleccionados =
        productosPagina.length > 0 &&
        productosPagina.every((p) => selectedIds.has(p.id_producto));

    const toggleSelectAll = () => {
        const next = new Set(selectedIds);
        if (todosSeleccionados) {
            productosPagina.forEach((p) => next.delete(p.id_producto));
        } else {
            productosPagina.forEach((p) => next.add(p.id_producto));
        }
        setSelectedIds(next);
    };

    const toggleSelect = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    // Modal de confirmación para eliminar
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Acción de archivar o reactivar (conserva los datos sin eliminarlos)
    const handleArchive = async (producto) => {
        const isArchived = producto.estado === "archivado";
        const mensaje = isArchived
            ? `¿Deseas reactivar el producto "${producto.nombre}"?`
            : `¿Deseas archivar el producto "${producto.nombre}"? Se retirará de la tienda pero se conservará su información.`;

        if (!window.confirm(mensaje)) return;

        try {
            if (isArchived) {
                await reactivateProduct(producto.id_producto);
            } else {
                await archiveProduct(producto.id_producto);
            }
            await cargar();
        } catch (err) {
            console.error("Error al actualizar estado del producto:", err);
            alert("No fue posible actualizar el estado del producto.");
        }
    };

    // Apertura y confirmación de eliminación física mediante modal
    const abrirModalEliminar = (producto) => {
        setProductToDelete(producto);
        setDeleteModalOpen(true);
    };

    const cerrarModalEliminar = () => {
        if (isDeleting) return;
        setDeleteModalOpen(false);
        setProductToDelete(null);
    };

    const confirmarEliminar = async () => {
        if (!productToDelete) return;
        try {
            setIsDeleting(true);
            await deleteProduct(productToDelete.id_producto);
            cerrarModalEliminar();
            await cargar();
        } catch (err) {
            console.error("Error al eliminar producto:", err);
            alert(
                err?.response?.data?.detail ||
                "No fue posible eliminar el producto. Si tiene pedidos asociados, te sugerimos utilizar la opción Archivar."
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const resetearFiltros = () => {
        setBusqueda("");
        setFiltroCategoria("");
        setFiltroEstado("");
        setFiltroStock("");
        setOrden("recientes");
    };

    const hayFiltrosActivos =
        busqueda !== "" ||
        filtroCategoria !== "" ||
        filtroEstado !== "" ||
        filtroStock !== "" ||
        orden !== "recientes";

    if (loading && productos.length === 0) {
        return (
            <div className="product-table-loading-screen">
                <Loader2 size={32} className="spin" />
                <p>Cargando catálogo de productos...</p>
            </div>
        );
    }

    if (error && productos.length === 0) {
        return (
            <div className="product-table-error-state">
                <AlertTriangle size={24} />
                <p>{error}</p>
                <button type="button" onClick={cargar}>Reintentar</button>
            </div>
        );
    }

    return (
        <div className="product-table-wrapper">
            {/* =========================================================
                1. FILA DE 4 TARJETAS KPI DE RESUMEN (MOCKUP EXACTO)
            ========================================================= */}
            <div className="product-kpi-cards-grid">
                {/* 1. PRODUCTOS */}
                <div
                    className={`product-kpi-card purple ${!filtroStock && !filtroEstado ? "active-filter" : ""}`}
                    onClick={() => {
                        setFiltroStock("");
                        setFiltroEstado("");
                    }}
                    title="Ver todos los productos registrados"
                >
                    <div className="kpi-card-main">
                        <div className="kpi-icon-box purple">
                            <Package size={20} strokeWidth={2.2} />
                        </div>
                        <div className="kpi-info">
                            <strong className="kpi-number">{totalProductos}</strong>
                            <span className="kpi-title">Productos</span>
                            <small className="kpi-sub">Total registrados</small>
                        </div>
                    </div>
                    <div className="kpi-trend-box purple">
                        <TrendingUp size={16} />
                    </div>
                </div>

                {/* 2. ACTIVOS */}
                <div
                    className={`product-kpi-card green ${filtroEstado === "activo" ? "active-filter" : ""}`}
                    onClick={() => setFiltroEstado(filtroEstado === "activo" ? "" : "activo")}
                    title="Filtrar productos activos"
                >
                    <div className="kpi-card-main">
                        <div className="kpi-icon-box green">
                            <CheckCircle2 size={20} strokeWidth={2.2} />
                        </div>
                        <div className="kpi-info">
                            <strong className="kpi-number">{totalActivos}</strong>
                            <span className="kpi-title">Activos</span>
                            <small className="kpi-sub">Productos publicados</small>
                        </div>
                    </div>
                    <div className="kpi-trend-box green">
                        <TrendingUp size={16} />
                    </div>
                </div>

                {/* 3. BAJO STOCK */}
                <div
                    className={`product-kpi-card amber ${filtroStock === "bajo" ? "active-filter" : ""}`}
                    onClick={() => setFiltroStock(filtroStock === "bajo" ? "" : "bajo")}
                    title="Filtrar productos con menos de 10 unidades"
                >
                    <div className="kpi-card-main">
                        <div className="kpi-icon-box amber">
                            <AlertTriangle size={20} strokeWidth={2.2} />
                        </div>
                        <div className="kpi-info">
                            <strong className="kpi-number">{totalStockBajo}</strong>
                            <span className="kpi-title">Bajo stock</span>
                            <small className="kpi-sub">Menos de 10 unidades</small>
                        </div>
                    </div>
                    <div className="kpi-trend-box amber">
                        <TrendingUp size={16} />
                    </div>
                </div>

                {/* 4. SIN STOCK */}
                <div
                    className={`product-kpi-card pink ${filtroStock === "agotado" ? "active-filter" : ""}`}
                    onClick={() => setFiltroStock(filtroStock === "agotado" ? "" : "agotado")}
                    title="Filtrar productos agotados"
                >
                    <div className="kpi-card-main">
                        <div className="kpi-icon-box pink">
                            <XCircle size={20} strokeWidth={2.2} />
                        </div>
                        <div className="kpi-info">
                            <strong className="kpi-number">{totalSinStock}</strong>
                            <span className="kpi-title">Sin stock</span>
                            <small className="kpi-sub">Agotados</small>
                        </div>
                    </div>
                    <div className="kpi-trend-box pink">
                        <TrendingUp size={16} />
                    </div>
                </div>
            </div>

            {/* =========================================================
                2. TOOLBAR DE BÚSQUEDA Y FILTROS
            ========================================================= */}
            <div className="products-table-toolbar">
                {/* Buscador expandido a la izquierda */}
                <div className="products-search-pill-box">
                    <Search size={16} className="search-pill-icon" />
                    <input
                        type="text"
                        placeholder="Buscar productos..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                {/* Filtros desplegables a la derecha */}
                <div className="products-filters-group">
                    {/* Dropdown Categoría */}
                    <div className="filter-select-pill">
                        <select
                            value={filtroCategoria}
                            onChange={(e) => setFiltroCategoria(e.target.value)}
                        >
                            <option value="">Todas las categorías</option>
                            {categorias.map((cat) => (
                                <option key={cat.id_categoria} value={cat.id_categoria}>
                                    {cat.nombre}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="select-pill-arrow" />
                    </div>

                    {/* Dropdown Estado */}
                    <div className="filter-select-pill">
                        <select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                        >
                            <option value="">Todos los estados</option>
                            <option value="activo">Activo</option>
                            <option value="bajo">Bajo stock</option>
                            <option value="agotado">Sin stock</option>
                            <option value="inactivo">Inactivo</option>
                            <option value="archivado">Archivado</option>
                        </select>
                        <ChevronDown size={14} className="select-pill-arrow" />
                    </div>

                    {/* Dropdown Ordenar por */}
                    <div className="filter-select-pill sort-pill">
                        <ArrowUpDown size={13} className="sort-icon-prefix" />
                        <select
                            value={orden}
                            onChange={(e) => setOrden(e.target.value)}
                        >
                            <option value="recientes">Ordenar por</option>
                            <option value="nombre">Nombre (A-Z)</option>
                            <option value="precio-menor">Precio menor</option>
                            <option value="precio-mayor">Precio mayor</option>
                            <option value="stock-mayor">Mayor stock</option>
                            <option value="stock-menor">Menor stock</option>
                        </select>
                        <ChevronDown size={14} className="select-pill-arrow" />
                    </div>

                    {/* Botón Filtros / Reset */}
                    <button
                        type="button"
                        className={`filter-reset-pill-btn ${hayFiltrosActivos ? "has-filters" : ""}`}
                        onClick={resetearFiltros}
                        title={hayFiltrosActivos ? "Limpiar todos los filtros" : "Filtros de catálogo"}
                    >
                        <SlidersHorizontal size={14} />
                        <span>Filtros</span>
                        {hayFiltrosActivos && <span className="filter-active-dot" />}
                    </button>
                </div>
            </div>

            {/* =========================================================
                3. TABLA DE PRODUCTOS CON ENCABEZADO MORADO REAL
            ========================================================= */}
            <div className="products-table-responsive">
                <table className="products-styled-table">
                    <thead>
                        <tr className="table-purple-header-row">
                            <th className="th-col-check">
                                <input
                                    type="checkbox"
                                    className="custom-table-checkbox"
                                    checked={todosSeleccionados}
                                    onChange={toggleSelectAll}
                                    aria-label="Seleccionar todos los productos de la página"
                                />
                            </th>
                            <th className="th-col-product">
                                <div className="th-sort-wrapper">
                                    <ArrowUpDown size={12} />
                                    <span>Producto</span>
                                </div>
                            </th>
                            <th className="th-col-category">Categoría / Subcategoría</th>
                            <th className="th-col-price">Precio</th>
                            <th className="th-col-stock">Stock</th>
                            <th className="th-col-status">Estado</th>
                            <th className="th-col-actions">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {productosPagina.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="products-table-empty-row">
                                    <div className="table-empty-message">
                                        <Package size={36} />
                                        <h4>No se encontraron productos</h4>
                                        <p>Intenta ajustar la búsqueda o los filtros seleccionados.</p>
                                        {hayFiltrosActivos && (
                                            <button
                                                type="button"
                                                className="btn-clear-table-filters"
                                                onClick={resetearFiltros}
                                            >
                                                Restablecer filtros
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            productosPagina.map((producto) => {
                                const imagenSrc = obtenerPrimeraImagen(producto);
                                const stock = obtenerStock(producto);
                                const { padre, sub, esSinCategoria } = obtenerCategorias(producto);
                                const isSelected = selectedIds.has(producto.id_producto);

                                // Nivel de stock y barra de progreso
                                let stockClass = "stock-good";
                                let stockBarFill = "bar-good";
                                let statusPillClass = "status-active";
                                let statusLabel = "Activo";

                                if (stock <= 0) {
                                    stockClass = "stock-empty";
                                    stockBarFill = "bar-empty";
                                    statusPillClass = "status-empty";
                                    statusLabel = "Sin stock";
                                } else if (stock <= 10) {
                                    stockClass = "stock-low";
                                    stockBarFill = "bar-low";
                                    statusPillClass = "status-low";
                                    statusLabel = "Bajo stock";
                                }

                                if (producto.estado === "inactivo") {
                                    statusPillClass = "status-inactive";
                                    statusLabel = "Inactivo";
                                } else if (producto.estado === "archivado") {
                                    statusPillClass = "status-archived";
                                    statusLabel = "Archivado";
                                }

                                const progressWidth = Math.min(
                                    100,
                                    Math.max(6, Math.round((stock / 100) * 100))
                                );

                                return (
                                    <tr
                                        key={producto.id_producto}
                                        className={`product-row ${isSelected ? "row-selected" : ""}`}
                                    >
                                        {/* 1. CHECKBOX */}
                                        <td className="td-col-check">
                                            <input
                                                type="checkbox"
                                                className="custom-table-checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(producto.id_producto)}
                                                aria-label={`Seleccionar ${producto.nombre}`}
                                            />
                                        </td>

                                        {/* 2. PRODUCTO: IMAGEN + NOMBRE + SKU */}
                                        <td className="td-col-product">
                                            <div className="product-media-group">
                                                <div className="product-thumb-box">
                                                    <img
                                                        src={imagenSrc}
                                                        alt={producto.nombre}
                                                        onError={(e) => {
                                                            e.currentTarget.src = NoImage;
                                                        }}
                                                    />
                                                </div>
                                                <div className="product-text-details">
                                                    <strong className="product-table-name">
                                                        {producto.nombre}
                                                    </strong>
                                                    <span className="product-table-sku">
                                                        SKU: {producto.slug || `PRO-${producto.id_producto}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 3. CATEGORÍA / SUBCATEGORÍA */}
                                        <td className="td-col-category">
                                            <div className="category-meta-block">
                                                <span
                                                    className={`category-pill-badge ${esSinCategoria ? "badge-no-cat" : "badge-cat-purple"}`}
                                                >
                                                    {padre}
                                                </span>
                                                <span className="subcategory-label">{sub}</span>
                                            </div>
                                        </td>

                                        {/* 4. PRECIO */}
                                        <td className="td-col-price">
                                            <strong className="product-price-highlight">
                                                ${Number(producto.precio || 0).toLocaleString("es-CO")}
                                            </strong>
                                        </td>

                                        {/* 5. STOCK CON TEXTO Y BARRA DE PROGRESO */}
                                        <td className="td-col-stock">
                                            <div className="stock-meter-block">
                                                <span className={`stock-units-text ${stockClass}`}>
                                                    {stock} uds
                                                </span>
                                                <div className="stock-progress-track">
                                                    <div
                                                        className={`stock-progress-fill ${stockBarFill}`}
                                                        style={{ width: `${progressWidth}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* 6. ESTADO */}
                                        <td className="td-col-status">
                                            <span className={`product-status-pill ${statusPillClass}`}>
                                                <span className="status-dot">●</span>
                                                <span>{statusLabel}</span>
                                            </span>
                                        </td>

                                        {/* 7. ACCIONES: EDITAR, ARCHIVAR, ELIMINAR */}
                                        <td className="td-col-actions">
                                            <div className="table-actions-cluster">
                                                <button
                                                    type="button"
                                                    className="action-icon-pill-btn edit"
                                                    title="Editar producto"
                                                    onClick={() => onEdit(producto)}
                                                    aria-label="Editar"
                                                >
                                                    <Pencil size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className={`action-icon-pill-btn ${producto.estado === "archivado" ? "reactivate" : "archive"}`}
                                                    title={
                                                        producto.estado === "archivado"
                                                            ? "Reactivar producto"
                                                            : "Archivar producto"
                                                    }
                                                    onClick={() => handleArchive(producto)}
                                                    aria-label={producto.estado === "archivado" ? "Reactivar" : "Archivar"}
                                                >
                                                    {producto.estado === "archivado" ? (
                                                        <RotateCcw size={15} />
                                                    ) : (
                                                        <Archive size={15} />
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    className="action-icon-pill-btn delete"
                                                    title="Eliminar producto"
                                                    onClick={() => abrirModalEliminar(producto)}
                                                    aria-label="Eliminar"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* =========================================================
                4. FOOTER / PAGINACIÓN
            ========================================================= */}
            <div className="products-table-footer">
                <span className="results-counter-text">
                    Mostrando <strong>{desde}-{hasta}</strong> de <strong>{productosProcesados.length}</strong> productos
                </span>

                <div className="table-pagination-controls">
                    <button
                        type="button"
                        className="pagination-arrow-btn"
                        disabled={pagina === 1}
                        onClick={() => cambiarPagina(pagina - 1)}
                        title="Página anterior"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                        <button
                            key={num}
                            type="button"
                            className={`pagination-number-btn ${pagina === num ? "active" : ""}`}
                            onClick={() => cambiarPagina(num)}
                        >
                            {num}
                        </button>
                    ))}

                    <button
                        type="button"
                        className="pagination-arrow-btn"
                        disabled={pagina === totalPaginas}
                        onClick={() => cambiarPagina(pagina + 1)}
                        title="Página siguiente"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* =========================================================
                5. MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE PRODUCTO
            ========================================================= */}
            {deleteModalOpen && productToDelete &&
                createPortal(
                    <div className="modal-overlay" onClick={cerrarModalEliminar}>
                        <div
                            className="cat-delete-modal-card"
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="modal-delete-title"
                        >
                            <div className="modal-danger-header">
                                <div className="danger-icon-box">
                                    <Trash2 size={22} />
                                </div>
                                <div>
                                    <h3 id="modal-delete-title">Eliminar producto</h3>
                                    <p>Esta acción retirará el producto del catálogo</p>
                                </div>
                                <button
                                    type="button"
                                    className="modal-close-icon"
                                    onClick={cerrarModalEliminar}
                                    aria-label="Cerrar ventana"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="modal-danger-body">
                                <p className="warning-text">
                                    ¿Estás seguro de que deseas eliminar permanentemente el producto{" "}
                                    <strong>"{productToDelete.nombre}"</strong>?
                                </p>
                                <div className="warning-banner">
                                    <AlertTriangle size={18} />
                                    <span>
                                        Esta acción eliminará físicamente el producto y sus datos asociados.
                                        Si deseas retirarlo temporalmente de la venta sin perder el historial,
                                        puedes utilizar la opción <strong>Archivar</strong>.
                                    </span>
                                </div>
                                <div className="modal-btn-row">
                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={cerrarModalEliminar}
                                        disabled={isDeleting}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        className="danger-btn"
                                        onClick={confirmarEliminar}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? "Eliminando..." : "Confirmar eliminación"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}

export default ProductTable;