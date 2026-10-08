import { useEffect } from "react";

const SITE_NAME = "MiVenta";
const SITE_URL = "https://www.miventa.co";
const DEFAULT_IMAGE = "https://www.miventa.co/favicon-miventa-sin-texto.ico";

function setMeta(attribute, value, content) {
    if (!content) {
        const element = document.head.querySelector(`meta[${attribute}="${value}"]`);
        if (element) {
            element.remove();
        }
        return;
    }

    let element = document.head.querySelector(`meta[${attribute}="${value}"]`);

    if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, value);
        document.head.appendChild(element);
    }

    element.setAttribute("content", content);
}

function setCanonical(url) {
    let link = document.head.querySelector('link[rel="canonical"]');

    if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
    }

    link.setAttribute("href", url);
}

function SEO({
    title,
    description = "MiVenta — Tu tienda online de confianza en Colombia. Ropa deportiva, moda y las mejores ofertas con envíos rápidos y seguros a todo el país.",
    keywords = "MiVenta, tienda online colombia, ropa deportiva, moda colombia, comprar ropa online, envios contraentrega, ofertas",
    path = "/",
    image = null,
    noindex = false,
    structuredData = null,
    ogType = "website",
}) {
    useEffect(() => {
        const finalTitle = !title
            ? `${SITE_NAME} | Tu tienda online de confianza`
            : title.toLowerCase().includes("miventa")
                ? title
                : `${title} | ${SITE_NAME}`;

        const canonicalUrl = path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
        const finalImage = image || DEFAULT_IMAGE;

        document.title = finalTitle;

        // Metas generales
        setMeta("name", "description", description);
        setMeta("name", "keywords", keywords);
        setMeta("name", "author", SITE_NAME);
        setMeta(
            "name",
            "robots",
            noindex ? "noindex, nofollow" : "index, follow"
        );

        // Open Graph
        setMeta("property", "og:type", ogType);
        setMeta("property", "og:title", finalTitle);
        setMeta("property", "og:description", description);
        setMeta("property", "og:url", canonicalUrl);
        setMeta("property", "og:site_name", SITE_NAME);
        setMeta("property", "og:locale", "es_CO");
        setMeta("property", "og:image", finalImage);

        // Twitter / X Cards
        setMeta("name", "twitter:card", "summary_large_image");
        setMeta("name", "twitter:title", finalTitle);
        setMeta("name", "twitter:description", description);
        setMeta("name", "twitter:image", finalImage);

        // Canonical
        setCanonical(canonicalUrl);

        // Datos estructurados JSON-LD (Schema.org)
        const existingStructuredData = document.head.querySelector(
            'script[data-seo-structured-data="true"]'
        );

        if (existingStructuredData) {
            existingStructuredData.remove();
        }

        if (structuredData) {
            const script = document.createElement("script");
            script.type = "application/ld+json";
            script.setAttribute("data-seo-structured-data", "true");
            script.textContent = JSON.stringify(structuredData);
            document.head.appendChild(script);
        }

        return () => {
            const currentStructuredData = document.head.querySelector(
                'script[data-seo-structured-data="true"]'
            );
            if (currentStructuredData) {
                currentStructuredData.remove();
            }
        };
    }, [
        title,
        description,
        keywords,
        path,
        image,
        noindex,
        structuredData,
        ogType,
    ]);

    return null;
}

export default SEO;
