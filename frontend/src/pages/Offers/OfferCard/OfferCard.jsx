import "./OfferCard.css";
import NoImage from "../../../assets/images/Imagen no disponible.png";
import { mediaUrl } from "../../../utils/mediaUrl";
import { useNavigate } from "react-router-dom";

/*
================================================================
OFFER CARD
================================================================
Misma estructura visual que ProductCard para que /offers se
vea idéntico a /products, pero con la lógica de oferta:

- Sin favoritos ni carrito (la acción es abrir el detalle del
  producto asociado).
- El badge de descuento es la pieza visual principal y siempre
  se muestra (en /offers todas las tarjetas son promociones).
- El precio anterior se calcula desde el producto base y el
  descuento definido en la oferta.
================================================================
*/

const formatearPesos = (valor) => {
    const numero = Number(valor);
    if (Number.isNaN(numero)) return "$0";
    return `$${numero.toLocaleString("es-CO")}`;
};

function resolverImagen(producto) {
    if (!producto) return NoImage;

    const variantes = Array.isArray(producto.variantes) ? producto.variantes : [];
    for (const variante of variantes) {
        const imagenes = Array.isArray(variante.imagenes) ? variante.imagenes : [];
        const principal = imagenes.find((img) => img.principal === true);
        if (principal?.imagen) return mediaUrl(principal.imagen, NoImage);
        if (imagenes[0]?.imagen) return mediaUrl(imagenes[0].imagen, NoImage);
    }
    return NoImage;
}

/* Calcula el precio final y el porcentaje equivalente que se
 * muestra en el badge. Si el descuento es fijo, traducimos el
 * valor absoluto a porcentaje para que el badge sea siempre -X%. */
function calcularPrecioOferta(oferta) {
    const producto = oferta?.producto_detalle;
    if (!producto) return { original: null, nuevo: null, porcentaje: 0 };

    const original = Number(producto.precio);
    if (!Number.isFinite(original)) return { original: null, nuevo: null, porcentaje: 0 };

    const valor = Number(oferta.valor);
    let nuevo = original;
    let porcentaje = 0;

    if (oferta.tipo_descuento === "porcentaje") {
        porcentaje = Math.round(valor);
        nuevo = original - (original * valor) / 100;
    } else {
        nuevo = original - valor;
        if (original > 0) {
            porcentaje = Math.round((valor / original) * 100);
        }
    }

    nuevo = Math.max(0, nuevo);
    return { original, nuevo, porcentaje };
}

function OfferCard({ offer, onSelect }) {

    const navigate = useNavigate();

    const producto = offer?.producto_detalle;
    const imageUrl = resolverImagen(producto);
    const { original, nuevo, porcentaje } = calcularPrecioOferta(offer);

    const handleOpen = () => {

        if (onSelect) {
            onSelect(producto.id_producto);
            return;
        }


        if (producto?.slug) {
            navigate(`/producto/${producto.slug}`);
        }

    };

    const handleImageError = (e) => {
        if (e.currentTarget.src.includes("Imagen") || e.currentTarget.src.includes("no-image")) return;
        e.currentTarget.src = NoImage;
        e.currentTarget.classList.add("is-fallback");
    };

    const handleButton = (e) => {
        e.stopPropagation();
        handleOpen();
    };

    return (
        <article className="pc-card" onClick={handleOpen}>
            {/* IMAGEN */}
            <div className="pc-image">
                <img
                    src={imageUrl}
                    alt={producto?.nombre || offer?.nombre || "Oferta"}
                    onError={handleImageError}
                    loading="lazy"
                    decoding="async"
                />

                {/* DESCUENTO (siempre visible en /offers) */}
                {porcentaje > 0 && (
                    <span className="pc-discount">
                        -{porcentaje}%
                    </span>
                )}
            </div>

            {/* CONTENIDO */}
            <div className="pc-content">
                <span className="pc-category">
                    {producto?.categoria?.nombre || "Oferta"}
                </span>

                <h3>
                    {producto?.nombre || offer?.nombre || "Oferta"}
                </h3>

                {original !== null && nuevo !== null && (
                    <div className="pc-price">
                        {original !== nuevo && (
                            <span className="pc-price-old">
                                {formatearPesos(original)}
                            </span>
                        )}
                        <span className="pc-price-current">
                            {formatearPesos(nuevo)}
                        </span>
                    </div>
                )}

                <button
                    type="button"
                    className="pc-cart-button"
                    onClick={handleButton}
                >
                    <span>Ver producto</span>
                </button>
            </div>
        </article>
    );
}

export default OfferCard;
