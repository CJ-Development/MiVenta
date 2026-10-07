import "./ProductPreview.css";
import { useEffect, useState } from "react";
import { Heart, ShoppingCart, Truck, ShieldCheck, RotateCcw, X } from "lucide-react";
import { getProduct } from "../../../services/adminService";
import NoImage from "../../../assets/images/Imagen no disponible.png";

const API_ORIGIN = "http://127.0.0.1:8000";
const mediaUrl = (value) => value && !value.startsWith("http") ? `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}` : value;

function ProductPreview({ productId, onClose }) {
    const [producto, setProducto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let alive = true;
        getProduct(productId).then(({ data }) => alive && setProducto(data)).catch((err) => {
            console.error(err);
            if (alive) setError("No fue posible cargar el producto.");
        }).finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [productId]);

    if (loading) return <div className="preview-overlay"><div className="preview-container"><div className="preview-loading">Cargando vista previa...</div></div></div>;
    if (error || !producto) return <div className="preview-overlay"><div className="preview-container"><div className="preview-header"><h3>Vista previa</h3><button className="preview-close" onClick={onClose}><X size={20} /></button></div><div className="preview-empty">{error || "Producto no encontrado."}</div></div></div>;

    const todasImagenes = (producto.variantes || []).flatMap((v) => v.imagenes || []);
    const principal = todasImagenes.find((img) => img.principal) || todasImagenes[0];
    const imagenPrincipal = mediaUrl(principal?.imagen) || NoImage;
    const coloresUnicos = Array.from(new Map((producto.variantes || []).map((v) => [v.color?.id_color, v.color])).values()).filter(Boolean);
    const tallasUnicas = Array.from(new Map((producto.variantes || []).map((v) => [v.talla?.id_talla, v.talla])).values()).filter(Boolean);

    return <div className="preview-overlay"><div className="preview-container">
        <div className="preview-header"><div><h3>Vista previa del producto</h3><span className="preview-preview-tag">SOLO PREVIEW</span></div><button className="preview-close" onClick={onClose}><X size={20} /></button></div>
        <main className="product-detail"><section className="product-container">
            <section className="product-gallery"><aside className="gallery-thumbnails">{todasImagenes.length ? todasImagenes.slice(0, 4).map((img, i) => <img key={i} src={mediaUrl(img.imagen)} alt="" />) : <img src={NoImage} alt="" />}</aside><div className="gallery-main"><img src={imagenPrincipal} alt={producto.nombre} /></div></section>
            <section className="product-info"><span className="product-category">{(producto.categoria?.nombre || "PRODUCTO").toUpperCase()}</span><h1>{producto.nombre}</h1><p className="product-reference">Referencia #{producto.id_producto}</p><div className="product-price">${Number(producto.precio).toLocaleString("es-CO")}</div><div className="product-description">{producto.descripcion || "Sin descripción."}</div>
                {coloresUnicos.length > 0 && <><h4 className="option-title">COLOR DISPONIBLE</h4><div className="colors">{coloresUnicos.map((c) => <span key={c.id_color} className="color" style={{ background: c.codigo_hex || "#ccc" }} title={c.nombre} />)}</div></>}
                {tallasUnicas.length > 0 && <><h4 className="option-title">TALLA</h4><div className="sizes">{tallasUnicas.map((t) => <button key={t.id_talla} type="button">{t.nombre}</button>)}</div></>}
                <h4 className="option-title">CANTIDAD</h4><div className="quantity"><button type="button">-</button><span>1</span><button type="button">+</button></div>
                <div className="services"><span><Truck size={16} /> Envíos</span><span><RotateCcw size={16} /> 30 días</span><span><ShieldCheck size={16} /> Compra segura</span></div>
                <div className="buttons"><button className="buy-button" type="button"><ShoppingCart size={18} />Agregar al carrito</button><button className="favorite" type="button"><Heart size={20} /></button></div>
            </section>
        </section></main>
    </div></div>;
}

export default ProductPreview;
