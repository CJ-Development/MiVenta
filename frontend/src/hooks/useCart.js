import { useContext } from "react";
import { CartContext } from "../context/CartProvider";

export const useCart = () => useContext(CartContext);
