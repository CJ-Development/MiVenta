import './Legal.css';
import SEO from '../../components/SEO/SEO';
import { FileText, Download, ExternalLink, ShieldCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const PDF_URL = '/Legal/Terminos%20y%20Condiciones.pdf';

function TerminosCondiciones() {
    return (
        <>
            <SEO
                title="Términos y Condiciones — miVenta.co"
                description="Términos y Condiciones oficiales de miVenta.co. Consulta las normas de uso, compras y garantías de la plataforma."
                path="/terminos-y-condiciones"
            />
            <main className="legal-page">
                <div className="legal-container">
                    {/* BREADCRUMB */}
                    <nav className="legal-breadcrumb" aria-label="Migas de pan">
                        <Link to="/">Inicio</Link>
                        <ChevronRight size={14} />
                        <span>Legal</span>
                        <ChevronRight size={14} />
                        <span className="current">Términos y Condiciones</span>
                    </nav>

                    {/* ENCABEZADO */}
                    <header className="legal-header">
                        <div className="legal-badge">
                            <ShieldCheck size={16} />
                            <span>Documento Oficial — miVenta.co</span>
                        </div>
                        <h1 className="legal-title">Términos y Condiciones</h1>
                        <p className="legal-subtitle">
                            Conoce los lineamientos, políticas de compra, envíos y condiciones de uso
                            que rigen el servicio en miVenta.co.
                        </p>

                        {/* BARRA DE ACCIONES */}
                        <div className="legal-actions-bar">
                            <a
                                href={PDF_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="legal-btn legal-btn-primary"
                                title="Abrir el documento PDF en una pestaña nueva"
                            >
                                <ExternalLink size={18} />
                                <span>Ver PDF en pantalla completa</span>
                            </a>

                            <a
                                href={PDF_URL}
                                download="Terminos y Condiciones - miVenta.co.pdf"
                                className="legal-btn legal-btn-secondary"
                                title="Descargar copia del documento PDF"
                            >
                                <Download size={18} />
                                <span>Descargar PDF</span>
                            </a>
                        </div>
                    </header>

                    {/* VISOR DE PDF INCORPORADO */}
                    <section className="legal-viewer-card" aria-label="Visor del documento PDF">
                        <div className="legal-viewer-topbar">
                            <div className="legal-viewer-filename">
                                <FileText size={18} color="#6A2CA0" />
                                <span>Terminos y Condiciones.pdf</span>
                            </div>
                            <span className="legal-viewer-tag">PDF Oficial</span>
                        </div>

                        <div className="legal-iframe-container">
                            <iframe
                                src={`${PDF_URL}#toolbar=1&navpanes=0`}
                                title="Términos y Condiciones de miVenta.co"
                                className="legal-pdf-iframe"
                            />
                        </div>

                        <footer className="legal-viewer-footer">
                            <p>
                                ¿Tienes dudas sobre nuestros Términos y Condiciones?
                                Escríbenos a{' '}
                                <a href="mailto:miventa.admin@gmail.com">miventa.admin@gmail.com</a>.
                            </p>
                        </footer>
                    </section>
                </div>
            </main>
        </>
    );
}

export default TerminosCondiciones;
