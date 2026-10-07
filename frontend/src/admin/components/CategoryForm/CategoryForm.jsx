import {
    useEffect,
    useMemo,
    useState,
    useCallback
} from "react";

import {
    ArrowLeft,
    Check,
    ChevronDown,
    Folder,
    FolderOpen
} from "lucide-react";

import {
    createCategory,
    updateCategory,
    getCategories
} from "../../../services/adminService";

import CategorySelector from "./CategorySelector";

import "./CategoryForm.css";


function CategoryForm({
    category,
    onClose,
    onCreated
}) {

    const editing = Boolean(category?.id_categoria);

    const [formData, setFormData] = useState({
        nombre: category?.nombre || "",

        categoria_padre_id:
            category?.categoria_padre_id ??
            category?.id_categoria_padre ??
            category?.categoria_padre?.id_categoria ??
            "",

        estado:
            category?.estado ||
            "activo",

        orden:
            category?.orden ??
            1
    });

    const [categorias, setCategorias] =
        useState([]);

    const [submitting, setSubmitting] =
        useState(false);

    const [loadingCategories, setLoadingCategories] =
        useState(true);

    const [error, setError] =
        useState("");

    const [ordenModificado, setOrdenModificado] =
        useState(false);


    /*
    =====================================================
    CARGAR CATEGORÍAS
    =====================================================
    */

    useEffect(() => {

        let mounted = true;

        const cargarCategorias = async () => {

            setLoadingCategories(true);
            setError("");

            try {

                const response =
                    await getCategories();

                const data =
                    response?.data;

                if (!mounted) {
                    return;
                }

                /*
                El backend actualmente devuelve
                directamente un array.
                */

                if (Array.isArray(data)) {

                    setCategorias(data);

                } else if (
                    Array.isArray(data?.results)
                ) {

                    setCategorias(
                        data.results
                    );

                } else {

                    setCategorias([]);
                }

            } catch (error) {

                console.error(
                    "Error cargando categorías:",
                    error
                );

                if (mounted) {

                    setCategorias([]);

                    setError(
                        "No fue posible cargar las categorías."
                    );
                }

            } finally {

                if (mounted) {
                    setLoadingCategories(false);
                }
            }
        };

        cargarCategorias();

        return () => {
            mounted = false;
        };

    }, []);


    /*
    =====================================================
    CAMBIO DE INPUT
    =====================================================
    */

    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));

        if (name === "orden") {
            setOrdenModificado(true);
        }

        setError("");
    };


    /*
    =====================================================
    FUNCIONES AUXILIARES (useCallback para estabilidad)
    =====================================================
    */

    const buildPath = useCallback((category) => {
        const path = [];
        let current = category;

        while (current) {
            path.unshift(current);
            const parentId = current.id_categoria_padre ?? current.categoria_padre?.id_categoria ?? current.categoria_padre;
            current = categorias.find(cat => Number(cat.id_categoria) === Number(parentId));
        }

        return path;
    }, [categorias]);

    /*
    =====================================================
    HOOKS useMemo (que dependen de las funciones anteriores)
    =====================================================
    */

    /*
    =====================================================
    CATEGORÍA PADRE SELECCIONADA
    =====================================================
    */

    const categoriaPadre = useMemo(() => {

        if (
            !formData.categoria_padre_id
        ) {
            return null;
        }

        return categorias.find(
            (item) =>
                Number(
                    item.id_categoria
                ) === Number(
                    formData.categoria_padre_id
                )
        );

    }, [
        categorias,
        formData.categoria_padre_id
    ]);


    /*
    =====================================================
    CATEGORÍAS PRINCIPALES
    =====================================================
    */

    const categoriasPrincipales =
        useMemo(() => {

            return categorias.filter(
                (item) => {

                    const parent =
                        item.id_categoria_padre ??
                        item.categoria_padre?.id_categoria ??
                        item.categoria_padre;

                    return !parent;
                }
            );

        }, [categorias]);

    /*
    =====================================================
    PREVIEW DE ESTRUCTURA
    =====================================================
    */

    const previewStructure = useMemo(() => {
        if (!formData.nombre) return null;

        const parentPath = categoriaPadre ? buildPath(categoriaPadre) : [];
        const fullPath = [...parentPath, { nombre: formData.nombre, isNew: true }];

        return fullPath;
    }, [formData.nombre, categoriaPadre, categorias, buildPath]);

    /*
    =====================================================
    CALCULAR NIVEL DE LA CATEGORÍA (1-6)
    =====================================================
    */

    const categoryLevel = useMemo(() => {
        if (!formData.nombre) return 0;
        const parentPath = categoriaPadre ? buildPath(categoriaPadre) : [];
        const level = parentPath.length + 1;
        return Math.min(level, 10);
    }, [formData.nombre, categoriaPadre, categorias, buildPath]);

    const getLevelLabel = (lvl) => {
        if (lvl === 1) return "Categoría principal";
        if (lvl === 2) return "Subcategoría";
        if (lvl === 3) return "Sub-subcategoría";
        if (lvl === 4) return "Nivel 4";
        if (lvl === 5) return "Nivel 5";
        if (lvl === 6) return "Nivel 6";
        if (lvl === 7) return "Nivel 7";
        if (lvl === 8) return "Nivel 8";
        if (lvl === 9) return "Nivel 9";
        if (lvl === 10) return "Nivel 10";
        return `Nivel ${lvl}`;
    };

    /*
    =====================================================
    LÓGICA DE ORDEN INTELIGENTE
    =====================================================
    */

    const siblings = useMemo(() => {
        return categorias.filter(cat => {
            const parentId = cat.id_categoria_padre ?? cat.categoria_padre?.id_categoria ?? cat.categoria_padre;
            const currentParentId = formData.categoria_padre_id || null;
            if (!currentParentId && !parentId) return true;
            return Number(parentId) === Number(currentParentId);
        }).filter(cat => cat.id_categoria !== category?.id_categoria);
    }, [categorias, formData.categoria_padre_id, category]);

    useEffect(() => {
        if (!editing && !ordenModificado && categorias.length > 0) {
            const maxOrden = siblings.length > 0 ? Math.max(...siblings.map(s => Number(s.orden) || 1)) : 0;
            setFormData(prev => ({ ...prev, orden: maxOrden + 1 }));
        }
    }, [siblings, editing, ordenModificado, categorias.length]);

    const occupiedBy = useMemo(() => {
        return siblings.find(cat => Number(cat.orden) === Number(formData.orden));
    }, [siblings, formData.orden]);


    /*
    =====================================================
    SUBMIT
    =====================================================
    */

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setSubmitting(true);

        try {

            const parentId = formData.categoria_padre_id ? Number(formData.categoria_padre_id) : null;

            const payload = {
                nombre: formData.nombre.trim(),
                categoria_padre_id: parentId,
                estado: formData.estado,
                orden: Number(formData.orden)
            };


            if (!payload.nombre) {

                throw new Error(
                    "El nombre de la categoría es obligatorio."
                );
            }

            // Validación de ciclos en el frontend (para edición)
            if (editing && formData.categoria_padre_id) {
                const selectedParentId = Number(formData.categoria_padre_id);
                const currentCategoryId = Number(category.id_categoria);

                // No permitir seleccionarse a sí mismo como padre
                if (selectedParentId === currentCategoryId) {
                    throw new Error("Una categoría no puede ser su propia padre.");
                }

                const wouldCreateCycle = (ancestorId, potentialDescendantId) => {
                    console.log(`[CYCLE CHECK] ancestorId: ${ancestorId}, potentialDescendantId: ${potentialDescendantId}`);
                    if (ancestorId === potentialDescendantId) return true;

                    let currentId = potentialDescendantId;
                    const visited = new Set();

                    while (currentId) {
                        console.log(`[CYCLE CHECK] Loop - currentId: ${currentId}`);
                        if (visited.has(currentId)) break;
                        visited.add(currentId);

                        const currentCat = categorias.find(cat => Number(cat.id_categoria) === currentId);
                        if (!currentCat) {
                            console.log(`[CYCLE CHECK] Not found currentCat for id: ${currentId}`);
                            break;
                        }
                        
                        let parentId = currentCat.id_categoria_padre ?? currentCat.categoria_padre?.id_categoria ?? currentCat.categoria_padre;
                        if (parentId && typeof parentId === 'object') parentId = parentId.id_categoria || null;
                        
                        console.log(`[CYCLE CHECK] parentId found:`, parentId);
                        
                        if (!parentId) break;
                        currentId = Number(parentId);

                        if (currentId === ancestorId) {
                            console.log(`[CYCLE CHECK] Cycle detected! currentId equals ancestorId (${ancestorId})`);
                            return true;
                        }
                    }
                    console.log(`[CYCLE CHECK] No cycle detected.`);
                    return false;
                };

                if (wouldCreateCycle(currentCategoryId, selectedParentId)) {
                    throw new Error("Ciclo detectado: Estás intentando asignar esta categoría dentro de una de sus propias subcategorías. Esto crearía un bucle infinito.");
                }
            }


            /*
            ---------------------------------------------
            EDITAR
            ---------------------------------------------
            */

            if (editing) {

                await updateCategory(
                    category.id_categoria,
                    payload
                );

            }

            /*
            ---------------------------------------------
            CREAR
            ---------------------------------------------
            */

            else {

                await createCategory(
                    payload
                );
            }


            /*
            ---------------------------------------------
            ÉXITO
            ---------------------------------------------
            */

            if (onCreated) {
                await onCreated();
            }

        } catch (error) {

            console.error(
                "Error guardando categoría:",
                error
            );

            console.error("Error response:", error?.response?.data);

            const backendData =
                error?.response?.data;

            let mensaje =
                editing
                    ? "No fue posible actualizar la categoría."
                    : "No fue posible crear la categoría.";


            // =================================================
            // ERROR DE NOMBRE DUPLICADO
            // =================================================

            if (
                backendData?.detail?.includes?.("duplicate key") ||
                backendData?.detail?.includes?.("already exists") ||
                error?.message?.includes?.("duplicate key") ||
                error?.message?.includes?.("already exists")
            ) {
                mensaje = `Ya existe una categoría con el nombre "${formData.nombre.trim()}". Por favor usa un nombre diferente.`;
            }
            // =================================================
            // ERRORES DE VALIDACIÓN DEL BACKEND
            // =================================================
            else if (backendData && typeof backendData === 'object') {
                // Find the first value in the object that is an array or string (usually field errors)
                const firstErrorKey = Object.keys(backendData).find(k => k !== 'status_code');
                if (firstErrorKey) {
                    const detalle = backendData[firstErrorKey];
                    mensaje = Array.isArray(detalle) ? detalle[0] : detalle;
                }
            } else if (
                error?.message
            ) {
                mensaje = error.message;
            }

            setError(mensaje);

        } finally {

            setSubmitting(false);
        }
    };


    return (

        <div className="category-form-page">

            <div className="category-form-top">

                <button
                    type="button"
                    className="back-button"
                    onClick={onClose}
                    disabled={submitting}
                >

                    <ArrowLeft size={18} />

                    Categorías

                </button>

            </div>


            <div className="category-form-heading">

                <div>

                    <h1>

                        {editing
                            ? "Editar categoría"
                            : "Nueva categoría"
                        }

                    </h1>

                    <p>
                        {editing
                            ? "Actualiza la información de la categoría."
                            : "Crea una categoría principal o subcategoría para organizar tu tienda."
                        }
                    </p>

                </div>

            </div>


            {error && (

                <div
                    className="category-form-error"
                    role="alert"
                >
                    {error}
                </div>

            )}


            <div className="category-form-layout">


                {/* =================================================
                    FORMULARIO
                ================================================= */}

                <form
                    className="category-form-card"
                    onSubmit={handleSubmit}
                >

                    <div className="form-card-header">

                        <div>

                            <h2>
                                Información de la categoría
                            </h2>

                            <p>
                                Completa los datos principales.
                            </p>

                        </div>

                    </div>


                    <div className="category-form-content">


                        <div className="form-group full">

                            <label htmlFor="nombre">

                                Nombre

                                <span>*</span>

                            </label>

                            <input
                                id="nombre"
                                type="text"
                                name="nombre"
                                value={
                                    formData.nombre
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Nombre de la categoría"
                                disabled={submitting}
                                required
                            />

                        </div>


                        <div className="form-group full">

                            <CategorySelector
                                categories={categorias}
                                value={formData.categoria_padre_id}
                                onChange={(value) => setFormData(prev => ({ ...prev, categoria_padre_id: value }))}
                                excludeId={editing ? category.id_categoria : null}
                                disabled={loadingCategories || submitting}
                            />

                        </div>


                        <div className="form-row">


                            <div className="form-group">

                                <label htmlFor="estado">

                                    Estado

                                </label>


                                <div className="select-wrapper">

                                    <select
                                        id="estado"
                                        name="estado"
                                        value={
                                            formData.estado
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        disabled={
                                            submitting
                                        }
                                    >

                                        <option value="activo">
                                            Activa
                                        </option>

                                        <option value="inactivo">
                                            Inactiva
                                        </option>

                                    </select>

                                    <ChevronDown
                                        size={17}
                                    />

                                </div>

                            </div>


                            <div className="form-group">

                                <label htmlFor="orden">

                                    Orden

                                </label>

                                <input
                                    id="orden"
                                    type="number"
                                    name="orden"
                                    min="1"
                                    value={
                                        formData.orden
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        submitting
                                    }
                                />
                                {occupiedBy ? (
                                    <small style={{ color: '#ea580c', display: 'block', marginTop: '6px' }}>
                                        ⚠️ Puesto {formData.orden} ocupado por: <strong>{occupiedBy.nombre}</strong>
                                    </small>
                                ) : (
                                    <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '6px' }}>
                                        {formData.orden > 1 ? `Este será el puesto #${formData.orden}.` : `Será la primera categoría.`}
                                    </small>
                                )}
                            </div>

                        </div>

                    </div>


                    <div className="form-actions">

                        <button
                            type="button"
                            className="cancel-form-button"
                            onClick={onClose}
                            disabled={
                                submitting
                            }
                        >
                            Cancelar
                        </button>


                        <button
                            type="submit"
                            className="save-form-button"
                            disabled={
                                submitting ||
                                loadingCategories
                            }
                        >

                            <Check size={17} />

                            {submitting

                                ? "Guardando..."

                                : editing
                                    ? "Guardar cambios"
                                    : "Crear categoría"

                            }

                        </button>

                    </div>

                </form>


                {/* =================================================
                    VISTA PREVIA
                ================================================= */}

                <div className="category-preview-card">

                    <div className="preview-header">

                        <div>

                            <h2>
                                Vista previa
                            </h2>

                            <p>
                                Así se verá en la navegación.
                            </p>

                        </div>

                        {categoryLevel > 0 && (
                            <div className="preview-level-badge">
                                {getLevelLabel(categoryLevel)}
                            </div>
                        )}

                    </div>


                    <div className="preview-navigation">

                        {previewStructure ? (
                            <div className="preview-tree">
                                {previewStructure.map((item, index) => (
                                    <div key={index} className="preview-tree-node">
                                        {index > 0 && (
                                            <div className="preview-tree-line" />
                                        )}
                                        <div className={`preview-tree-item ${item.isNew ? 'new' : ''}`}>
                                            {item.nombre}
                                            {item.isNew && (
                                                <small>Nueva</small>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {categoryLevel >= 6 && (
                                    <div className="preview-max-level">
                                        <span>Nivel máximo alcanzado (6)</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="preview-empty">

                                <FolderOpen
                                    size={18}
                                />

                                <span>
                                    Ingresa un nombre para ver la estructura.
                                </span>

                            </div>
                        )}

                    </div>


                    <div className="preview-note">

                        <Folder size={16} />

                        <span>
                            La estructura se actualizará cuando guardes los cambios.
                        </span>

                    </div>

                </div>

            </div>

        </div>
    );
}


export default CategoryForm;