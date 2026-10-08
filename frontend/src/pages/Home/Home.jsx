import Hero from "../../components/Home/Hero/Hero";
import FeaturedProducts from "../Products/FeaturedProducts/FeaturedProducts";
import SEO from "../../components/SEO/SEO";

const HOME_STRUCTURED_DATA = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Organization",
            "@id": "https://www.miventa.co/#organization",
            "name": "MiVenta",
            "url": "https://www.miventa.co",
            "logo": "https://www.miventa.co/favicon-miventa-sin-texto.ico",
            "description": "Tu tienda online de confianza en Colombia. Compra fácil, entrega segura. Encuentra la mejor ropa deportiva y moda con envíos rápidos a todo el país.",
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+57 300 4726258",
                "contactType": "customer service",
                "areaServed": "CO",
                "availableLanguage": "Spanish"
            }
        },
        {
            "@type": "WebSite",
            "@id": "https://www.miventa.co/#website",
            "url": "https://www.miventa.co",
            "name": "MiVenta",
            "publisher": {
                "@id": "https://www.miventa.co/#organization"
            },
            "potentialAction": {
                "@type": "SearchAction",
                "target": "https://www.miventa.co/products?q={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        }
    ]
};

function Home() {
    return (
        <>
            <SEO
                title="MiVenta | Tu tienda online de confianza"
                description="Compra fácil, entrega segura. Encuentra la mejor ropa deportiva y moda con envíos rápidos a toda Colombia en MiVenta."
                keywords="MiVenta, tienda online colombia, ropa deportiva, zapatillas deportivas, ofertas moda, compra segura, envíos colombia"
                path="/"
                structuredData={HOME_STRUCTURED_DATA}
            />

            <Hero />

            <FeaturedProducts />
        </>
    );
}

export default Home;