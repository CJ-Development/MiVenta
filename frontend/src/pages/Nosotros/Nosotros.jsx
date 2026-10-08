import "./Nosotros.css";
import SEO from "../../components/SEO/SEO";
import { ShieldCheck, Truck, Star, HeartHandshake } from "lucide-react";

const pillars = [
    {
        icon: <ShieldCheck size={26} />,
        title: "Variedad",
        desc: "Diferentes productos y categorías reunidos en un solo lugar."
    },
    {
        icon: <Truck size={26} />,
        title: "Una experiencia sencilla",
        desc: "Queremos que encontrar y comprar un producto no sea complicado."
    },
    {
        icon: <Star size={26} />,
        title: "Información clara",
        desc: "Mostramos la información disponible de cada producto para ayudarte a tomar una decisión."
    },
    {
        icon: <HeartHandshake size={26} />,
        title: "Compra en línea",
        desc: "Puedes realizar tu compra directamente desde nuestra plataforma."
    }
];

function Nosotros() {
    return (
        <main className="mv-nosotros-page">

            <SEO
                title="Nosotros — miVenta"
                description="miVenta es una tienda en línea creada para hacer que comprar sea más fácil. Reunimos diferentes productos en un solo lugar para que puedas explorar, comparar y realizar tus compras de manera sencilla."
                path="/nosotros"
            />

            {/* HERO */}
            <section className="mv-nosotros-hero">
                <h1>Más que comprar, una forma sencilla de encontrar lo que buscas</h1>
                <p>
                    miVenta es una tienda en línea creada para hacer que comprar sea más fácil. Reunimos diferentes productos en un solo lugar para que puedas explorar, comparar y realizar tus compras de manera sencilla.
                </p>
            </section>

            {/* QUIÉNES SOMOS */}
            <section className="mv-nosotros-section">
                <div className="mv-nosotros-two-col">
                    <div>
                        <span className="mv-nosotros-label">CONÓCENOS</span>
                        <h2 className="mv-nosotros-title">¿Qué es miVenta?</h2>
                        <p className="mv-nosotros-text">
                            miVenta es una plataforma de comercio electrónico donde puedes encontrar productos de diferentes categorías y realizar tus compras directamente desde nuestra tienda.
                        </p>
                        <p className="mv-nosotros-text">
                            Nuestro objetivo es mantener una experiencia sencilla: buscar, elegir, comprar y disfrutar.
                        </p>
                        <p className="mv-nosotros-text">
                            Trabajamos para que la información de cada producto sea clara y para que navegar por la tienda sea una experiencia cómoda.
                        </p>
                    </div>

                    <div>
                        <span className="mv-nosotros-label">NUESTRA PROPUESTA</span>
                        <h2 className="mv-nosotros-title">Una experiencia pensada para comprar fácilmente</h2>
                        <p className="mv-nosotros-text">
                            Queremos que encontrar un producto y realizar una compra sea un proceso claro y sencillo.
                        </p>
                        <p className="mv-nosotros-text">
                            Por eso buscamos mantener una tienda organizada, con diferentes categorías y productos para que puedas encontrar lo que necesitas de una manera cómoda.
                        </p>
                    </div>
                </div>
            </section>

            {/* PILARES */}
            <div className="mv-nosotros-pillars">
                <div className="mv-nosotros-pillars-inner">
                    <span className="mv-nosotros-label" style={{ textAlign: 'center', display: 'block' }}>LO QUE ENCONTRARÁS</span>
                    <h2 className="mv-nosotros-title" style={{ textAlign: 'center', margin: '0 auto 0' }}>Una tienda pensada para ti</h2>

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
                        <h2 className="mv-nosotros-title">Seguir creciendo contigo</h2>
                        <p className="mv-nosotros-text">
                            Queremos que miVenta siga creciendo como una plataforma de compras sencilla, clara y accesible.
                        </p>
                        <p className="mv-nosotros-text">
                            Nuestro enfoque es seguir mejorando la experiencia, ampliar nuestra oferta de productos y construir una relación de confianza con nuestros clientes.
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
                        <span style={{ fontFamily: 'var(--font-primary)', fontSize: '2rem', fontWeight: 800, color: '#C59BFF', lineHeight: 1.2 }}>
                            Seguimos mejorando
                        </span>
                        <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 1.65, margin: 0 }}>
                            Trabajamos constantemente para ofrecer una experiencia de compra cada vez más sencilla.
                        </p>
                    </div>
                </div>
            </section>

            {/* CIERRE */}
            <section className="mv-nosotros-closing">
                <div className="mv-nosotros-closing-line" />
                <p>Gracias por visitar miVenta.</p>
                <span>Elegir · Comprar · Disfrutar</span>
            </section>

        </main>
    );
}

export default Nosotros;