import { useState } from "react";
import { Package, Plus } from "lucide-react";
import "./Products.css";

import ProductForm from "../../components/ProductForm/ProductForm";
import ProductTable from "../../components/ProductTable/ProductTable";

function Products() {
    const [openForm, setOpenForm] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [creationType, setCreationType] = useState("simple");

    const handleNewSimpleProduct = () => {
        setSelectedProduct(null);
        setCreationType("simple");
        setOpenForm(true);
    };

    const handleNewVariableProduct = () => {
        setSelectedProduct(null);
        setCreationType("variantes");
        setOpenForm(true);
    };

    const handleEditProduct = (product) => {
        setSelectedProduct(product);
        setOpenForm(true);
    };

    const closeForm = () => {
        setOpenForm(false);
        setSelectedProduct(null);
    };

    const handleSaved = async () => {
        setRefreshKey((prev) => prev + 1);
    };

    if (openForm) {
        return (
            <div className="products-page-wrapper">
                <ProductForm
                    product={selectedProduct}
                    initialType={creationType}
                    onClose={closeForm}
                    onSaved={handleSaved}
                />
            </div>
        );
    }

    return (
        <div className="products-page-wrapper">
            {/* Formas decorativas suaves de fondo */}
            <div className="dash-bg-shape shape-top" />
            <div className="dash-bg-shape shape-bottom" />

            <div className="products-main-card">
                {/* ENCABEZADO DE PRODUCTOS SEGÚN REFERENCIA */}
                <header className="products-hero-header">
                    <div className="products-hero-left">
                        <div className="products-hero-icon-box">
                            <Package size={26} color="#ffffff" strokeWidth={2.2} />
                        </div>
                        <div className="products-hero-titles">
                            <h1 className="products-hero-title">Productos</h1>
                            <p className="products-hero-subtitle">
                                Gestiona tu catálogo, inventario y variantes.
                            </p>
                        </div>
                    </div>

                    <div className="products-hero-actions">
                        <button
                            type="button"
                            className="btn-create-simple-pill"
                            onClick={handleNewSimpleProduct}
                            title="Crear un producto de venta directa sin variantes de color o talla"
                        >
                            <Plus size={16} strokeWidth={2.6} />
                            <span>Producto simple</span>
                        </button>

                        <button
                            type="button"
                            className="btn-create-variable-pill"
                            onClick={handleNewVariableProduct}
                            title="Crear un producto con múltiples variantes de color, talla o diseño"
                        >
                            <Plus size={16} strokeWidth={2.6} />
                            <span>Con variantes</span>
                        </button>
                    </div>
                </header>

                {/* TABLA Y FILTROS */}
                <ProductTable
                    refreshKey={refreshKey}
                    onEdit={handleEditProduct}
                />
            </div>
        </div>
    );
}

export default Products;
