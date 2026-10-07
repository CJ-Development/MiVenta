import { useEffect } from "react";

const SITE_NAME = "miVenta.co";
const SITE_URL = "https://www.miventa.co";

function setMeta(attribute, value, content) {
if (!content) {
    // Remove meta tag if content is empty
    const element = document.head.querySelector(
        `meta[${attribute}="${value}"]`
    );
    if (element) {
        element.remove();
    }
    return;
}

let element = document.head.querySelector(
    `meta[${attribute}="${value}"]`
);

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
description,
path = "/",
image = null,
noindex = false,
structuredData = null,
ogType = "website",
}) {
useEffect(() => {
const finalTitle = title
? `${title} | ${SITE_NAME}`
: SITE_NAME;

const canonicalUrl = `${SITE_URL}${path}`;

    document.title = finalTitle;

    setMeta(
        "name",
        "description",
        description
    );

    setMeta(
        "name",
        "robots",
        noindex
            ? "noindex, follow"
            : "index, follow"
    );

    setMeta(
        "property",
        "og:type",
        ogType
    );

    setMeta(
        "property",
        "og:title",
        finalTitle
    );

    setMeta(
        "property",
        "og:description",
        description
    );

    setMeta(
        "property",
        "og:url",
        canonicalUrl
    );

    setMeta(
        "property",
        "og:site_name",
        SITE_NAME
    );

    if (image) {
        setMeta(
            "property",
            "og:image",
            image
        );
    }

    setMeta(
        "name",
        "twitter:card",
        image ? "summary_large_image" : "summary"
    );

    setMeta(
        "name",
        "twitter:title",
        finalTitle
    );

    setMeta(
        "name",
        "twitter:description",
        description
    );

    if (image) {
        setMeta(
            "name",
            "twitter:image",
            image
        );
    }

    setCanonical(canonicalUrl);

    const existingStructuredData =
        document.head.querySelector(
            'script[data-seo-structured-data="true"]'
        );

    if (existingStructuredData) {
        existingStructuredData.remove();
    }

    if (structuredData) {
        const script = document.createElement("script");

        script.type = "application/ld+json";
        script.setAttribute(
            "data-seo-structured-data",
            "true"
        );

        script.textContent =
            JSON.stringify(structuredData);

        document.head.appendChild(script);
    }

    return () => {
        const currentStructuredData =
            document.head.querySelector(
                'script[data-seo-structured-data="true"]'
            );

        if (currentStructuredData) {
            currentStructuredData.remove();
        }
    };
}, [
    title,
    description,
    path,
    image,
    noindex,
    structuredData,
    ogType,
]);

return null;

}

export default SEO;
