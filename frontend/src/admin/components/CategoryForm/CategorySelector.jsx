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
    Layers,
} from "lucide-react";
import "./CategorySelector.css";

/**
 * CategorySelector
 * Selector de categoría padre con diseño idéntico al selector de categorías de Producto Simple:
 * trigger morado moderno, árbol jerárquico expandible con carpetas e insignias, buscador en tiempo real
 * y opción "Ninguna — categoría principal".
 */
function CategorySelector({
    categories = [],
    value,
    onChange,
    excludeId = null,
    disabled = false,
}) {
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

    // Helper para obtener ID de categoría padre
    const getParentId = (cat) => {
        if (!cat) return null;
        return (
            cat.id_categoria_padre ??
            cat.categoria_padre?.id_categoria ??
            cat.categoria_padre_id ??
            cat.categoria_padre
        );
    };

    // Filtrar categorías excluidas (la categoría actual y todos sus descendientes para evitar ciclos)
    const availableCategories = useMemo(() => {
        if (!excludeId) return categories || [];

        const targetId = Number(excludeId);
        const excludedSet = new Set([targetId]);
        let addedNew = true;

        while (addedNew) {
            addedNew = false;
            (categories || []).forEach((cat) => {
                const id = Number(cat.id_categoria);
                if (!excludedSet.has(id)) {
                    const pId = getParentId(cat);
                    if (pId && excludedSet.has(Number(pId))) {
                        excludedSet.add(id);
                        addedNew = true;
                    }
                }
            });
        }

        return (categories || []).filter(
            (cat) => !excludedSet.has(Number(cat.id_categoria))
        );
    }, [categories, excludeId]);

    // Estructurar árbol de categorías
    const { rootCategories, categoryMap, childrenMap } = useMemo(() => {
        const catMap = new Map();
        const chMap = new Map();
        const roots = [];

        availableCategories.forEach((cat) => {
            const id = Number(cat.id_categoria);
            catMap.set(id, cat);
        });

        availableCategories.forEach((cat) => {
            const id = Number(cat.id_categoria);
            const pId = getParentId(cat);
            if (!pId || !catMap.has(Number(pId))) {
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
    }, [availableCategories]);

    // Estado de carpetas expandidas (por defecto expandidas para ver toda la jerarquía)
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

    // ID de categoría seleccionada actualmente (null = categoría principal)
    const selectedId = useMemo(() => {
        if (value === null || value === undefined || value === "") return null;
        return Number(value);
    }, [value]);

    // Construir breadcrumb / ruta jerárquica
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
    const selectedText = selectedCategory
        ? getFullPath(selectedId)
        : "Ninguna — categoría principal";

    // Filtrado por búsqueda en tiempo real
    const searchFilteredList = useMemo(() => {
        const query = (search || "").trim().toLowerCase();
        if (!query) return null;

        return availableCategories.filter((cat) => {
            const path = getFullPath(cat.id_categoria).toLowerCase();
            return path.includes(query);
        });
    }, [availableCategories, search, categoryMap]);

    const handleSelect = (cat) => {
        if (disabled) return;
        const id = cat ? Number(cat.id_categoria) : null;
        if (onChange) {
            onChange(id);
        }
        setIsOpen(false);
        setSearch("");
    };

    const handleClear = (e) => {
        e.stopPropagation();
        if (disabled) return;
        if (onChange) {
            onChange(null);
        }
    };

    return (
        <div className="category-selector-wrapper" ref={containerRef}>
            <label className="category-selector-label">Categoría padre</label>

            {/* TRIGGER BOX (IDÉNTICO A PRODUCTO SIMPLE) */}
            <div
                className={`category-selector-trigger ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                tabIndex={0}
                role="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className="category-selector-left-icon">
                    <Package size={18} color="#94a3b8" />
                </div>

                <div
                    className={`category-selector-content ${selectedCategory ? "is-selected" : "is-root"}`}
                    title={selectedText}
                >
                    {selectedText}
                </div>

                <div className="category-selector-actions">
                    {selectedCategory && (
                        <button
                            type="button"
                            className="category-selector-clear-btn"
                            title="Quitar categoría padre (establecer como principal)"
                            onClick={handleClear}
                            disabled={disabled}
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

            {/* MENÚ DESPLEGABLE ESPACIOSO Y MODERNO */}
            {isOpen && (
                <div className="category-selector-dropdown">
                    {/* BUSCADOR INSTANTÁNEO */}
                    <div className="category-selector-search-box">
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
                                className="category-selector-clear-btn"
                                onClick={() => setSearch("")}
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* LISTA / ÁRBOL DE CATEGORÍAS */}
                    <div className="category-selector-tree-list">
                        {/* OPCIÓN: NINGUNA - CATEGORÍA PRINCIPAL */}
                        {!search && (
                            <div
                                className={`category-selector-none-row ${selectedId === null ? "is-active" : ""}`}
                                onClick={() => handleSelect(null)}
                            >
                                <div className="category-selector-none-left">
                                    <Layers
                                        size={16}
                                        color={selectedId === null ? "#6a2ca0" : "#64748b"}
                                    />
                                    <span>Ninguna — categoría principal</span>
                                </div>
                                {selectedId === null && <Check size={16} color="#6a2ca0" />}
                            </div>
                        )}

                        {searchFilteredList ? (
                            /* MODO BÚSQUEDA FILTRADA */
                            searchFilteredList.length === 0 ? (
                                <div className="category-selector-empty-results">
                                    No se encontraron categorías para "{search}"
                                </div>
                            ) : (
                                searchFilteredList.map((cat) => {
                                    const isSelected = Number(cat.id_categoria) === selectedId;
                                    const fullPath = getFullPath(cat.id_categoria);
                                    return (
                                        <div
                                            key={cat.id_categoria}
                                            className={`category-selector-child-row ${isSelected ? "is-active" : ""}`}
                                            onClick={() => handleSelect(cat)}
                                        >
                                            <div className="category-selector-child-left">
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
                                <div className="category-selector-empty-results">
                                    No hay otras categorías registradas
                                </div>
                            ) : (
                                rootCategories.map((root) => {
                                    const rootId = Number(root.id_categoria);
                                    const children = childrenMap.get(rootId) || [];
                                    const isExpanded = expandedIds.has(rootId);
                                    const isRootSelected = rootId === selectedId;

                                    return (
                                        <div key={rootId} className="category-selector-parent-group">
                                            {/* FILA DE CATEGORÍA PADRE */}
                                            <div
                                                className={`category-selector-parent-row ${isRootSelected ? "is-active" : ""}`}
                                                onClick={() => handleSelect(root)}
                                            >
                                                <div className="category-selector-parent-left">
                                                    {children.length > 0 && (
                                                        <button
                                                            type="button"
                                                            className="category-selector-expand-btn"
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
                                                    <span className="category-selector-parent-name">{root.nombre}</span>
                                                    {children.length > 0 && (
                                                        <span className="category-selector-count-badge">
                                                            {children.length}{" "}
                                                            {children.length === 1 ? "subcategoría" : "subcategorías"}
                                                        </span>
                                                    )}
                                                </div>

                                                {isRootSelected && <Check size={16} color="#6a2ca0" />}
                                            </div>

                                            {/* SUBCATEGORÍAS HIJAS EXPANDIDAS */}
                                            {children.length > 0 && isExpanded && (
                                                <div className="category-selector-children-list">
                                                    {children.map((child) => {
                                                        const childId = Number(child.id_categoria);
                                                        const isChildSelected = childId === selectedId;

                                                        return (
                                                            <div
                                                                key={childId}
                                                                className={`category-selector-child-row ${isChildSelected ? "is-active" : ""}`}
                                                                onClick={() => handleSelect(child)}
                                                            >
                                                                <div className="category-selector-child-left">
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
                    <div className="category-selector-footer-info">
                        <span>
                            {availableCategories.length}{" "}
                            {availableCategories.length === 1 ? "categoría en total" : "categorías en total"}
                        </span>
                        <span>Selecciona una para asignar</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CategorySelector;
