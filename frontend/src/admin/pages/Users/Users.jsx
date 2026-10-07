import { useState } from "react";
import { Plus, Users as UsersIcon } from "lucide-react";
import "./Users.css";
import UserTable from "../../components/UserTable/UserTable";

function Users() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [openNewUserModal, setOpenNewUserModal] = useState(false);

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1);
    };

    const handleOpenNewUser = () => {
        setOpenNewUserModal(true);
    };

    const handleCloseNewUser = () => {
        setOpenNewUserModal(false);
    };

    return (
        <div className="users-page-wrapper">
            {/* Formas decorativas ambientales en fondo */}
            <div className="dash-bg-shape shape-top" />
            <div className="dash-bg-shape shape-bottom" />

            <div className="users-content-container">
                {/* ENCABEZADO PRINCIPAL DE USUARIOS SEGÚN MOCKUP */}
                <div className="users-hero-header">
                    <div className="users-hero-left">
                        <div className="users-hero-icon-box">
                            <UsersIcon size={22} color="#6A2CA0" />
                        </div>
                        <div className="users-hero-titles">
                            <h1 className="users-hero-title">Usuarios</h1>
                            <p className="users-hero-subtitle">
                                Administra todos los usuarios registrados en la plataforma.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="new-user-btn"
                        onClick={handleOpenNewUser}
                    >
                        <Plus size={18} />
                        <span>Nuevo usuario</span>
                    </button>
                </div>

                {/* TABLA DE USUARIOS Y FILTROS */}
                <UserTable
                    refreshKey={refreshKey}
                    onAction={handleRefresh}
                    openNewUserModal={openNewUserModal}
                    onCloseNewUser={handleCloseNewUser}
                />
            </div>
        </div>
    );
}

export default Users;