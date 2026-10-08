import { useState, useMemo } from 'react';
import {
    ChevronDown, Truck, ShieldCheck, CreditCard,
    Box, RotateCcw, Search,
    MessageCircle, Headphones, User, ArrowRight, Zap
} from 'lucide-react';
import SEO from '../../components/SEO/SEO';
import './Faq.css';

const faqData = [
    {
        category: "Envíos y Entregas",
        icon: <Truck size={18} />,
        description: "Todo lo que necesitas saber sobre tiempos, costos y seguimiento de tus pedidos.",
        questions: [
            {
                q: "¿Cuánto tiempo tarda en llegar mi pedido?",
                a: "El tiempo de entrega depende de tu ubicación. Para ciudades principales, los envíos suelen tardar de 2 a 4 días hábiles. Para otras zonas del país, puede tomar entre 5 y 8 días hábiles."
            },
            {
                q: "¿Hacen envíos a todo el país?",
                a: "Sí, realizamos envíos a nivel nacional. Trabajamos con las mejores transportadoras para asegurar que tu paquete llegue seguro a la puerta de tu casa, estés donde estés."
            },
            {
                q: "¿Cómo puedo hacer seguimiento a mi paquete?",
                a: "Una vez que tu pedido sea despachado, te contactaremos por WhatsApp con el número de guía y el enlace de la transportadora para que puedas rastrear tu paquete en tiempo real."
            }
        ]
    },
    {
        category: "Pagos y Seguridad",
        icon: <CreditCard size={18} />,
        description: "Conoce los métodos de pago, la seguridad de tus transacciones y la garantía de tus compras.",
        questions: [
            {
                q: "¿Qué métodos de pago aceptan?",
                a: "Aceptamos múltiples métodos de pago, incluyendo tarjetas de crédito, débito, PSE, Nequi, Daviplata y en algunas zonas, pago contra entrega."
            },
            {
                q: "¿Es seguro comprar en miVenta.co?",
                a: "Totalmente. Nuestra plataforma cuenta con encriptación SSL y procesadores de pago certificados que garantizan la seguridad y privacidad de todas tus transacciones."
            },
            {
                q: "¿Cómo funciona el pago contra entrega?",
                a: "El pago contra entrega está disponible en ciudades seleccionadas. Al finalizar tu pedido, nuestro equipo te confirmará si aplica para tu zona y coordinaremos la entrega por WhatsApp."
            }
        ]
    },
    {
        category: "Cambios y Devoluciones",
        icon: <RotateCcw size={18} />,
        description: "Si necesitas cambiar un producto o hacer una devolución, aquí te explicamos cómo.",
        questions: [
            {
                q: "¿Puedo cambiar una prenda si no me queda la talla?",
                a: "Plazo: 5 días hábiles\nProducto sin uso y con empaque original\nNo aplica a productos de uso personal, higiene o personalizados\nReembolso en 30 días calendario"
            },
            {
                q: "¿Qué debo hacer si recibo un producto defectuoso?",
                a: "Si el artículo presenta defectos de fábrica, por favor contáctanos. Lo reemplazaremos o procesaremos un reembolso."
            }
        ]
    },
    {
        category: "Productos y Garantías",
        icon: <Box size={18} />,
        description: "Información sobre la calidad, garantías y características de nuestros productos.",
        questions: [
            {
                q: "¿Los productos tienen garantía?",
                a: "Sí, todos nuestros productos cuentan con garantía directa que cubre defectos de fabricación. No cubre daños por mal uso."
            },
            {
                q: "¿Tienen tienda física?",
                a: "Actualmente somos una tienda 100% online, lo que nos permite ofrecerte mejores precios y enviarte directamente a tu casa sin salir de casa."
            }
        ]
    }
];

