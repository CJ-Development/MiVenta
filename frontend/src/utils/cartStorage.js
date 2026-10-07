/* =====================================================
   CartStorage — persistencia local del carrito anonimo
   ----------------------------------------------------
   Mismo formato de item que el backend devuelve:
   {
       id_item?: number,        // presente solo si viene del backend
       variante_id: number,
       sku: string,
       stock: number,
       producto_id: number,
       producto_nombre: string,
       producto_slug: string,
       producto_precio: number | string,
       color: string,
       talla: string,
       imagen: string | null,
       cantidad: number,
   }
===================================================== */

const KEY = "ventasya:cart:local";

export const readLocalCart = () => {
    try {
        return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
        return [];
    }
};

export const writeLocalCart = (items) => {
    localStorage.setItem(KEY, JSON.stringify(items));
};

export const clearLocalCart = () => {
    localStorage.removeItem(KEY);
};

export const addLocalItem = (item) => {
    const items = readLocalCart();
    const idx = items.findIndex((it) => it.variante_id === item.variante_id);

    if (idx >= 0) {
        const nuevaCantidad = Number(items[idx].cantidad || 0) + Number(item.cantidad || 1);
        items[idx] = {
            ...items[idx],
            ...item,
            cantidad: nuevaCantidad,
        };
    } else {
        items.push({
            ...item,
            cantidad: Number(item.cantidad || 1),
        });
    }

    writeLocalCart(items);
    return items;
};

export const updateLocalQty = (varianteId, cantidad) => {
    const items = readLocalCart();
    const next = items.map((it) =>
        it.variante_id === varianteId ? { ...it, cantidad: Math.max(1, Number(cantidad)) } : it
    );
    writeLocalCart(next);
    return next;
};

export const removeLocalItem = (varianteId) => {
    const next = readLocalCart().filter((it) => it.variante_id !== varianteId);
    writeLocalCart(next);
    return next;
};

export const countLocalCart = () =>
    readLocalCart().reduce((acc, it) => acc + Number(it.cantidad || 0), 0);

export const totalLocalCart = () =>
    readLocalCart().reduce(
        (acc, it) => acc + Number(it.producto_precio || 0) * Number(it.cantidad || 0),
        0
    );
