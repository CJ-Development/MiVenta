import { useState } from "react";
import SimpleProductForm from "./SimpleProductForm";
import VariableProductForm from "./VariableProductForm";

/**
 * ProductForm
 * Componente principal / orquestador que despacha al formulario especializado correspondiente:
 * - SimpleProductForm: Para productos simples (sin atributos de color, diseño o talla).
 * - VariableProductForm: Para productos con variantes (catálogos de color, talla, diseño, SKU y matrices de stock).
 */
function ProductForm({ product, initialType = "simple", onClose, onSaved }) {
    const editing = Boolean(product?.id_producto);

    // Determinación del tipo de producto
    const [selectedType, setSelectedType] = useState(() => {
        if (product?.producto_simple === true) return "simple";
        if (product?.producto_simple === false) return "variantes";
        if (product?.variantes && product.variantes.length > 0) return "variantes";
        return initialType || "simple";
    });

    // En edición respetamos el tipo original guardado en base de datos
    if (editing) {
        if (product?.producto_simple) {
            return (
                <SimpleProductForm
                    product={product}
                    onClose={onClose}
                    onSaved={onSaved}
                />
            );
        }
        return (
            <VariableProductForm
                product={product}
                onClose={onClose}
                onSaved={onSaved}
            />
        );
    }

    // En creación permitimos alternar entre producto simple y con variantes
    if (selectedType === "simple") {
        return (
            <SimpleProductForm
                product={null}
                onClose={onClose}
                onSaved={onSaved}
                onSwitchToVariable={() => setSelectedType("variantes")}
            />
        );
    }

    return (
        <VariableProductForm
            product={null}
            onClose={onClose}
            onSaved={onSaved}
            onSwitchToSimple={() => setSelectedType("simple")}
        />
    );
}

export default ProductForm;
