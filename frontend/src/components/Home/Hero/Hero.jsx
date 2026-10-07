import './Hero.css';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import heroImg from '../../../assets/images/hero.png';

function Hero() {
    return (
        <section className="mv-hero">

            {/* ===================================================
                PRINCIPAL
            =================================================== */}
            <div className="mv-hero-main">

                {/* CONTENIDO IZQUIERDO */}
                <div className="mv-hero-content">

                    <span className="mv-hero-chip">
                        Compra · Vende · Crece
                    </span>

                    <h1 className="mv-hero-title">
                        Todo lo que necesitas,
                        <br />
                        <span className="mv-hero-title-highlight">en un solo lugar</span>
                    </h1>

                    <p className="mv-hero-desc">
                        Encuentra productos de calidad, envíos seguros y la mejor
                        experiencia de compra online.
                    </p>

                    <div className="mv-hero-actions">
                        <Link to="/products" className="mv-hero-btn-primary">
                            Explorar categorías
                            <ArrowRight size={18} />
                        </Link>
                        <Link to="/nosotros" className="mv-hero-btn-ghost">
                            Conoce miVenta
                        </Link>
                    </div>

                </div>

                {/* IMAGEN / ILUSTRACIÓN DERECHA */}
                <div className="mv-hero-visual" aria-hidden="true">
                    <div className="mv-hero-visual-inner">
                        {/* Círculo de fondo con resplandor */}
                        <div className="mv-hero-circle" />
                        {/* Imagen 3D principal con iconos flotantes integrados */}
                        <img
                            src={heroImg}
                            alt="miVenta.co - Compra, vende y crece"
                            className="mv-hero-image"
                        />
                    </div>
                </div>

            </div>

        </section>
    );
}

export default Hero;