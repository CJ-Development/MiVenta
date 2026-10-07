import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";

import AuthProvider from "./context/AuthProvider";
import CartProvider from "./context/CartProvider";
import { NotificationProvider } from "./components/Notifications/NotificationProvider";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>

        <NotificationProvider>

            <AuthProvider>

                    <CartProvider>

                        <BrowserRouter>

                            <App />

                        </BrowserRouter>

                    </CartProvider>

            </AuthProvider>

        </NotificationProvider>

    </React.StrictMode>
);