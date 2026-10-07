/* =====================================================
   CartProvider — fuente de verdad unica para el carrito
   ----------------------------------------------------
   - Con usuario logueado: lee y muta via backend.
   - Sin usuario: lee y muta via localStorage (cartStorage.js).
   - syncOnLogin sube lo local al backend al autenticarse.
===================================================== */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { useAuth } from "../hooks/useAuth";

import {
    getMyCart,
    addToCart,
    updateCartItem,
    removeFromCart,
} from "../services/clientService";

import {
    readLocalCart,
    writeLocalCart,
    clearLocalCart,
    addLocalItem,
    updateLocalQty,
    removeLocalItem,
    countLocalCart,
    totalLocalCart,
} from "../utils/cartStorage";

export const CartContext = createContext();

function CartProvider({ children }) {

    const { usuario } = useAuth();

    const [items, setItems] = useState([]);

    const [loading, setLoading] = useState(true);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const lastUserIdRef = useRef(undefined);

    /* =====================================================
       CARGA INICIAL + REACCION AL USUARIO
    ===================================================== */

    const cargar = useCallback(async (uid) => {

        if (!uid) {

            // Sin usuario: leemos localStorage
            setItems(readLocalCart());
            setLoading(false);
            return;

        }

        try {

            setLoading(true);

            const { data } = await getMyCart(uid);

            const lista = (data && data.items) || [];

            // Mapear al formato comun
            setItems(
                lista.map((it) => ({
                    id_item: it.id_item,
                    variante_id: it.variante_id,
                    sku: it.sku,
                    stock: it.stock,
                    producto_id: it.producto_id,
                    producto_nombre: it.producto_nombre,
                    producto_slug: it.producto_slug,
                    producto_precio: it.producto_precio,
                    color: it.color,
                    talla: it.talla,
                    imagen: it.imagen,
                    cantidad: it.cantidad,
                }))
            );

        } catch (err) {

            console.error("CartProvider.cargar:", err);

            setItems([]);

        } finally {

            setLoading(false);

        }

    }, []);

    useEffect(() => {

        const uid = usuario?.id_usuario || null;

        // Cargar siempre al montar o cuando cambia el usuario
        if (lastUserIdRef.current !== uid) {

            lastUserIdRef.current = uid;

            cargar(uid);

        }

    }, [usuario?.id_usuario, cargar]);

    /* =====================================================
       AGREGAR
    ===================================================== */

    const addItem = useCallback(async (payload) => {

        const uid = usuario?.id_usuario;

        if (!uid) {
            const next = addLocalItem(payload);
            setItems(next);
            setIsDrawerOpen(true);
            return { ok: true, source: "local" };
        }

        try {
            await addToCart(uid, payload.variante_id, payload.cantidad || 1);
            await cargar(uid);
            setIsDrawerOpen(true);
            return { ok: true, source: "backend" };
        } catch (err) {
            console.error("CartProvider.addItem:", err);
            return { ok: false, error: err };
        }

    }, [usuario?.id_usuario, cargar]);

    /* =====================================================
       ACTUALIZAR CANTIDAD
    ===================================================== */

    const updateQty = useCallback(async (item, nuevaCantidad) => {

        const uid = usuario?.id_usuario;

        const qty = Math.max(1, Number(nuevaCantidad || 1));

        // Optimista
        setItems((prev) =>
            prev.map((it) =>
                esMismoItem(it, item) ? { ...it, cantidad: qty } : it
            )
        );

        if (!uid) {

            const varianteId = item.variante_id ?? item.id_item;

            const next = updateLocalQty(varianteId, qty);

            setItems(next);

            return { ok: true };

        }

        try {

            await updateCartItem(item.id_item, qty);

            return { ok: true };

        } catch (err) {

            console.error("CartProvider.updateQty:", err);

            // Revertir

            await cargar(uid);

            return { ok: false, error: err };

        }

    }, [usuario?.id_usuario, cargar]);

    /* =====================================================
       ELIMINAR
    ===================================================== */

    const removeItem = useCallback(async (item) => {

        const uid = usuario?.id_usuario;

        // Optimista
        setItems((prev) => prev.filter((it) => !esMismoItem(it, item)));

        if (!uid) {

            const varianteId = item.variante_id ?? item.id_item;

            const next = removeLocalItem(varianteId);

            setItems(next);

            return { ok: true };

        }

        try {

            await removeFromCart(item.id_item);

            return { ok: true };

        } catch (err) {

            console.error("CartProvider.removeItem:", err);

            await cargar(uid);

            return { ok: false, error: err };

        }

    }, [usuario?.id_usuario, cargar]);

    /* =====================================================
       LIMPIAR
    ===================================================== */

    const clear = useCallback(async () => {

        const uid = usuario?.id_usuario;

        if (!uid) {

            clearLocalCart();

            setItems([]);

            return;

        }

        // Limpieza en backend: eliminar uno a uno

        for (const it of items) {

            try {

                await removeFromCart(it.id_item);

            } catch (err) {

                console.error("CartProvider.clear:", err);

            }

        }

        setItems([]);

    }, [usuario?.id_usuario, items]);

    /* =====================================================
       SYNC AL LOGIN — sube items locales al backend
    ===================================================== */

    const syncOnLogin = useCallback(async (uid) => {

        if (!uid) return { ok: false, error: "Sin uid" };

        const locales = readLocalCart();

        if (locales.length === 0) {

            await cargar(uid);

            return { ok: true, count: 0 };

        }

        let count = 0;

        for (const it of locales) {

            try {

                await addToCart(uid, it.variante_id, it.cantidad || 1);

                count++;

            } catch (err) {

                console.error("syncOnLogin item error:", err);

            }

        }

        // Limpiar localStorage y recargar carrito del backend
        clearLocalCart();

        await cargar(uid);

        return { ok: true, count };

    }, [cargar]);

    /* =====================================================
       RECARGAR MANUAL — fuerza recarga desde backend
    ===================================================== */

    const recargar = useCallback(async () => {
        const uid = usuario?.id_usuario;
        if (!uid) return;
        await cargar(uid);
    }, [usuario?.id_usuario, cargar]);

    /* =====================================================
       DRAWER
    ===================================================== */

    const openDrawer = useCallback(() => setIsDrawerOpen(true), []);

    const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

    /* =====================================================
       DERIVADOS
    ===================================================== */

    const count = useMemo(
        () => items.reduce((acc, it) => acc + Number(it.cantidad || 0), 0),
        [items]
    );

    const total = useMemo(
        () => items.reduce(
            (acc, it) => acc + Number(it.producto_precio || 0) * Number(it.cantidad || 0),
            0
        ),
        [items]
    );

    /* =====================================================
       PROVEER
    ===================================================== */

    const value = useMemo(
        () => ({
            items,
            count,
            total,
            loading,
            isDrawerOpen,
            openDrawer,
            closeDrawer,
            addItem,
            updateQty,
            removeItem,
            clear,
            syncOnLogin,
            recargar,
            // Utilidades expuestas para componentes sin provider (poco frecuente)
            readLocalCart,
            countLocalCart,
            totalLocalCart,
        }),
        [
            items, count, total, loading, isDrawerOpen,
            openDrawer, closeDrawer, addItem, updateQty,
            removeItem, clear, syncOnLogin, recargar,
        ]
    );

    return (

        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>

    );

}

/* =====================================================
   Identifica el mismo item en el array, ya sea
   del backend (id_item) o local (variante_id).
===================================================== */

function esMismoItem(a, b) {

    if (a.id_item && b.id_item) return a.id_item === b.id_item;

    if (a.variante_id && b.variante_id) return a.variante_id === b.variante_id;

    return false;

}

export default CartProvider;
