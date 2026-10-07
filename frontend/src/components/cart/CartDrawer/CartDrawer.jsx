/* =====================================================
   CartDrawer — panel lateral con el resumen del carrito
   ----------------------------------------------------
   Fuente unica: useCart() (provider).
===================================================== */

import { useEffect } from "react";

import { useNavigate } from "react-router-dom";

import { Loader2, Minus, Plus, ShoppingBag, X } from "lucide-react";

import { useAuth } from "../../../hooks/useAuth";

import { useCart } from "../../../hooks/useCart";

import NoImage from "../../../assets/images/Imagen no disponible.png";
import { mediaUrl } from "../../../utils/mediaUrl";

import "./CartDrawer.css";

const formatearPesos = (valor) => {

    const numero = Number(valor);

    if (Number.isNaN(numero)) return "$0";

    return `$${numero.toLocaleString("es-CO")}`;

};

function CartDrawer() {

    const { usuario } = useAuth();

    const {
        items,
        loading,
        total,
        isDrawerOpen,
        closeDrawer,
        updateQty,
        removeItem,
    } = useCart();

    const navigate = useNavigate();

    // Bloquear scroll del body cuando el drawer esta abierto
    useEffect(() => {

        if (isDrawerOpen) {

            document.body.style.overflow = "hidden";

        } else {

            document.body.style.overflow = "";

        }

        return () => { document.body.style.overflow = ""; };

    }, [isDrawerOpen]);

    // Cerrar con tecla ESC
    useEffect(() => {

        if (!isDrawerOpen) return;

        const onKey = (e) => {

            if (e.key === "Escape") closeDrawer();

        };

        window.addEventListener("keydown", onKey);

        return () => window.removeEventListener("keydown", onKey);

    }, [isDrawerOpen, closeDrawer]);

    if (!isDrawerOpen) return null;

    const handleCheckout = () => {

        closeDrawer();

        navigate("/checkout");

    };

    const irAlCarrito = () => {

        closeDrawer();

        navigate("/cart");

    };

    return (

        <div className="cart-drawer-overlay" onClick={closeDrawer}>

            <aside
                className="cart-drawer"
                role="dialog"
                aria-label="Carrito de compras"
                onClick={(e) => e.stopPropagation()}
            >

                <header className="cart-drawer-header">

                    <h3>
                        <ShoppingBag size={18} />
                        Tu carrito
                    </h3>

                    <button
                        type="button"
                        className="cart-drawer-close"
                        onClick={closeDrawer}
                        title="Cerrar"
                    >
                        <X size={18} />
                    </button>

                </header>

                <div className="cart-drawer-body">

                    {loading ? (

                        <div className="cart-drawer-loading">
                            <Loader2 size={28} className="spin" />
                            <p>Cargando...</p>
                        </div>

                    ) : items.length === 0 ? (

                        <div className="cart-drawer-empty">

                            <ShoppingBag size={48} />

                            <p>Tu carrito está vacío</p>

                            {!usuario && (
                                <small>Tus productos se guardan en este dispositivo.</small>
                            )}

                            <button
                                type="button"
                                className="cart-drawer-cta"
                                onClick={() => {
                                    closeDrawer();
                                    navigate("/");
                                }}
                            >
                                Explorar productos
                            </button>

                        </div>

                    ) : (

                        <ul className="cart-drawer-list">

                            {items.map((item) => {

                                const subtotal =
                                    Number(item.producto_precio || 0) *
                                    Number(item.cantidad || 0);

                                const key = item.id_item || item.variante_id;

                                return (

                                    <li key={key} className="cart-drawer-item">

                                        <div className="cart-drawer-item-img">
                                            <img
                                                src={mediaUrl(item.imagen, NoImage)}
                                                alt={item.producto_nombre}
                                                onError={(e) => { e.currentTarget.src = NoImage; }}
                                            />
                                        </div>

                                        <div className="cart-drawer-item-info">

                                            <h4>{item.producto_nombre}</h4>

                                            <small>
                                                {item.color} · Talla {item.talla}
                                            </small>

                                            <div className="cart-drawer-qty">

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQty(item, Math.max(1, Number(item.cantidad) - 1))
                                                    }
                                                    disabled={item.cantidad <= 1}
                                                    title="Disminuir"
                                                >
                                                    <Minus size={12} />
                                                </button>

                                                <span>{item.cantidad}</span>

                                                <button
                                                    type="button"
                                                    onClick={() => updateQty(item, Number(item.cantidad) + 1)}
                                                    disabled={item.stock ? item.cantidad >= item.stock : false}
                                                    title="Aumentar"
                                                >
                                                    <Plus size={12} />
                                                </button>

                                            </div>

                                        </div>

                                        <div className="cart-drawer-item-right">

                                            <strong>{formatearPesos(subtotal)}</strong>

                                            <button
                                                type="button"
                                                className="cart-drawer-remove"
                                                onClick={() => removeItem(item)}
                                                title="Eliminar"
                                            >
                                                <X size={14} />
                                            </button>

                                        </div>

                                    </li>

                                );

                            })}

                        </ul>

                    )}

                </div>

                {items.length > 0 && (

                    <footer className="cart-drawer-footer">

                        <div className="cart-drawer-total">
                            <span>Total</span>
                            <strong>{formatearPesos(total)}</strong>
                        </div>

                        <button
                            type="button"
                            className="cart-drawer-checkout"
                            onClick={handleCheckout}
                        >
                            Finalizar compra
                        </button>

                        <button
                            type="button"
                            className="cart-drawer-view"
                            onClick={irAlCarrito}
                        >
                            Ver carrito completo
                        </button>

                    </footer>

                )}

            </aside>

        </div>

    );

}

export default CartDrawer;
