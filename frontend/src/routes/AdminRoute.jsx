import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { esAdmin } from "../utils/esAdmin";

function AdminRoute({ children }) {

    const { usuario, loading } = useAuth();

    if (loading) {

        return <div>Cargando...</div>;

    }

    if (!usuario) {

        return <Navigate to="/admin/login" replace />;

    }

    if (!esAdmin(usuario)) {

        return <Navigate to="/" replace />;

    }

    return children;

}

export default AdminRoute;