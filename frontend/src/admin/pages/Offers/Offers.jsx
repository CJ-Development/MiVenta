import { useState } from "react";
import { Plus, Tag } from "lucide-react";
import "./Offers.css";

import OfferForm from "../../components/OfferForm/OfferForm";
import OfferTable from "../../components/OfferTable/OfferTable";

function Offers() {
    const [showForm, setShowForm] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleNewOffer = () => {
        setSelectedOffer(null);
        setShowForm(true);
    };

    const handleEditOffer = (oferta) => {
        setSelectedOffer(oferta);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setSelectedOffer(null);
        setShowForm(false);
    };

    const handleCreated = () => {
        setRefreshKey((prev) => prev + 1);
        setShowForm(false);
        setSelectedOffer(null);
    };

    if (showForm) {
        return (
            <OfferForm
                offer={selectedOffer}
                onClose={handleCloseForm}
                onCreated={handleCreated}
            />
        );
    }

    return (
        <div className="offers-page-wrapper">
            {/* Formas decorativas ambientales en fondo */}
            <div className="dash-bg-shape shape-top" />
            <div className="dash-bg-shape shape-bottom" />

            <div className="offers-content-container">
                {/* ENCABEZADO PRINCIPAL DE OFERTAS SEGÚN MOCKUP */}
                <div className="offers-hero-header">
                    <div className="offers-hero-left">
                        <div className="offers-hero-icon-box">
                            <Tag size={22} color="#6A2CA0" />
                        </div>
                        <div className="offers-hero-titles">
                            <h1 className="offers-hero-title">Ofertas</h1>
                            <p className="offers-hero-subtitle">
                                Crea y administra las promociones de tu tienda.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="new-offer-btn"
                        onClick={handleNewOffer}
                    >
                        <Plus size={18} />
                        <span>Nueva oferta</span>
                    </button>
                </div>

                {/* TABLA Y CARDS DE RESUMEN KPI */}
                <OfferTable
                    refreshKey={refreshKey}
                    onEdit={handleEditOffer}
                    onNewOffer={handleNewOffer}
                />
            </div>
        </div>
    );
}

export default Offers;
