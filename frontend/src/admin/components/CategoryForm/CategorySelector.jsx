import { useState, useMemo, useCallback } from "react";
import { Search, ArrowLeft, X, Folder, FolderOpen, ChevronRight, ChevronDown, Check } from "lucide-react";
import "./CategorySelector.css";

function CategorySelector({
    categories,
    value,
    onChange,
    excludeId = null,
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPath, setCurrentPath] = useState([]);
    const [viewMode, setViewMode] = useState("tree"); // "tree" or "search"

    // =====================================================
    // FUNCIONES AUXILIARES (useCallback para estabilidad)
    // =====================================================

    // Construir ruta completa de una categoría
    const buildPath = useCallback((category) => {
        const path = [];
        let current = category;

        while (current) {
            path.unshift(current);
            const parentId = current.id_categoria_padre ?? current.categoria_padre?.id_categoria ?? current.categoria_padre;
            current = categories.find(cat => Number(cat.id_categoria) === Number(parentId));
        }

        return path;
    }, [categories]);

    // Obtener hijos de una categoría
    const getChildren = useCallback((parentId) => {
        return categories.filter(cat => {
            const parent = cat.id_categoria_padre ?? cat.categoria_padre?.id_categoria ?? cat.categoria_padre;
            return Number(parent) === Number(parentId);
        });
    }, [categories]);

    // Verificar si una categoría es descendiente de otra (prevención de ciclos)
    const isDescendant = useCallback((potentialParent, potentialChild) => {
        if (!potentialParent || !potentialChild) return false;
        if (Number(potentialParent.id_categoria) === Number(potentialChild.id_categoria)) return true;

        let current = potentialChild;
        const visited = new Set();

        while (current) {
            const parentId = current.id_categoria_padre ?? current.categoria_padre?.id_categoria ?? current.categoria_padre;
            if (!parentId) break;

            if (Number(parentId) === Number(potentialParent.id_categoria)) return true;

            if (visited.has(parentId)) {
                // Ciclo detectado en los datos existentes
                break;
            }
            visited.add(parentId);

            current = categories.find(c => Number(c.id_categoria) === Number(parentId));
        }

        return false;
    }, [categories]);

    // Calcular nivel de una categoría (1-6)
    const getLevel = useCallback((category) => {
        if (!category) return 0;
        const path = buildPath(category);
        const level = path.length;
        return Math.min(level, 6); // Máximo 6 niveles
    }, [buildPath]);

    // =====================================================
    // HOOKS useMemo (que dependen de las funciones anteriores)
    // =====================================================

    // Obtener categoría seleccionada
    const selectedCategory = useMemo(() => {
        if (!value) return null;
        return categories.find(cat => Number(cat.id_categoria) === Number(value));
    }, [categories, value]);

    // Obtener categorías principales (nivel 1)
    const rootCategories = useMemo(() => {
        return categories.filter(cat => {
            const parent = cat.id_categoria_padre ?? cat.categoria_padre?.id_categoria ?? cat.categoria_padre;
            return !parent;
        });
    }, [categories]);

    // Filtrar categorías excluyendo la actual (para edición)
    const filterExcluded = (cats) => {
        if (!excludeId) return cats;
        return cats.filter(cat => Number(cat.id_categoria) !== Number(excludeId));
    };

    // Obtener categorías en el nivel actual
    const currentCategories = useMemo(() => {
        let cats;
        if (currentPath.length === 0) {
            // Recalcular rootCategories directamente para evitar dependencia circular
            cats = categories.filter(cat => {
                const parent = cat.id_categoria_padre ?? cat.categoria_padre?.id_categoria ?? cat.categoria_padre;
                return !parent;
            });
        } else {
            const currentParent = currentPath[currentPath.length - 1];
            cats = getChildren(currentParent.id_categoria);
        }

        // Filtrar categorías excluidas y sus descendientes
        return cats.filter(cat => {
            // Excluir la categoría que se está editando
            if (excludeId && Number(cat.id_categoria) === Number(excludeId)) return false;

            // Excluir descendientes de la categoría que se está editando (prevención de ciclos)
            if (excludeId) {
                const editingCategory = categories.find(c => Number(c.id_categoria) === Number(excludeId));
                if (editingCategory && isDescendant(editingCategory, cat)) return false;
            }

            return true;
        });
    }, [categories, currentPath, excludeId, getChildren, isDescendant]);

    // Búsqueda: coincide solo con el nombre de la categoría (no sus hijos)
    // Si buscas "Accesorios" → ves "Accesorios", no sus subcategorías
    // Si buscas "Ropa" → ves todas las categorías cuyo nombre contenga "Ropa"
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const query = searchQuery.toLowerCase().trim();

        return categories.filter(cat => {
            // Excluir la categoría que se está editando
            if (excludeId && Number(cat.id_categoria) === Number(excludeId)) return false;

            // Excluir descendientes de la categoría que se está editando (prevención de ciclos)
            if (excludeId) {
                const editingCategory = categories.find(c => Number(c.id_categoria) === Number(excludeId));
                if (editingCategory && isDescendant(editingCategory, cat)) return false;
            }

            // Buscar SOLO por el nombre de esta categoría (no su ruta)
            return cat.nombre.toLowerCase().includes(query);
        }).map(cat => ({
            category: cat,
            path: buildPath(cat)
        }));
    }, [categories, searchQuery, excludeId, isDescendant, buildPath]);

    // Navegar a una categoría
    const navigateTo = useCallback((category) => {
        const path = buildPath(category);
        setCurrentPath(path);
        setViewMode("tree");
    }, [buildPath]);

    // Ir atrás
    const goBack = () => {
        if (currentPath.length > 0) {
            setCurrentPath(currentPath.slice(0, -1));
        }
    };

    // Seleccionar categoría
    const selectCategory = (category) => {
        onChange(category.id_categoria);
        setIsOpen(false);
        setSearchQuery("");
        setCurrentPath([]);
        setViewMode("tree");
    };

    // Limpiar selección
    const clearSelection = () => {
        onChange("");
        setIsOpen(false);
        setSearchQuery("");
        setCurrentPath([]);
        setViewMode("tree");
    };

    // Obtener ruta de texto
    const getRouteText = (path) => {
        return path.map(cat => cat.nombre).join(" > ");
    };

    // Calcular nivel resultante
    const resultLevel = selectedCategory ? getLevel(selectedCategory) + 1 : 1;
    
    const getLevelText = (lvl) => {
        if (lvl === 1) return "Categoría principal";
        if (lvl === 2) return "Subcategoría";
        if (lvl === 3) return "Sub-subcategoría";
        if (lvl === 4) return "Nivel 4";
        if (lvl === 5) return "Nivel 5";
        if (lvl === 6) return "Nivel 6";
        return `Nivel ${lvl}`;
    };

    const levelText = getLevelText(resultLevel);

    // Verificar si excede nivel 6
    const exceedsMaxLevel = resultLevel > 6;

    return (
        <div className="category-selector">
            <label>
                Categoría padre
            </label>

            {/* Selector visible */}
            <div 
                className={`category-selector-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                {selectedCategory ? (
                    <div className="category-selector-selected">
                        <Folder size={16} />
                        <span>{getRouteText(buildPath(selectedCategory))}</span>
                        <button
                            type="button"
                            className="category-selector-clear"
                            onClick={(e) => {
                                e.stopPropagation();
                                clearSelection();
                            }}
                            disabled={disabled}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="category-selector-placeholder">
                        Ninguna — categoría principal
                    </div>
                )}
                <button
                    type="button"
                    className="category-selector-toggle"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled) setIsOpen(!isOpen);
                    }}
                    disabled={disabled}
                >
                    <ChevronDown size={16} />
                </button>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="category-selector-dropdown">
                    {/* Búsqueda */}
                    <div className="category-selector-search">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Buscar categoría..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (e.target.value.trim()) {
                                    setViewMode("search");
                                } else {
                                    setViewMode("tree");
                                }
                            }}
                            autoFocus
                        />
                    </div>

                    {/* Breadcrumbs */}
                    {viewMode === "tree" && currentPath.length > 0 && (
                        <div className="category-selector-breadcrumbs">
                            <button
                                type="button"
                                className="breadcrumb-back"
                                onClick={goBack}
                            >
                                <ArrowLeft size={14} />
                                Volver
                            </button>
                            <div className="breadcrumb-path">
                                {currentPath.map((cat, index) => (
                                    <span key={cat.id_categoria}>
                                        {index > 0 && <ChevronRight size={12} />}
                                        {cat.nombre}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lista de categorías */}
                    <div className="category-selector-list">
                        {viewMode === "search" ? (
                            // Resultados de búsqueda
                            searchResults.length > 0 ? (
                                searchResults.map(({ category, path }) => (
                                    <div
                                        key={category.id_categoria}
                                        className={`category-selector-item ${Number(value) === Number(category.id_categoria) ? 'selected' : ''}`}
                                        onClick={() => selectCategory(category)}
                                    >
                                        <Folder size={14} />
                                        <div className="category-selector-item-content">
                                            <span className="category-name">{category.nombre}</span>
                                            <span className="category-path">{getRouteText(path)}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="category-selector-empty">
                                    No se encontraron categorías
                                </div>
                            )
                        ) : (
                            // Navegación por árbol
                            currentPath.length === 0 ? (
                                // Nivel 1
                                currentCategories.map(cat => {
                                    const children = getChildren(cat.id_categoria);
                                    
                                    return (
                                        <div
                                            key={cat.id_categoria}
                                            className={`category-selector-item ${Number(value) === Number(cat.id_categoria) ? 'selected' : ''}`}
                                        >
                                            <div className="category-selector-item-main">
                                                <Folder size={14} />
                                                <span>{cat.nombre}</span>
                                            </div>
                                            <div className="category-selector-item-actions">
                                                <button
                                                    type="button"
                                                    className="category-select-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectCategory(cat);
                                                    }}
                                                    title="Seleccionar como padre"
                                                >
                                                    <Check size={14} />
                                                    Seleccionar
                                                </button>
                                                {children.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className="category-navigate-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigateTo(cat);
                                                        }}
                                                        title="Ver subcategorías"
                                                    >
                                                        Ver hijos
                                                        <ChevronRight size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                // Niveles 2 y 3
                                currentCategories.map(cat => {
                                    const children = getChildren(cat.id_categoria);
                                    const level = getLevel(cat);
                                    
                                    return (
                                        <div
                                            key={cat.id_categoria}
                                            className={`category-selector-item ${Number(value) === Number(cat.id_categoria) ? 'selected' : ''}`}
                                        >
                                            <div className="category-selector-item-main">
                                                <Folder size={14} />
                                                <span>{cat.nombre}</span>
                                            </div>
                                            <div className="category-selector-item-actions">
                                                <button
                                                    type="button"
                                                    className="category-select-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selectCategory(cat);
                                                    }}
                                                    title="Seleccionar como padre"
                                                >
                                                    <Check size={14} />
                                                    Seleccionar
                                                </button>
                                                {children.length > 0 && level < 6 && (
                                                    <button
                                                        type="button"
                                                        className="category-navigate-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigateTo(cat);
                                                        }}
                                                        title="Ver subcategorías"
                                                    >
                                                        Ver hijos
                                                        <ChevronRight size={14} />
                                                    </button>
                                                )}
                                                {level >= 6 && (
                                                    <span className="category-max-level-hint">
                                                        Nivel máximo
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Info de nivel */}
            {selectedCategory && (
                <div className={`category-selector-level ${exceedsMaxLevel ? 'error' : ''}`}>
                    <span className="level-label">Nivel resultante:</span>
                    <span className="level-value">{levelText}</span>
                    {exceedsMaxLevel && (
                        <span className="level-error">
                            No se pueden crear categorías por debajo del sexto nivel.
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export default CategorySelector;
