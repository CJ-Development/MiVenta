import './Legal.css';
import SEO from '../../components/SEO/SEO';
import { FileText, Download, ExternalLink, ShieldCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const PDF_URL = '/Legal/Politica%20de%20Privacidad.pdf';

function PoliticaDatos() {
    return (
        <>
            <SEO
                title="Política de Privacidad — miVenta.co"
                description="Política de Tratamiento de Datos Personales y Privacidad de miVenta.co conforme a la Ley 1581 de 2012 y normatividad colombiana."
                path="/politica-de-privacidad"
            />
            <main className="legal-page">
                <div className="legal-container">
                    {/* BREADCRUMB */}
                    <nav className="legal-breadcrumb" aria-label="Migas de pan">
                        <Link to="/">Inicio</Link>
                        <ChevronRight size={14} />
                        <span>Legal</span>
                        <ChevronRight size={14} />
                        <span className="current">Política de Privacidad</span>
                    </nav>

                    {/* ENCABEZADO */}
                    <header className="legal-header">
                        <div className="legal-badge">
                            <ShieldCheck size={16} />
                            <span>Documento Oficial — miVenta.co</span>
                        </div>
                        <h1 className="legal-title">Política de Privacidad y Tratamiento de Datos</h1>
                        <p className="legal-subtitle">
                            El cliente autoriza el tratamiento de sus datos conforme a la política
                            de privacidad publicada en www.miVenta.co. Aquí detallamos los derechos Habeas Data,
                            finalidades y seguridad de tu información.
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
                                download="Politica de Privacidad - miVenta.co.pdf"
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
                                <span>Politica de Privacidad.pdf</span>
                            </div>
                            <span className="legal-viewer-tag">PDF Oficial</span>
                        </div>

                        <div className="legal-iframe-container">
                            <iframe
                                src={`${PDF_URL}#toolbar=1&navpanes=0`}
                                title="Política de Privacidad de miVenta.co"
                                className="legal-pdf-iframe"
                            />
                        </div>

                        <footer className="legal-viewer-footer">
                            <p>
                                Para ejercer tus derechos de acceso, rectificación, supresión o actualización de datos,
                                contáctanos en{' '}
                                <a href="mailto:miventa.admin@gmail.com">miventa.admin@gmail.com</a>.
                            </p>
                        </footer>
                    </section>
                </div>
            </main>
        </>
    );
}

export default PoliticaDatos;
