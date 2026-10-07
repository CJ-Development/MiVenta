import { useState } from "react";
import { Plus } from "lucide-react";
import "./Categories.css";

import CategoryForm from "../../components/CategoryForm/CategoryForm";
import CategoryTable from "../../components/CategoryTable/CategoryTable";

function Categories() {
    const [showForm, setShowForm] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleNewCategory = (parentCategory = null) => {
        if (parentCategory && parentCategory.id_categoria) {
            setSelectedCategory({
                categoria_padre_id: parentCategory.id_categoria,
                nombre_padre: parentCategory.nombre,
            });
        } else {
            setSelectedCategory(null);
        }
        setShowForm(true);
    };

    const handleEditCategory = (category) => {
        setSelectedCategory(category);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setSelectedCategory(null);
        setShowForm(false);
    };

    const handleCreated = () => {
        setRefreshKey((prev) => prev + 1);
        setShowForm(false);
        setSelectedCategory(null);
    };

    if (showForm) {
        return (
            <CategoryForm
                category={selectedCategory}
                onClose={handleCloseForm}
                onCreated={handleCreated}
            />
        );
    }

    return (
        <div className="categories-page-wrapper">
            <div className="dash-bg-shape shape-top" />
            <div className="dash-bg-shape shape-bottom" />

            <div className="categories-content-container">
                <div className="categories-hero-header">
                    <div className="categories-hero-titles">
                        <h1 className="categories-hero-title">Categorías</h1>
                        <p className="categories-hero-subtitle">
                            Organiza las categorías y subcategorías de tu tienda.
                        </p>
                    </div>

                    <button
                        className="new-category-btn"
                        onClick={() => handleNewCategory(null)}
                    >
                        <Plus size={18} />
                        <span>Nueva categoría</span>
                    </button>
                </div>

                <CategoryTable
                    refreshKey={refreshKey}
                    onEdit={handleEditCategory}
                    onAddSubcategory={handleNewCategory}
                />
            </div>
        </div>
    );
}

export default Categories;