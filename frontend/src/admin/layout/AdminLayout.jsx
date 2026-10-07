import "./AdminLayout.css";
import AdminTopNav from "../components/AdminTopNav/AdminTopNav";
import { Outlet } from "react-router-dom";
import { ToastProvider } from "../components/Toast/ToastHost";
import SEO from "../../components/SEO/SEO";

function AdminLayout() {
    return (
        <ToastProvider>
            <SEO
                title="Panel de administración — miVenta.co"
                description="Panel administrativo de miVenta.co. Gestión y supervisión de tienda."
                path="/admin"
                noindex={true}
            />
            <div className="mv-admin-layout">
                {/* Header superior completo sin sidebar */}
                <AdminTopNav />

                <main className="mv-admin-content">
                    <Outlet />
                </main>
            </div>
        </ToastProvider>
    );
}

export default AdminLayout;