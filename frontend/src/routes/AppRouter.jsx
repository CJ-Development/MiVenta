import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

// ============================================================
// PÚBLICAS
// ============================================================

import Home from "../pages/Home/Home";
import Nosotros from "../pages/Nosotros/Nosotros";
import TerminosCondiciones from "../pages/Legal/TerminosCondiciones";
import PoliticaDatos from "../pages/Legal/PoliticaDatos";

// ============================================================
// CLIENTE
// ============================================================

import ClientProducts from "../pages/Products/Products";
import ProductDetailPage from "../pages/Products/ProductDetailPage/ProductDetailPage";
import Faq from "../pages/Faq/Faq";
import Cambios from "../pages/Cambios/Cambios";

import Cart from "../pages/Cart/Cart";
import Checkout from "../pages/Checkout/Checkout";

// ============================================================
// ADMIN
// ============================================================

import AdminLayout from "../admin/layout/AdminLayout";
import Dashboard from "../admin/pages/Dashboard";
import AdminRoute from "./AdminRoute";
import AdminLogin from "../admin/pages/Login/Login";

import AdminProducts from "../admin/pages/Products/Products";
import Categories from "../admin/pages/Categories/Categories";
import AdminOffers from "../admin/pages/Offers/Offers";
import Orders from "../admin/pages/Orders/Orders";
import Users from "../admin/pages/Users/Users";
import Settings from "../admin/pages/Settings/Settings";


function AppRouter() {

    return (

        <Routes>

            {/* ==================================================
                SITIO PÚBLICO
            ================================================== */}

            <Route element={<MainLayout />}>

                {/* INICIO */}

                <Route
                    path="/"
                    element={<Home />}
                />


                <Route
                    path="/nosotros"
                    element={<Nosotros />}
                />

                <Route
                    path="/ayuda"
                    element={<Faq />}
                />

                <Route
                    path="/cambios"
                    element={<Cambios />}
                />

                {/* LEGAL */}
                <Route
                    path="/terminos"
                    element={<TerminosCondiciones />}
                />
                <Route
                    path="/terminos-y-condiciones"
                    element={<TerminosCondiciones />}
                />
                <Route
                    path="/politica-de-privacidad"
                    element={<PoliticaDatos />}
                />
                <Route
                    path="/privacidad"
                    element={<PoliticaDatos />}
                />


                {/* PRODUCTOS - CLIENTE */}

                <Route
                    path="/products"
                    element={<ClientProducts />}
                />


                {/* DETALLE DE PRODUCTO POR SLUG */}

                <Route
                    path="/producto/:slug"
                    element={<ProductDetailPage />}
                />


                {/* ==================================================
                    CATEGORÍAS
                ================================================== */}

                <Route
                    path="/hombre"
                    element={<ClientProducts />}
                />

                <Route
                    path="/mujer"
                    element={<ClientProducts />}
                />

                <Route
                    path="/nino"
                    element={<ClientProducts />}
                />

                <Route
                    path="/categoria/:slug"
                    element={<ClientProducts />}
                />




                {/* ==================================================
                    USUARIO
                ================================================== */}

                <Route
                    path="/cart"
                    element={<Cart />}
                />

                <Route
                    path="/checkout"
                    element={<Checkout />}
                />

            </Route>


            {/* ==================================================
                PANEL ADMINISTRADOR
            ================================================== */}

            <Route path="/admin/login" element={<AdminLogin />} />

            <Route
                path="/admin"
                element={
                    <AdminRoute>
                        <AdminLayout />
                    </AdminRoute>
                }>
                {/* DASHBOARD */}

                <Route
                    index
                    element={<Dashboard />}
                />


                {/* CATEGORÍAS */}

                <Route
                    path="categories"
                    element={<Categories />}
                />


                {/* PRODUCTOS - ADMIN */}

                <Route
                    path="products"
                    element={<AdminProducts />}
                />


                {/* OFERTAS - ADMIN */}

                <Route
                    path="offers"
                    element={<AdminOffers />}
                />


                {/* PEDIDOS */}

                <Route
                    path="orders"
                    element={<Orders />}
                />


                {/* USUARIOS */}

                <Route
                    path="users"
                    element={<Users />}
                />


                {/* CONFIGURACIÓN */}

                <Route
                    path="configuracion"
                    element={<Settings />}
                />

            </Route>

        </Routes>

    );

}

export default AppRouter;