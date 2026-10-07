/* =====================================================
   Módulo legacy: re-exporta el cliente único
   - Conserva compatibilidad con imports existentes:
     `import { login } from "../../api/axios"`
     `import { getUsers } from "../../../api/axios"`
   - La implementación real vive en /services/api.js
===================================================== */

export {
    default,
    register,
    login,
    getUsers,
    getUser,
    updateUser,
    deleteUser,
} from "../services/api";