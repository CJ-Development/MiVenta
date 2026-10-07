    import { useEffect, useState } from "react";

    import { Link } from "react-router-dom";

    import {
        CheckCircle2,
        Clock,
        Loader2,
        Package,
        PackageSearch,
        Phone,
        Truck,
        X,
    } from "lucide-react";

    import { useAuth } from "../../hooks/useAuth";

    import { getMyOrders, getOrderDetail } from "../../services/clientService";

    import "./Orders.css";

    const formatearPesos = (valor) => {
        const numero = Number(valor);
        if (Number.isNaN(numero)) return "$0";
        return `$${numero.toLocaleString("es-CO")}`;
    };

    const formatearFecha = (iso) => {
        if (!iso) return "—";
        const fecha = new Date(iso);
        if (Number.isNaN(fecha.getTime())) return iso;
        return fecha.toLocaleDateString("es-CO", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    };

    const formatearHora = (iso) => {
        if (!iso) return "";
        const fecha = new Date(iso);
        if (Number.isNaN(fecha.getTime())) return "";
        return fecha.toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const TIMELINE = [
        { key: "pendiente", label: "Recibido", icon: Clock },
        { key: "pagado", label: "Pagado", icon: CheckCircle2 },
        { key: "enviado", label: "En camino", icon: Truck },
        { key: "entregado", label: "Entregado", icon: Package },
    ];

    const estadoIndice = (estado) => {

        const idx = TIMELINE.findIndex((t) => t.key === estado);

        return idx === -1 ? 0 : idx;

    };

    const varianteEtiqueta = (detalle) => {

        if (!detalle) return "";

        if (detalle.variante_detalle && detalle.variante_detalle !== "") {

            return detalle.variante_detalle;

        }

        if (detalle.variante) return `Variante #${detalle.variante}`;

        if (detalle.producto_nombre) return detalle.producto_nombre;

        return `Producto`;

    };

    function Orders() {

        const { usuario } = useAuth();

        const [pedidos, setPedidos] = useState([]);

        const [loading, setLoading] = useState(true);

        const [error, setError] = useState(null);

        const [detalle, setDetalle] = useState(null);

        const [cargandoDetalle, setCargandoDetalle] = useState(false);

        const cargarPedidos = async () => {

            if (!usuario?.id_usuario) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const { data } = await getMyOrders(usuario.id_usuario);
                setPedidos(data || []);
                setError(null);
            }
            catch (err) {
                console.error(err);
                setError("No fue posible cargar tus pedidos.");
            }
            finally {
                setLoading(false);
            }

        };

        useEffect(() => {
            cargarPedidos();
        }, [usuario?.id_usuario]);

        const abrirDetalle = async (pedido) => {

            setDetalle(pedido);

            try {

                setCargandoDetalle(true);

                const { data } = await getOrderDetail(pedido.id_compra);

                setDetalle(data);

            } catch (err) {

                // Si falla el detalle extra, conservamos el payload resumido.

                console.error("detalle pedido:", err);

            } finally {

                setCargandoDetalle(false);

            }

        };

        if (!usuario) {

            return (
                <main className="orders-page">
                    <div className="orders-container">
                        <header className="orders-header">
                            <h1>
                                <Package size={28} />
                                Mis pedidos
                            </h1>
                            <p>Consulta el estado y el detalle de tus compras en un solo lugar.</p>
                        </header>
                        <div className="orders-empty">
                            <PackageSearch size={64} />
                            <h2>Debes iniciar sesión</h2>
                            <p>Para ver tus pedidos, primero inicia sesión.</p>
                            <Link to="/login" className="order-detail-button">
                                Iniciar sesión
                            </Link>
                        </div>
                    </div>
                </main>
            );

        }

        return (
            <main className="orders-page">
                <div className="orders-container">

                    <header className="orders-header">
                        <h1>
                            <Package size={28} />
                            Mis pedidos
                        </h1>
                        <p>
                            {pedidos.length > 0
                                ? `Tienes ${pedidos.length} pedido${pedidos.length === 1 ? "" : "s"} registrado${pedidos.length === 1 ? "" : "s"}.`
                                : "Consulta el estado y el detalle de tus compras en un solo lugar."}
                        </p>
                    </header>

                    {loading ? (
                        <div className="orders-loading">
                            <Loader2 size={32} className="orders-spin" />
                            <p>Cargando tus pedidos...</p>
                        </div>
                    ) : error ? (
                        <div className="orders-error">
                            <p>{error}</p>
                            <button onClick={cargarPedidos} className="order-detail-button">
                                Reintentar
                            </button>
                        </div>
                    ) : pedidos.length === 0 ? (
                        <div className="orders-empty">
                            <PackageSearch size={64} />
                            <h2>Aún no tienes pedidos</h2>
                            <p>Cuando hagas tu primera compra, aparecerá aquí con su detalle y seguimiento.</p>
                            <Link to="/" className="order-detail-button">
                                Ir a comprar
                            </Link>
                        </div>
                    ) : (
                        <div className="orders-list">
                            {pedidos.map((pedido) => {
                                const estado = pedido.estado_compra || "pendiente";
                                const indice = estadoIndice(estado);
                                return (
                                    <article key={pedido.id_compra} className="order-card">
                                        <div className="order-card-id">
                                            <span>Pedido #{pedido.id_compra}</span>
                                            <small>
                                                {formatearFecha(pedido.fecha_compra)}
                                                {pedido.fecha_compra ? ` · ${formatearHora(pedido.fecha_compra)}` : ""}
                                            </small>
                                        </div>

                                        <div className="order-card-meta">
                                            <strong>
                                                {pedido.detalles?.length || 0}{" "}
                                                producto{pedido.detalles?.length === 1 ? "" : "s"}
                                            </strong>
                                            {pedido.telefono_contacto ? (
                                                <span>
                                                    <Phone size={12} /> {pedido.telefono_contacto}
                                                </span>
                                            ) : (
                                                <span className="order-card-meta-empty">Sin teléfono</span>
                                            )}
                                        </div>

                                        <div className="order-card-total">
                                            {formatearPesos(pedido.total)}
                                        </div>

                                        <div className="order-card-actions">
                                            <span className={`order-status-badge ${estado}`}>
                                                {estado}
                                            </span>
                                            <button
                                                type="button"
                                                className="order-detail-button"
                                                onClick={() => abrirDetalle(pedido)}
                                            >
                                                Ver detalle
                                            </button>
                                        </div>

                                        <div className="order-card-progress" aria-label={`Estado: ${estado}`}>
                                            <div
                                                className="order-card-progress-fill"
                                                style={{
                                                    width: `${(indice / (TIMELINE.length - 1)) * 100}%`,
                                                }}
                                            />
                                            {TIMELINE.map((t, i) => {

                                                const Icono = t.icon;
                                                const reached = i <= indice;

                                                return (
                                                    <div
                                                        key={t.key}
                                                        className={
                                                            "order-step"
                                                            + (reached ? " order-step--done" : "")
                                                        }
                                                        title={t.label}
                                                    >
                                                        <Icono size={12} />
                                                    </div>
                                                );

                                            })}
                                        </div>

                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {detalle && (
                        <div
                            className="order-detail-overlay"
                            onClick={() => setDetalle(null)}
                        >
                            <div
                                className="order-detail-modal"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="modal-header">
                                    <div>
                                        <h2>Pedido #{detalle.id_compra}</h2>
                                        <small className="modal-header-date">
                                            {formatearFecha(detalle.fecha_compra)}
                                            {detalle.fecha_compra ? ` · ${formatearHora(detalle.fecha_compra)}` : ""}
                                        </small>
                                    </div>
                                    <button
                                        type="button"
                                        className="close-modal"
                                        onClick={() => setDetalle(null)}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* TIMELINE */}
                                <div className="order-timeline">
                                    {TIMELINE.map((t, i) => {

                                        const Icono = t.icon;
                                        const reached = i <= estadoIndice(detalle.estado_compra);

                                        return (
                                            <div
                                                key={t.key}
                                                className={
                                                    "timeline-step"
                                                    + (reached ? " timeline-step--done" : "")
                                                    + (i === estadoIndice(detalle.estado_compra) ? " timeline-step--current" : "")
                                                }
                                            >
                                                <div className="timeline-circle">
                                                    <Icono size={14} />
                                                </div>
                                                <span>{t.label}</span>
                                            </div>
                                        );

                                    })}
                                </div>

                                {/* RESUMEN */}
                                <div className="detail-summary">
                                    <div className="detail-summary-cell">
                                        <small>Estado</small>
                                        <span className={`order-status-badge ${detalle.estado_compra || "pendiente"}`}>
                                            {detalle.estado_compra || "pendiente"}
                                        </span>
                                    </div>
                                    <div className="detail-summary-cell">
                                        <small>Total</small>
                                        <strong>{formatearPesos(detalle.total)}</strong>
                                    </div>
                                    {detalle.telefono_contacto && (
                                        <div className="detail-summary-cell">
                                            <small>Contacto</small>
                                            <span>
                                                <Phone size={12} /> {detalle.telefono_contacto}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* PRODUCTOS */}
                                <div className="detail-section">
                                    <h3>Productos</h3>
                                    {cargandoDetalle && !detalle.detalles ? (
                                        <p className="detail-loading-inline">
                                            <Loader2 size={16} className="orders-spin" />
                                            Cargando productos...
                                        </p>
                                    ) : detalle.detalles && detalle.detalles.length > 0 ? (
                                        <ul className="detail-products">
                                            {detalle.detalles.map((d) => (
                                                <li key={d.id_detalle}>
                                                    <span>
                                                        {varianteEtiqueta(d)} × {d.cantidad}
                                                    </span>
                                                    <span>{formatearPesos(d.subtotal)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>No hay productos registrados.</p>
                                    )}
                                </div>

                                {/* DIRECCION */}
                                {detalle.direccion_envio && (
                                    <div className="detail-section">
                                        <h3>Dirección de envío</h3>
                                        <p>{detalle.direccion_envio}</p>
                                    </div>
                                )}

                                <div className="detail-footer">
                                    <button
                                        type="button"
                                        className="order-detail-button"
                                        onClick={() => setDetalle(null)}
                                    >
                                        Cerrar
                                    </button>
                                </div>

                            </div>
                        </div>
                    )}

                </div>
            </main>
        );

    }

    export default Orders;
