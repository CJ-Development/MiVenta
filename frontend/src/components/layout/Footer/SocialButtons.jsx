// SocialButtons — miVenta.co
// Redes oficiales de miVenta.co

export const SOCIAL_LINKS = {
    facebook: "https://www.facebook.com/MiVenta.co",
    instagram: "https://www.instagram.com/miventaco",
    tiktok: "https://www.tiktok.com/@mi.venta..co",
};

function SocialButtons() {
    return (
        <div className="social-buttons-row">
            <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook de MiVenta.co"
                className="social-btn facebook"
            >
                Facebook
            </a>
            <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram de MiVenta.co"
                className="social-btn instagram"
            >
                Instagram
            </a>
            <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok de MiVenta.co"
                className="social-btn tiktok"
            >
                TikTok
            </a>
        </div>
    );
}

export default SocialButtons;