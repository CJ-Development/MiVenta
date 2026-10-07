import { useState } from "react";
import { Plus, ShoppingCart } from "lucide-react";
import "./Orders.css";
import OrderTable from "../../components/OrderTable/OrderTable";

function Orders() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [openNewOrderModal, setOpenNewOrderModal] = useState(false);

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1);
    };

    const handleOpenNewOrder = () => {
        setOpenNewOrderModal(true);
    };

    const handleCloseNewOrder = () => {
        setOpenNewOrderModal(false);
    };

    return (
        <div className="orders-page-wrapper">
            {/* Formas decorativas ambientales en fondo */}
            <div className="dash-bg-shape shape-top" />
            <div className="dash-bg-shape shape-bottom" />

            <div className="orders-content-container">
                {/* ENCABEZADO PRINCIPAL DE PEDIDOS SEGÚN MOCKUP */}
                <div className="orders-hero-header">
                    <div className="orders-hero-left">
                        <div className="orders-hero-icon-box">
                            <ShoppingCart size={22} color="#6A2CA0" />
                        </div>
                        <div className="orders-hero-titles">
                            <h1 className="orders-hero-title">Pedidos</h1>
                            <p className="orders-hero-subtitle">
                                Consulta y administra los pedidos realizados por los clientes.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="new-order-btn"
                        onClick={handleOpenNewOrder}
                    >
                        <Plus size={18} />
                        <span>Nuevo pedido</span>
                    </button>
                </div>

                {/* TABLA Y CARDS DE RESUMEN KPI */}
                <OrderTable
                    refreshKey={refreshKey}
                    onAction={handleRefresh}
                    openNewOrderModal={openNewOrderModal}
                    onCloseNewOrder={handleCloseNewOrder}
                />
            </div>
        </div>
    );
}

export default Orders;