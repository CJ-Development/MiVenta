import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ProductDetail from "../ProductDetail/ProductDetail";

import { getProducts } from "../../../services/adminService";

import Breadcrumb from "../../../components/Breadcrumb/Breadcrumb";
import SEO from "../../../components/SEO/SEO";


/*
================================================================
PRODUCT DETAIL PAGE
----------------------------------------------------------------
Página propia (no modal) que resuelve el producto a partir del
slug de la URL y renderiza <ProductDetail /> pasándole el id.
================================================================
*/

function ProductDetailPage() {

    const { slug } = useParams();
    const navigate = useNavigate();

    const [productId, setProductId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {

        let cancelado = false;

        const resolver = async () => {

            if (!slug) {
                setError("Producto no especificado.");
                setLoading(false);
                return;
            }

            try {

                const { data } = await getProducts();
                const lista = Array.isArray(data) ? data : [];

                const encontrado = lista.find(
                    (p) => p.slug === slug
                );

                if (cancelado) return;

                if (encontrado) {

                    setProductId(encontrado.id_producto);
                    setError(null);

                } else {

                    setError("El producto que buscas no existe o ya no está disponible.");

                }

            } catch (err) {

                console.error(err);

                if (!cancelado) {
                    setError("No fue posible cargar el producto.");
                }

            } finally {

                if (!cancelado) {
                    setLoading(false);
                }

            }

        };

        resolver();

        return () => {
            cancelado = true;
        };

    }, [slug]);


    if (loading) {
        return (
            <main className="product-detail">
                <div className="product-detail-wrapper">
                    <Breadcrumb items={[{ label: "Cargando..." }]} />
                </div>
            </main>
        );
    }

    if (error || productId === null) {
        return (
            <main className="product-detail">
                <SEO
                    title="Producto no encontrado | MiVenta"
                    description="El producto que buscas no está disponible en MiVenta."
                    noindex={true}
                />
                <div className="product-detail-wrapper">
                    <Breadcrumb items={[{ label: "Producto no encontrado" }]} />
                    <div className="product-detail-state">
                        <p>
                            {error || "Producto no encontrado."}
                        </p>
                        <button
                            type="button"
                            className="detail-back-button"
                            onClick={() => navigate("/products")}
                        >
                            Ver todos los productos
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <ProductDetail
            key={productId}
            productId={productId}
        />
    );

}


export default ProductDetailPage;