function Faq() {
    const [openIndex, setOpenIndex] = useState(null);
    const [activeCategory, setActiveCategory] = useState(null);
    const [search, setSearch] = useState('');

    const toggleQuestion = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const filteredData = useMemo(() => {
        let data = faqData;

        if (activeCategory !== null) {
            data = data.filter((_, i) => i === activeCategory);
        }

        if (!search.trim()) return data;

        const q = search.toLowerCase();
        return data.map(section => ({
            ...section,
            questions: section.questions.filter(
                item => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
            )
        })).filter(section => section.questions.length > 0);
    }, [search, activeCategory]);

    return (
        <div className="mv-faq-page">

            <SEO
                title="Preguntas Frecuentes — miVenta.co"
                description="Resuelve tus dudas de forma rápida y sencilla sobre envíos, pagos, devoluciones y más."
                path="/faq"
            />

            {/* ENCABEZADO */}
            <div className="mv-faq-header">
                <h1>Preguntas Frecuentes</h1>
                <p>Resuelve tus dudas de forma rápida y sencilla.</p>

                <div className="mv-faq-search-wrap">
                    <input
                        className="mv-faq-search"
                        type="text"
                        placeholder="Buscar una pregunta..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* CATEGORÍAS MOBILE */}
            <div className="mv-faq-mobile-cats">
                <button
                    className={`mv-faq-cat-btn ${activeCategory === null ? 'active' : ''}`}
                    onClick={() => setActiveCategory(null)}
                >
                    Todas
                </button>
                {faqData.map((section, i) => (
                    <button
                        key={i}
                        className={`mv-faq-cat-btn ${activeCategory === i ? 'active' : ''}`}
                        onClick={() => setActiveCategory(i)}
                    >
                        {section.category}
                    </button>
                ))}
            </div>

            {/* BODY */}
            <div className="mv-faq-body">

                {/* SIDEBAR */}
                <aside className="mv-faq-sidebar">
                    <h3>Categorías</h3>
                    <div className="mv-faq-categories">
                        <button
                            className={`mv-faq-cat-btn ${activeCategory === null ? 'active' : ''}`}
                            onClick={() => setActiveCategory(null)}
                        >
                            <span className="mv-faq-cat-icon"><Search size={16} /></span>
                            Todas las preguntas
                        </button>
                        {faqData.map((section, i) => (
                            <button
                                key={i}
                                className={`mv-faq-cat-btn ${activeCategory === i ? 'active' : ''}`}
                                onClick={() => setActiveCategory(i)}
                            >
                                <span className="mv-faq-cat-icon">{section.icon}</span>
                                {section.category}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* ACORDEONES */}
                <div className="mv-faq-list">
                    {filteredData.map((section, sIndex) =>
                        section.questions.map((item, qIndex) => {
                            const key = `${sIndex}-${qIndex}`;
                            const isOpen = openIndex === key;
                            return (
                                <div key={key} className={`mv-faq-item ${isOpen ? 'open' : ''}`}>
                                    <button
                                        className="mv-faq-question"
                                        onClick={() => toggleQuestion(key)}
                                        aria-expanded={isOpen}
                                    >
                                        <span>{item.q}</span>
                                        <ChevronDown size={20} className="mv-faq-chevron" />
                                    </button>
                                    <div className="mv-faq-answer">
                                        <p>{item.a}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {filteredData.length === 0 && (
                        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Search size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                            <p>No encontramos resultados para "<strong>{search}</strong>"</p>
                        </div>
                    )}
                </div>
            </div>

            {/* CTA CONTACTO */}
            <section style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, #521B80 100%)',
                padding: '56px 32px'
            }}>
                <div style={{
                    maxWidth: 1100,
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 48,
                    flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flex: 1, minWidth: 260 }}>
                        <div style={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: 'rgba(197,155,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#C59BFF', flexShrink: 0
                        }}>
                            <Headphones size={36} />
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#C59BFF', marginBottom: 8 }}>
                                ¿AÚN TIENES DUDAS?
                            </span>
                            <h2 style={{ fontFamily: 'var(--font-primary)', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>
                                Estamos para ayudarte
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
                                Si no encontraste la respuesta que buscabas,<br />nuestro equipo está listo para ayudarte.
                            </p>
                            <a
                                href="https://wa.me/573004726258"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    background: '#FF4F9A', color: '#fff', border: 'none',
                                    borderRadius: 'var(--radius-md)', padding: '12px 22px',
                                    fontFamily: 'var(--font-primary)', fontWeight: 700, fontSize: 14,
                                    textDecoration: 'none', cursor: 'pointer'
                                }}
                            >
                                <MessageCircle size={16} />
                                Contactar Soporte
                                <ArrowRight size={15} />
                            </a>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 220 }}>
                        {[
                            { icon: <Zap size={18} />, title: 'Atención rápida', desc: 'Te respondemos en poco tiempo' },
                            { icon: <User size={18} />, title: 'Soporte personalizado', desc: 'Un equipo siempre disponible' },
                            { icon: <MessageCircle size={18} />, title: 'Vía WhatsApp, correo o chat', desc: 'Elige el canal que prefieras' },
                        ].map((f, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    background: 'rgba(197,155,255,0.18)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#C59BFF', flexShrink: 0
                                }}>
                                    {f.icon}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <strong style={{ color: '#fff', fontSize: 14 }}>{f.title}</strong>
                                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12.5 }}>{f.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

        </div>
    );
}

export default Faq;
