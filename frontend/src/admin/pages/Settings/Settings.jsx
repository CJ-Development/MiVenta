import "./Settings.css";

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

import {
    User,
    Shield,
    ChevronRight,
    ArrowLeft,
} from "lucide-react";

import ProfileSection from "./components/ProfileSection";
import SecuritySection from "./components/SecuritySection";

function Settings() {
    const { usuario } = useAuth();
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get("tab");

    const [activeSection, setActiveSection] = useState(tabParam || null);

    useEffect(() => {
        if (tabParam === "profile" || tabParam === "security") {
            setActiveSection(tabParam);
        }
    }, [tabParam]);

    const sections = [
        {
            id: "profile",
            title: "Mi perfil",
            description: "Información personal y datos de la cuenta",
            icon: User,
        },
        {
            id: "security",
            title: "Seguridad",
            description: "Cambio y administración de contraseña",
            icon: Shield,
        },
    ];

    const handleBack = () => {
        setActiveSection(null);
    };

    return (
        <div className="settings-page">
            <div className="settings-page-header">
                <div>
                    <h1>Configuración</h1>
                    <p>
                        {activeSection === "profile"
                            ? "Administra tu perfil e información personal"
                            : activeSection === "security"
                            ? "Administra tu contraseña y seguridad de acceso"
                            : "Administra tu cuenta de administrador"}
                    </p>
                </div>
            </div>

            {!activeSection ? (
                <div className="settings-grid">
                    {sections.map((section) => {
                        const Icon = section.icon;

                        return (
                            <button
                                key={section.id}
                                className="settings-card"
                                onClick={() => setActiveSection(section.id)}
                                type="button"
                            >
                                <div className="settings-card-icon">
                                    <Icon size={24} />
                                </div>

                                <div className="settings-card-content">
                                    <h3>{section.title}</h3>
                                    <p>{section.description}</p>
                                </div>

                                <div className="settings-card-arrow">
                                    <ChevronRight size={20} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="settings-section-container">
                    <button
                        className="settings-back-button"
                        onClick={handleBack}
                        type="button"
                    >
                        <ArrowLeft size={16} />
                        <span>Volver a opciones</span>
                    </button>

                    {activeSection === "profile" && (
                        <ProfileSection usuario={usuario} />
                    )}

                    {activeSection === "security" && (
                        <SecuritySection usuario={usuario} />
                    )}
                </div>
            )}
        </div>
    );
}

export default Settings;