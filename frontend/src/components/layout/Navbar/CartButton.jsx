import { ShoppingCart } from "@phosphor-icons/react";

import { useCart } from "../../../hooks/useCart";

function CartButton() {
    const { count, openDrawer } = useCart();

    return (
        <button
            type="button"
            className="cart-button"
            onClick={openDrawer}
            title="Ver carrito"
            aria-label="Ver carrito"
        >
            <ShoppingCart weight="bold" />

            <span className="cart-badge">
                {count > 99 ? "99+" : count}
            </span>
        </button>
    );
}

export default CartButton;