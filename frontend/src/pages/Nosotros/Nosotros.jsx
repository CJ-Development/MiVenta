import "./Nosotros.css";
import SEO from "../../components/SEO/SEO";
import { ShieldCheck, Truck, Star, HeartHandshake } from "lucide-react";

const pillars = [
    {
        icon: <ShieldCheck size={26} />,
        title: "Confianza",
        desc: "Cada compra respaldada por procesos seguros, pagos protegidos y comunicación transparente."
    },
    {
        icon: <Truck size={26} />,
        title: "Envíos seguros",
        desc: "Llegamos a todo el país con las mejores transportadoras para que tu pedido llegue en perfectas condiciones."
    },
    {
        icon: <Star size={26} />,
        title: "Calidad garantizada",
        desc: "Seleccionamos cuidadosamente cada producto para ofrecerte lo mejor al mejor precio."
    },
    {
        icon: <HeartHandshake size={26} />,
        title: "Cercanía",
        desc: "Un equipo humano listo para atenderte por WhatsApp, correo y chat con atención personalizada."
    }
];

function Nosotros() {
    return (
        <main className="mv-nosotros-page">

            <SEO
                title="Nosotros — miVenta.co"
                description="Conoce miVenta.co, tu tienda online de confianza en Colombia."
                path="/nosotros"
            />

            {/* HERO */}
            <section className="mv-nosotros-hero">
                <h1>Nosotros</h1>
                <p>
                    Más que una tienda, somos tu aliado en cada compra. En miVenta.co conectamos
                    vendedores y compradores, facilitando el acceso a productos de calidad, con envíos
                    seguros y un servicio confiable.
                </p>
            </section>

            {/* QUIÉNES SOMOS */}
            <section className="mv-nosotros-section">
                <div className="mv-nosotros-two-col">
                    <div>
                        <span className="mv-nosotros-label">CONÓCENOS</span>
                        <h2 className="mv-nosotros-title">¿Quiénes somos?</h2>
                        <p className="mv-nosotros-text">
                            miVenta.co es una tienda virtual colombiana creada para ofrecer una experiencia
                            de compra fácil, segura y cercana, poniendo a disposición de nuestros clientes
                            una variedad de productos para diferentes gustos, necesidades y momentos.
                        </p>
                        <p className="mv-nosotros-text">
                            Creemos que comprar en línea debe ser mucho más que elegir un producto: debe
                            ser una experiencia práctica, confiable y agradable. Por eso trabajamos para
                            seleccionar productos de calidad, ofrecer una atención personalizada y
                            facilitar cada etapa del proceso, desde la elección hasta la entrega.
                        </p>
                        <p className="mv-nosotros-text">
                            Realizamos envíos a nivel nacional, buscando llegar cada día a más hogares de
                            Colombia y brindar a nuestros clientes la confianza de comprar desde cualquier lugar.
                        </p>
                    </div>

                    <div>
                        <span className="mv-nosotros-label">NUESTRO PROPÓSITO</span>
                        <h2 className="mv-nosotros-title">Misión</h2>
                        <p className="mv-nosotros-text">
                            En miVenta.co tenemos como misión ofrecer a nuestros clientes una experiencia
                            de compra virtual fácil, segura, confiable y cercana, poniendo a su alcance
                            productos seleccionados que respondan a diferentes necesidades, gustos y
                            estilos de vida.
                        </p>
                        <p className="mv-nosotros-text">
                            Nos comprometemos a brindar atención amable y personalizada, procesos de
                            compra sencillos, información clara y entregas eficientes a nivel nacional,
                            construyendo relaciones basadas en la confianza y la satisfacción.
                        </p>
                    </div>
                </div>
            </section>

            {/* PILARES */}
            <div className="mv-nosotros-pillars">
                <div className="mv-nosotros-pillars-inner">
                    <span className="mv-nosotros-label" style={{ textAlign: 'center', display: 'block' }}>NUESTROS VALORES</span>
                    <h2 className="mv-nosotros-title" style={{ textAlign: 'center', margin: '0 auto 0' }}>Lo que nos define</h2>

                    <div className="mv-nosotros-pillars-grid">
                        {pillars.map((p, i) => (
                            <div key={i} className="mv-nosotros-pillar-card">
                                <div className="mv-pillar-icon">{p.icon}</div>
                                <p className="mv-pillar-title">{p.title}</p>
                                <p className="mv-pillar-desc">{p.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* VISIÓN */}
            <section className="mv-nosotros-section">
                <div className="mv-nosotros-two-col">
                    <div>
                        <span className="mv-nosotros-label">HACIA DÓNDE VAMOS</span>
                        <h2 className="mv-nosotros-title">Visión</h2>
                        <p className="mv-nosotros-text">
                            Para el año 2030, miVenta.co será reconocida como una tienda virtual colombiana
                            confiable, cercana e innovadora, con cobertura nacional y una amplia variedad
                            de productos, destacándose por la calidad de su servicio y la responsabilidad
                            en cada entrega.
                        </p>
                        <p className="mv-nosotros-text">
                            Buscamos crecer de manera sostenible, fortalecer nuestra presencia en el
                            comercio electrónico y construir una comunidad de clientes que encuentren en
                            miVenta.co un lugar donde comprar sea fácil, seguro y siempre una experiencia
                            especial.
                        </p>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, var(--color-primary) 0%, #521B80 100%)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '40px 36px',
                        color: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: 12
                    }}>
                        <span style={{ fontFamily: 'var(--font-primary)', fontSize: '3rem', fontWeight: 800, color: '#C59BFF', lineHeight: 1 }}>
                            2030
                        </span>
                        <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 1.65, margin: 0 }}>
                            Crecer, innovar y seguir creando experiencias especiales para miles de colombianos.
                        </p>
                    </div>
                </div>
            </section>

            {/* CIERRE */}
            <section className="mv-nosotros-closing">
                <div className="mv-nosotros-closing-line" />
                <p>
                    Gracias por ser parte de{" "}
                    <strong>miVenta.co</strong>.
                </p>
                <span>Elegir • Comprar • Disfrutar</span>
            </section>

        </main>
    );
}

export default Nosotros;