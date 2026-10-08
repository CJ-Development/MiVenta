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
                title="Nosotros — VentasYa"
                description="Conoce VentasYa, tu tienda online de confianza en Colombia."
                path="/nosotros"
            />

            {/* HERO */}
            <section className="mv-nosotros-hero">
                <h1>Nosotros</h1>
                <p>
                    Más que una tienda, somos tu aliado en cada compra. En VentasYa conectamos
                    a nuestros clientes con productos de calidad, facilitando compras rápidas,
                    envíos seguros y un servicio confiable en todo el país.
                </p>
            </section>

            {/* QUIÉNES SOMOS */}
            <section className="mv-nosotros-section">
                <div className="mv-nosotros-two-col">
                    <div>
                        <span className="mv-nosotros-label">CONÓCENOS</span>
                        <h2 className="mv-nosotros-title">¿Quiénes somos?</h2>
                        <p className="mv-nosotros-text">
                            VentasYa es una tienda virtual colombiana diseñada para ofrecer una experiencia
                            de compra ágil, segura y confiable, poniendo a disposición de nuestros clientes
                            una cuidada selección de productos para cubrir sus necesidades diarias.
                        </p>
                        <p className="mv-nosotros-text">
                            Creemos que comprar en línea debe ser un proceso simple y transparente. Por eso
                            priorizamos la calidad en cada artículo, una atención oportuna y cercana, y
                            canales de compra accesibles que garantizan confianza de principio a fin.
                        </p>
                        <p className="mv-nosotros-text">
                            Realizamos envíos a nivel nacional, llevando productos directamente hasta la puerta
                            de tu hogar con las principales transportadoras de Colombia.
                        </p>
                    </div>

                    <div>
                        <span className="mv-nosotros-label">NUESTRO PROPÓSITO</span>
                        <h2 className="mv-nosotros-title">Misión</h2>
                        <p className="mv-nosotros-text">
                            En VentasYa tenemos la misión de facilitar las compras en línea a través de una
                            plataforma confiable, intuitiva y cercana, brindando productos de calidad a precios
                            competitivos con respaldo garantizado.
                        </p>
                        <p className="mv-nosotros-text">
                            Nos dedicamos a asegurar entregas puntuales, brindar una atención al cliente atenta
                            y construir relaciones duraderas fundamentadas en la satisfacción de cada compra.
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
                            Para el año 2030, VentasYa se consolidará como una tienda virtual referente en
                            Colombia, reconocida por su eficiencia logística, variedad de productos y
                            excelencia en el servicio al cliente.
                        </p>
                        <p className="mv-nosotros-text">
                            Avanzamos con paso firme hacia una experiencia digital moderna que simplifique el
                            comercio electrónico para miles de familias y usuarios en cada rincón del país.
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
                            Crecer, innovar y conectar a más colombianos con compras seguras, rápidas y garantizadas.
                        </p>
                    </div>
                </div>
            </section>

            {/* CIERRE */}
            <section className="mv-nosotros-closing">
                <div className="mv-nosotros-closing-line" />
                <p>
                    Gracias por confiar en{" "}
                    <strong>VentasYa</strong>.
                </p>
                <span>Elegir • Comprar • Disfrutar</span>
            </section>

        </main>
    );
}

export default Nosotros;