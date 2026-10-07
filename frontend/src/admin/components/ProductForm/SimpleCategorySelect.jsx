import { useState, useMemo, useRef, useEffect } from "react";
import {
    Package,
    Folder,
    FolderOpen,
    ChevronDown,
    ChevronRight,
    Search,
    Check,
    X,
} from "lucide-react";

/**
 * SimpleCategorySelect
 * Selector de categorías jerárquico y espacioso para el Formulario de Producto Simple.
 * Resuelve el problema de dropdown corto mostrando todas las categorías y subcategorías
 * con altura generosa (hasta 420px), búsqueda instantánea y árbol expandido.
 */
function SimpleCategorySelect({ categories = [], value, onChange, error }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // Helpers para padres e hijos
    const getParentId = (cat) => {
        if (!cat) return null;
        return (
            cat.id_categoria_padre ??
            cat.categoria_padre?.id_categoria ??
            cat.categoria_padre_id ??
            cat.categoria_padre
        );
    };

    // Estructurar árbol de categorías
    const { rootCategories, categoryMap, childrenMap } = useMemo(() => {
        const catMap = new Map();
        const chMap = new Map();
        const roots = [];

        (categories || []).forEach((cat) => {
            const id = Number(cat.id_categoria);
            catMap.set(id, cat);
        });

        (categories || []).forEach((cat) => {
            const id = Number(cat.id_categoria);
            const pId = getParentId(cat);
            if (!pId) {
                roots.push(cat);
            } else {
                const parentKey = Number(pId);
                if (!chMap.has(parentKey)) {
                    chMap.set(parentKey, []);
                }
                chMap.get(parentKey).push(cat);
            }
        });

        return { rootCategories: roots, categoryMap: catMap, childrenMap: chMap };
    }, [categories]);

    // Estado de carpetas expandidas (por defecto expandidas para ver todas las subcategorías)
    const [expandedIds, setExpandedIds] = useState(() => new Set());

    useEffect(() => {
        if (rootCategories.length > 0) {
            setExpandedIds(new Set(rootCategories.map((c) => Number(c.id_categoria))));
        }
    }, [rootCategories]);

    const toggleExpand = (catId, e) => {
        e.stopPropagation();
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(catId)) {
                next.delete(catId);
            } else {
                next.add(catId);
            }
            return next;
        });
    };

    // ID de la categoría seleccionada actualmente
    const selectedId = useMemo(() => {
        if (!value) return null;
        if (Array.isArray(value)) {
            return value.length > 0 ? Number(value[0]) : null;
        }
        return Number(value);
    }, [value]);

    // Construir breadcrumb / nombre completo de una categoría
    const getFullPath = (catId) => {
        if (!catId) return "";
        const parts = [];
        let curr = categoryMap.get(Number(catId));
        const visited = new Set();

        while (curr && !visited.has(Number(curr.id_categoria))) {
            visited.add(Number(curr.id_categoria));
            parts.unshift(curr.nombre);
            const pId = getParentId(curr);
            curr = pId ? categoryMap.get(Number(pId)) : null;
        }

        return parts.join(" > ");
    };

    const selectedCategory = selectedId ? categoryMap.get(selectedId) : null;
    const selectedText = selectedCategory ? getFullPath(selectedId) : "";

    // Filtrar por búsqueda si hay término
    const searchFilteredList = useMemo(() => {
        const query = (search || "").trim().toLowerCase();
        if (!query) return null;

        return (categories || []).filter((cat) => {
            const path = getFullPath(cat.id_categoria).toLowerCase();
            return path.includes(query);
        });
    }, [categories, search, categoryMap]);

    const handleSelect = (cat) => {
        const id = Number(cat.id_categoria);
        if (onChange) {
            onChange(id, cat);
        }
        setIsOpen(false);
        setSearch("");
    };

    const handleClear = (e) => {
        e.stopPropagation();
        if (onChange) {
            onChange(null, null);
        }
    };

    return (
        <div className="simple-cat-select-container" ref={containerRef}>
            {/* TRIGGER BOX (IDÉNTICO A LA MAQUETA) */}
            <div
                className={`simple-cat-trigger ${isOpen ? "is-open" : ""} ${error ? "has-error" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
                tabIndex={0}
                role="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className="simple-input-left-icon">
                    <Package size={18} color="#94a3b8" />
                </div>

                <div
                    className={`simple-cat-trigger-content ${selectedCategory ? "is-selected" : "is-placeholder"}`}
                    title={selectedText}
                >
                    {selectedText || "Selecciona una categoría"}
                </div>

                <div className="simple-cat-trigger-actions">
                    {selectedCategory && (
                        <button
                            type="button"
                            className="simple-cat-clear-btn"
                            title="Quitar categoría"
                            onClick={handleClear}
                        >
                            <X size={13} />
                        </button>
                    )}
                    <ChevronDown
                        size={18}
                        color="#6a2ca0"
                        style={{
                            transform: isOpen ? "rotate(180deg)" : "none",
                            transition: "transform 0.2s ease",
                        }}
                    />
                </div>
            </div>

            {/* MENÚ DESPLEGABLE ESPACIOSO Y NO CORTADO */}
            {isOpen && (
                <div className="simple-cat-dropdown">
                    {/* BUSCADOR INSTANTÁNEO */}
                    <div className="simple-cat-search-box">
                        <Search size={16} color="#94a3b8" />
                        <input
                            type="text"
                            placeholder="Buscar categoría o subcategoría..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                        {search && (
                            <button
                                type="button"
                                className="simple-cat-clear-btn"
                                onClick={() => setSearch("")}
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* LISTA / ÁRBOL DE CATEGORÍAS */}
                    <div className="simple-cat-tree-list">
                        {searchFilteredList ? (
                            /* MODO BÚSQUEDA FILTRADA */
                            searchFilteredList.length === 0 ? (
                                <div className="simple-cat-empty-results">
                                    No se encontraron categorías para "{search}"
                                </div>
                            ) : (
                                searchFilteredList.map((cat) => {
                                    const isSelected = Number(cat.id_categoria) === selectedId;
                                    const fullPath = getFullPath(cat.id_categoria);
                                    return (
                                        <div
                                            key={cat.id_categoria}
                                            className={`simple-cat-child-row ${isSelected ? "is-active" : ""}`}
                                            onClick={() => handleSelect(cat)}
                                        >
                                            <div className="simple-cat-child-left">
                                                <Folder size={15} color={isSelected ? "#6a2ca0" : "#8b5cf6"} />
                                                <span>{fullPath}</span>
                                            </div>
                                            {isSelected && <Check size={16} color="#6a2ca0" />}
                                        </div>
                                    );
                                })
                            )
                        ) : (
                            /* MODO ÁRBOL COMPLETO */
                            rootCategories.length === 0 ? (
                                <div className="simple-cat-empty-results">
                                    No hay categorías disponibles
                                </div>
                            ) : (
                                rootCategories.map((root) => {
                                    const rootId = Number(root.id_categoria);
                                    const children = childrenMap.get(rootId) || [];
                                    const isExpanded = expandedIds.has(rootId);
                                    const isRootSelected = rootId === selectedId;

                                    return (
                                        <div key={rootId} className="simple-cat-parent-group">
                                            {/* FILA DE CATEGORÍA PADRE */}
                                            <div
                                                className={`simple-cat-parent-row ${isRootSelected ? "is-active" : ""}`}
                                                onClick={() => handleSelect(root)}
                                            >
                                                <div className="simple-cat-parent-left">
                                                    {children.length > 0 && (
                                                        <button
                                                            type="button"
                                                            className="simple-cat-expand-btn"
                                                            onClick={(e) => toggleExpand(rootId, e)}
                                                            title={isExpanded ? "Plegar" : "Desplegar"}
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronDown size={14} />
                                                            ) : (
                                                                <ChevronRight size={14} />
                                                            )}
                                                        </button>
                                                    )}
                                                    <Folder
                                                        size={16}
                                                        color={isRootSelected ? "#6a2ca0" : "#7c3aed"}
                                                    />
                                                    <span className="simple-cat-parent-name">{root.nombre}</span>
                                                    {children.length > 0 && (
                                                        <span className="simple-cat-count-badge">
                                                            {children.length}{" "}
                                                            {children.length === 1 ? "subcategoría" : "subcategorías"}
                                                        </span>
                                                    )}
                                                </div>

                                                {isRootSelected && <Check size={16} color="#6a2ca0" />}
                                            </div>

                                            {/* SUBCATEGORÍAS HIJAS EXPANDIDAS */}
                                            {children.length > 0 && isExpanded && (
                                                <div className="simple-cat-children-list">
                                                    {children.map((child) => {
                                                        const childId = Number(child.id_categoria);
                                                        const isChildSelected = childId === selectedId;

                                                        return (
                                                            <div
                                                                key={childId}
                                                                className={`simple-cat-child-row ${isChildSelected ? "is-active" : ""}`}
                                                                onClick={() => handleSelect(child)}
                                                            >
                                                                <div className="simple-cat-child-left">
                                                                    <span className="branch-icon">↳</span>
                                                                    <FolderOpen
                                                                        size={14}
                                                                        color={isChildSelected ? "#6a2ca0" : "#a855f7"}
                                                                    />
                                                                    <span>{child.nombre}</span>
                                                                </div>

                                                                {isChildSelected && (
                                                                    <Check size={15} color="#6a2ca0" />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )
                        )}
                    </div>

                    {/* PIE DEL SELECTOR */}
                    <div className="simple-cat-footer-info">
                        <span>
                            {categories.length}{" "}
                            {categories.length === 1 ? "categoría en total" : "categorías en total"}
                        </span>
                        <span>Selecciona una para asignar</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SimpleCategorySelect;
