import { useState } from "react";
import "./Cambios.css";
import { X } from "lucide-react";

function Cambios() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [nombre, setNombre] = useState("");
    const [numero, setNumero] = useState("");
    const [razon, setRazon] = useState("");

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setNombre("");
        setNumero("");
        setRazon("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const mensaje = `Hola Baúl Mágico Shop, deseo solicitar un cambio o devolución.
        
*Nombre:* ${nombre}
*Número de pedido/contacto:* ${numero}
*Motivo de la solicitud:* ${razon}`;

        const encodedMessage = encodeURIComponent(mensaje);
        const whatsappUrl = `https://wa.me/573181174546?text=${encodedMessage}`;

        window.open(whatsappUrl, "_blank");
        handleCloseModal();
    };

    return (
        <div className="cambios-page">
            <div className="cambios-hero">
                <h1>Cambios y Devoluciones</h1>
                <p>Tu satisfacción es nuestra prioridad. Nuestro proceso es fácil, rápido y sin complicaciones.</p>
            </div>

            <div className="cambios-container">
                <section className="cambios-card policy-card">
                    <div className="card-header">
                        <h2>Nuestra Política</h2>
                    </div>
                    <ul className="policy-list">
                        <li>
                            <strong>10 días de plazo</strong>
                            <span>Tienes hasta 10 días desde la recepción de tu pedido para solicitar cualquier cambio.</span>
                        </li>
                        <li>
                            <strong>Condiciones del producto</strong>
                            <span>El producto debe estar en perfectas condiciones, sin uso, sin lavar y con sus etiquetas y empaques originales.</span>
                        </li>
                        <li>
                            <strong>Gastos de envío</strong>
                            <span>Los gastos de envío por cambios de talla o referencia corren por cuenta del cliente (salvo por defectos de fábrica).</span>
                        </li>
                    </ul>
                </section>

                <div className="cambios-card action-card">
                    <div className="action-content">
                        <h3>¿Listo para realizar un cambio?</h3>
                        <p>Completa nuestro formulario rápido y te contactaremos por WhatsApp para guiarte en el proceso paso a paso.</p>
                        <button className="btn-solicitar-premium" onClick={handleOpenModal}>
                            Solicitar Cambio
                        </button>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="cambios-modal-overlay">
                    <div className="cambios-modal">
                        <button className="close-modal-btn" onClick={handleCloseModal}>
                            <X size={24} />
                        </button>

                        <div className="modal-header">
                            <h2>Solicitud de Cambio</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="cambios-form">
                            <div className="form-group">
                                <label htmlFor="nombre">Nombre Completo *</label>
                                <input
                                    type="text"
                                    id="nombre"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    required
                                    placeholder="Ej. Ana Pérez"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="numero">Número de Pedido o Celular *</label>
                                <input
                                    type="text"
                                    id="numero"
                                    value={numero}
                                    onChange={(e) => setNumero(e.target.value)}
                                    required
                                    placeholder="Ej. PED-123 o 3001234567"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="razon">Razón de la Devolución/Cambio *</label>
                                <textarea
                                    id="razon"
                                    value={razon}
                                    onChange={(e) => setRazon(e.target.value)}
                                    required
                                    placeholder="Cuéntanos brevemente por qué deseas el cambio..."
                                    rows="4"
                                ></textarea>
                            </div>

                            <button type="submit" className="btn-whatsapp">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                Enviar por WhatsApp
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Cambios;
