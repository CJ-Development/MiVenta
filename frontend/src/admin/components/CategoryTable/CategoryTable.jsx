import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
    getCategories,
    getProducts,
    archiveCategory,
    deleteCategory,
    reactivateCategory
} from "../../../services/adminService";

import {
    ChevronDown,
    ChevronRight,
    Folder,
    FolderOpen,
    FolderTree,
    FolderPlus,
    Package,
    EyeOff,
    Search,
    SlidersHorizontal,
    Pencil,
    Archive,
    Trash2,
    RefreshCw,
    RotateCcw,
    AlertTriangle,
    X
} from "lucide-react";

import "./CategoryTable.css";

function CategoryTable({ refreshKey, onEdit, onAddSubcategory }) {
    const [categorias, setCategorias] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Búsqueda y filtros
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [sortBy, setSortBy] = useState("order");

    // Categorías expandidas
    const [expanded, setExpanded] = useState(new Set());

    // Modal de eliminación en 2 pasos
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteStep, setDeleteStep] = useState(1);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [deleteNameInput, setDeleteNameInput] = useState("");

    // Cargar categorías y productos
    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [catRes, prodRes] = await Promise.all([
                getCategories(),
                getProducts().catch(() => ({ data: [] }))
            ]);

            const cats = catRes.data || [];
            const prods = Array.isArray(prodRes.data)
                ? prodRes.data
                : prodRes.data?.results || [];

            setCategorias(cats);
            setProducts(prods);
            setError(null);

            // Expandir por defecto las categorías principales que tengan hijos
            const initiallyExpanded = new Set();
            cats.forEach((cat) => {
                const parentId = cat.id_categoria_padre ?? cat.categoria_padre?.id_categoria ?? cat.categoria_padre_id;
                if (!parentId) {
                    initiallyExpanded.add(cat.id_categoria);
                }
            });
            setExpanded(initiallyExpanded);
        } catch (err) {
            console.error("Error al cargar categorías:", err);
            setError("No fue posible cargar las categorías del servidor.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [refreshKey]);

    // Helpers de relaciones de árbol
    const getParentId = (categoria) => {
        if (!categoria) return null;
        return (
            categoria.id_categoria_padre ??
            categoria.categoria_padre?.id_categoria ??
            categoria.categoria_padre_id ??
            null
        );
    };

    const getChildren = (parentId) => {
        return categorias
            .filter((cat) => Number(getParentId(cat)) === Number(parentId))
            .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    };

    const hasChildren = (categoria) => {
        return getChildren(categoria.id_categoria).length > 0;
    };

    const toggleCategory = (id) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Productos y precio promedio por categoría
    const getCategoryDirectProducts = (catId) => {
        return products.filter((p) => {
            if (p.categoria_id && Number(p.categoria_id) === Number(catId)) return true;
            if (p.categoria?.id_categoria && Number(p.categoria.id_categoria) === Number(catId)) return true;
            if (p.categorias_ids && Array.isArray(p.categorias_ids) && p.categorias_ids.map(Number).includes(Number(catId))) return true;
            if (p.categorias && Array.isArray(p.categorias) && p.categorias.some((c) => Number(c.id_categoria) === Number(catId))) return true;
            return false;
        });
    };

    const getFamilyProducts = (categoria) => {
        const familyIds = [categoria.id_categoria];
        const collectChildren = (parentId) => {
            const children = getChildren(parentId);
            children.forEach((c) => {
                familyIds.push(c.id_categoria);
                collectChildren(c.id_categoria);
            });
        };
        collectChildren(categoria.id_categoria);

        return products.filter((p) => {
            const pCatId = Number(p.categoria_id || p.categoria?.id_categoria);
            if (familyIds.includes(pCatId)) return true;
            if (p.categorias_ids && p.categorias_ids.some((id) => familyIds.includes(Number(id)))) return true;
            if (p.categorias && p.categorias.some((c) => familyIds.includes(Number(c.id_categoria)))) return true;
            return false;
        });
    };


    // Estadísticas para las 4 KPI Cards
    const kpiStats = useMemo(() => {
        const main = categorias.filter((c) => !getParentId(c)).length;
        const sub = categorias.filter((c) => Boolean(getParentId(c))).length;
        const total = categorias.length;
        const inactive = categorias.filter((c) => c.estado !== "activo").length;

        return { main, sub, total, inactive };
    }, [categorias]);

    // Filtrado y ordenamiento de categorías principales
    const categoriasPrincipalesFiltradas = useMemo(() => {
        let roots = categorias.filter((c) => !getParentId(c));

        // Filtro por tipo o estado
        if (typeFilter === "main") {
            // Ya son roots
        } else if (typeFilter === "active") {
            roots = roots.filter((c) => c.estado === "activo");
        } else if (typeFilter === "inactive") {
            roots = roots.filter((c) => c.estado !== "activo");
        } else if (typeFilter === "sub") {
            // Mostrar categorías con subcategorías
            roots = roots.filter((c) => hasChildren(c));
        }

        // Filtro por búsqueda
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            roots = roots.filter((c) => {
                const matchRoot =
                    (c.nombre && c.nombre.toLowerCase().includes(q)) ||
                    (c.descripcion && c.descripcion.toLowerCase().includes(q));
                const children = getChildren(c.id_categoria);
                const matchChild = children.some(
                    (child) =>
                        (child.nombre && child.nombre.toLowerCase().includes(q)) ||
                        (child.descripcion && child.descripcion.toLowerCase().includes(q))
                );
                return matchRoot || matchChild;
            });
        }

        // Ordenamiento
        const sorted = [...roots];
        if (sortBy === "name_asc") {
            sorted.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
        } else if (sortBy === "name_desc") {
            sorted.sort((a, b) => (b.nombre || "").localeCompare(a.nombre || ""));
        } else if (sortBy === "products_desc") {
            sorted.sort((a, b) => getFamilyProducts(b).length - getFamilyProducts(a).length);
        } else {
            sorted.sort((a, b) => (a.orden || 0) - (b.orden || 0));
        }

        return sorted;
    }, [categorias, typeFilter, searchQuery, sortBy, products]);

    // Acciones de categoría
    const handleToggleArchiveCat = async (cat) => {
        const isArchived = cat.estado === "archivado";
        try {
            if (isArchived) {
                await reactivateCategory(cat.id_categoria);
            } else {
                await archiveCategory(cat.id_categoria, { cascade: true });
            }
            await cargarDatos();
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.detail || "No fue posible actualizar el estado de la categoría.");
        }
    };

    const eliminarCategoria = (id, nombre) => {
        setCategoryToDelete({ id, nombre: nombre || "esta categoría" });
        setDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setDeleteModalOpen(false);
        setCategoryToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!categoryToDelete) return;
        const { id, nombre } = categoryToDelete;
        closeDeleteModal();

        try {
            await deleteCategory(id, nombre);
            await cargarDatos();
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.detail || "Ocurrió un error al eliminar la categoría. Si tiene productos asociados, te sugerimos archivarla.");
        }
    };

    if (loading) {
        return (
            <div className="category-loading-container">
                <div className="cat-spinner" />
                <p>Cargando panel de categorías...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="category-error-container">
                <AlertTriangle size={32} color="#dc2626" />
                <h3>Error al cargar</h3>
                <p>{error}</p>
                <button className="new-category-btn" onClick={cargarDatos}>
                    <RefreshCw size={16} />
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="category-panel-wrapper">
            {/* =========================================================
               1. ROW DE 4 KPI CARDS RESUMEN
               ========================================================= */}
            <div className="category-kpi-grid">
                {/* CARD 1: CATEGORÍAS PRINCIPALES */}
                <div className="category-kpi-card">
                    <div className="kpi-icon-box purple">
                        <Folder size={22} />
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-number">{kpiStats.main}</span>
                        <strong className="kpi-label">Categorías principales</strong>
                        <small className="kpi-sublabel">Estructura general de la tienda</small>
                    </div>
                </div>

                {/* CARD 2: SUBCATEGORÍAS (ACENTO ROSA SUAVE) */}
                <div className="category-kpi-card pink-accent">
                    <div className="kpi-icon-box pink">
                        <FolderTree size={22} />
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-number">{kpiStats.sub}</span>
                        <strong className="kpi-label">Subcategorías</strong>
                        <small className="kpi-sublabel">Categorías secundarias</small>
                    </div>
                </div>

                {/* CARD 3: TOTAL CATEGORÍAS */}
                <div className="category-kpi-card">
                    <div className="kpi-icon-box violet">
                        <Package size={22} />
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-number">{kpiStats.total}</span>
                        <strong className="kpi-label">Total categorías</strong>
                        <small className="kpi-sublabel">Incluyendo subcategorías</small>
                    </div>
                </div>

                {/* CARD 4: CATEGORÍAS INACTIVAS */}
                <div className="category-kpi-card">
                    <div className="kpi-icon-box slate">
                        <EyeOff size={22} />
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-number">{kpiStats.inactive}</span>
                        <strong className="kpi-label">Categorías inactivas</strong>
                        <small className="kpi-sublabel">No visibles en la tienda</small>
                    </div>
                </div>
            </div>

            {/* =========================================================
               2. CONTENEDOR PRINCIPAL BLANCO: TABLA Y HERRAMIENTAS
               ========================================================= */}
            <div className="category-main-card">
                {/* TOOLBAR SUPERIOR CON BÚSQUEDA Y FILTROS */}
                <div className="category-toolbar">
                    <div className="category-search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar categorías..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="search-clear-btn"
                                onClick={() => setSearchQuery("")}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="category-filter-actions">
                        <div className="cat-select-wrapper">
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="cat-select"
                            >
                                <option value="all">Todas las categorías</option>
                                <option value="main">Solo categorías principales</option>
                                <option value="sub">Con subcategorías</option>
                                <option value="active">Solo activas</option>
                                <option value="inactive">Solo inactivas</option>
                            </select>
                            <ChevronDown size={14} className="cat-select-chevron" />
                        </div>

                        <div className="cat-select-wrapper">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="cat-select"
                            >
                                <option value="order">Ordenar por</option>
                                <option value="name_asc">Nombre (A-Z)</option>
                                <option value="name_desc">Nombre (Z-A)</option>
                                <option value="products_desc">Más productos</option>
                            </select>
                            <ChevronDown size={14} className="cat-select-chevron" />
                        </div>

                        <button
                            type="button"
                            className="cat-filter-btn"
                            title="Opciones adicionales de filtro"
                            onClick={() => {
                                // Toggle entre filtro todas o inactivas
                                setTypeFilter((prev) => (prev === "inactive" ? "all" : "inactive"));
                            }}
                        >
                            <SlidersHorizontal size={15} />
                            <span>Filtros</span>
                        </button>
                    </div>
                </div>

                {/* CABECERA DE LA TABLA */}
                <div className="category-table-header">
                    <div className="col-cat">Categoría / Subcategoría</div>
                    <div className="col-prod">Productos</div>
                    <div className="col-status">Estado</div>
                    <div className="col-actions">Acciones</div>
                </div>

                {/* LISTA JERÁRQUICA DE CATEGORÍAS */}
                {categoriasPrincipalesFiltradas.length === 0 ? (
                    <div className="category-empty-state">
                        <Folder size={36} color="#94a3b8" />
                        <h4>No se encontraron categorías</h4>
                        <p>
                            {searchQuery
                                ? `No hay resultados para "${searchQuery}". Intenta con otro término de búsqueda.`
                                : "Crea tu primera categoría para organizar los productos de tu catálogo."}
                        </p>
                    </div>
                ) : (
                    <div className="category-tree-list">
                        {categoriasPrincipalesFiltradas.map((cat) => {
                            const isExpanded = expanded.has(cat.id_categoria);
                            const children = getChildren(cat.id_categoria);
                            const canExpand = children.length > 0;
                            const directProducts = getCategoryDirectProducts(cat.id_categoria);
                            const familyProducts = getFamilyProducts(cat);

                            return (
                                <div key={cat.id_categoria} className="category-tree-block">
                                    {/* FILA DE CATEGORÍA PRINCIPAL */}
                                    <div className={`category-row ${isExpanded ? "expanded" : ""}`}>
                                        {/* COLUMNA 1: CHEVRON, ICONO, NOMBRE Y DESCRIPCIÓN */}
                                        <div className="col-cat cat-left-info">
                                            {canExpand ? (
                                                <button
                                                    type="button"
                                                    className="cat-expand-toggle"
                                                    onClick={() => toggleCategory(cat.id_categoria)}
                                                    aria-label={isExpanded ? "Colapsar" : "Expandir"}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown size={17} />
                                                    ) : (
                                                        <ChevronRight size={17} />
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="cat-expand-spacer" />
                                            )}

                                            <div className="cat-folder-box">
                                                {isExpanded && canExpand ? (
                                                    <FolderOpen size={20} color="#6A2CA0" />
                                                ) : (
                                                    <Folder size={20} color="#6A2CA0" />
                                                )}
                                            </div>

                                            <div className="cat-titles">
                                                <span className="cat-name">{cat.nombre}</span>
                                                <span className="cat-desc">
                                                    {cat.descripcion || `Categoría principal de ${cat.nombre}.`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* COLUMNA 2: PRODUCTOS / SUBCATEGORÍAS */}
                                        <div className="col-prod">
                                            <div className="cat-subcat-counter-wrap">
                                                <strong className="subcat-count-text">
                                                    {children.length}{" "}
                                                    {children.length === 1 ? "subcategoría" : "subcategorías"}
                                                </strong>
                                                {canExpand && (
                                                    <div className="subcat-preview-pills">
                                                        {children.slice(0, 3).map((child) => (
                                                            <span key={child.id_categoria} className="subcat-pill">
                                                                {child.nombre}
                                                            </span>
                                                        ))}
                                                        {children.length > 3 && (
                                                            <span className="subcat-pill more">
                                                                +{children.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* COLUMNA 3: ESTADO */}
                                        <div className="col-status">
                                            <span
                                                className={`cat-status-badge ${
                                                    cat.estado === "activo" ? "active" : "inactive"
                                                }`}
                                            >
                                                <span className="status-dot" />
                                                {cat.estado === "activo" ? "Activa" : "Inactiva"}
                                            </span>
                                        </div>

                                        {/* COLUMNA 5: ACCIONES */}
                                        <div className="col-actions">
                                            <div className="cat-action-group">
                                                <button
                                                    type="button"
                                                    className="cat-action-btn edit"
                                                    onClick={() => onEdit(cat)}
                                                    title="Editar categoría"
                                                >
                                                    <Pencil size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className={`cat-action-btn ${cat.estado === "archivado" ? "reactivate" : "archive"}`}
                                                    onClick={() => handleToggleArchiveCat(cat)}
                                                    title={cat.estado === "archivado" ? "Reactivar categoría" : "Archivar categoría"}
                                                >
                                                    {cat.estado === "archivado" ? <RotateCcw size={15} /> : <Archive size={15} />}
                                                </button>

                                                <button
                                                    type="button"
                                                    className="cat-action-btn delete"
                                                    onClick={() => eliminarCategoria(cat.id_categoria, cat.nombre)}
                                                    title="Eliminar categoría"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* HIJOS (SUBCATEGORÍAS INDENTADAS DENTRO DE LA TARJETA) */}
                                    {isExpanded && canExpand && (
                                        <div className="category-children-container">
                                            {children.map((child) => {
                                                const childProducts = getCategoryDirectProducts(child.id_categoria);

                                                return (
                                                    <div key={child.id_categoria} className="subcategory-card-row">
                                                        <div className="col-cat cat-left-info">
                                                            <div className="cat-folder-box sub">
                                                                <Folder size={18} color="#6A2CA0" />
                                                            </div>
                                                            <div className="cat-titles">
                                                                <span className="cat-name">{child.nombre}</span>
                                                                <span className="cat-desc">
                                                                    {child.descripcion || `Subcategoría de ${cat.nombre}.`}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="col-prod">
                                                            <strong className="subcat-count-text">
                                                                {childProducts.length}{" "}
                                                                {childProducts.length === 1 ? "producto" : "productos"}
                                                            </strong>
                                                        </div>

                                                        <div className="col-status">
                                                            <span
                                                                className={`cat-status-badge ${
                                                                    child.estado === "activo" ? "active" : "inactive"
                                                                }`}
                                                            >
                                                                <span className="status-dot" />
                                                                {child.estado === "activo" ? "Activa" : "Inactiva"}
                                                            </span>
                                                        </div>

                                                        <div className="col-actions">
                                                            <div className="cat-action-group">
                                                                <button
                                                                    type="button"
                                                                    className="cat-action-btn edit"
                                                                    onClick={() => onEdit(child)}
                                                                    title="Editar subcategoría"
                                                                >
                                                                    <Pencil size={15} />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className={`cat-action-btn ${child.estado === "archivado" ? "reactivate" : "archive"}`}
                                                                    onClick={() => handleToggleArchiveCat(child)}
                                                                    title={child.estado === "archivado" ? "Reactivar subcategoría" : "Archivar subcategoría"}
                                                                >
                                                                    {child.estado === "archivado" ? <RotateCcw size={15} /> : <Archive size={15} />}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="cat-action-btn delete"
                                                                    onClick={() =>
                                                                        eliminarCategoria(child.id_categoria, child.nombre)
                                                                    }
                                                                    title="Eliminar subcategoría"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </div>
                                                        </div>
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

                {/* PAGINACIÓN INFERIOR */}
                <div className="category-pagination">
                    <span className="pagination-info">
                        Mostrando 1-{categoriasPrincipalesFiltradas.length} de {kpiStats.main} categorías
                    </span>

                    <div className="pagination-controls">
                        <button type="button" className="pag-btn" disabled>
                            ‹
                        </button>
                        <button type="button" className="pag-btn active">
                            1
                        </button>
                        <button type="button" className="pag-btn" disabled>
                            ›
                        </button>
                    </div>
                </div>
            </div>

            {/* =========================================================
               MODAL DE ELIMINACIÓN EN 2 PASOS (DISEÑO MODERNO)
               ========================================================= */}
            {deleteModalOpen && categoryToDelete &&
                createPortal(
                    <div className="modal-overlay" onClick={closeDeleteModal}>
                        <div className="cat-delete-modal-card" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-danger-header">
                                <div className="danger-icon-box">
                                    <Trash2 size={22} />
                                </div>
                                <div>
                                    <h3>Eliminar categoría</h3>
                                    <p>Esta acción retirará la categoría de la base de datos</p>
                                </div>
                                <button type="button" className="modal-close-icon" onClick={closeDeleteModal}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="modal-danger-body">
                                <p className="warning-text">
                                    ¿Estás seguro de que deseas eliminar permanentemente la categoría{" "}
                                    <strong>"{categoryToDelete.nombre}"</strong>?
                                </p>
                                <div className="warning-banner">
                                    <AlertTriangle size={18} />
                                    <span>
                                        Esta acción eliminará definitivamente la categoría del sistema. No se podrá deshacer.
                                        Si deseas conservar la información sin mostrarla en la tienda, utiliza la opción Archivar.
                                    </span>
                                </div>
                                <div className="modal-btn-row">
                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={closeDeleteModal}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        className="danger-btn"
                                        onClick={handleConfirmDelete}
                                    >
                                        Eliminar definitivamente
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

export default CategoryTable;