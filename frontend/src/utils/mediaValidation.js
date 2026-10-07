/**
 * Constantes y utilidades de validación para imágenes y videos en productos.
 */

export const MAX_IMAGES_SIMPLE = 6;
export const MAX_IMAGES_VARIABLE = 8;
export const MAX_VIDEO_COUNT = 1;
export const MAX_VIDEO_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_VIDEO_FILE_SIZE_MB = 15;
export const MAX_VIDEO_DURATION_SECONDS = 60; // 60 segundos

export const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".webm"];
export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"];

/**
 * Valida si una URL tiene estructura web válida (http o https).
 */
export const isValidHttpUrl = (string) => {
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};

/**
 * Comprueba si un recurso o URL es de tipo video.
 */
export const isVideoResource = (resource) => {
    if (!resource) return false;
    if (typeof resource === "object") {
        if (resource.tipo === "video") return true;
        if (resource.file && resource.file.type && resource.file.type.startsWith("video/")) return true;
        const urlToCheck = resource.imagen || resource.url || "";
        const clean = urlToCheck.split("?")[0].toLowerCase();
        return ALLOWED_VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext));
    }
    const clean = String(resource).split("?")[0].toLowerCase();
    return ALLOWED_VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext));
};

/**
 * Valida la carga real de una imagen mediante un objeto Image en navegador.
 */
export const validateImageUrl = (url) => {
    return new Promise((resolve) => {
        const trimmed = (url || "").trim();
        if (!trimmed) {
            return resolve({ valid: false, error: "Ingresa una URL de imagen." });
        }

        if (!isValidHttpUrl(trimmed)) {
            return resolve({
                valid: false,
                error: "La URL debe comenzar con http:// o https://.",
            });
        }

        const img = new Image();
        let finished = false;

        const timer = setTimeout(() => {
            if (!finished) {
                finished = true;
                // No bloquear si timeout por CORS pero parece imagen válida
                const clean = trimmed.split("?")[0].toLowerCase();
                const hasExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) => clean.endsWith(ext));
                if (hasExt) {
                    resolve({ valid: true, url: trimmed });
                } else {
                    resolve({
                        valid: false,
                        error: "Tiempo de espera agotado al verificar la imagen. Comprueba que sea accesible.",
                    });
                }
            }
        }, 7000);

        img.onload = () => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            resolve({ valid: true, url: trimmed, width: img.naturalWidth, height: img.naturalHeight });
        };

        img.onerror = () => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            // Si la extensión parece correcta pero el servidor bloquea hotlinking, podemos permitir si tiene extensión
            const clean = trimmed.split("?")[0].toLowerCase();
            const hasExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) => clean.endsWith(ext));
            if (hasExt) {
                resolve({ valid: true, url: trimmed, warning: "No se pudo cargar la vista previa pero la extensión es válida." });
            } else {
                resolve({
                    valid: false,
                    error: "No se pudo cargar la imagen desde esa URL. Verifica que el enlace sea directo y público.",
                });
            }
        };

        img.src = trimmed;
    });
};

/**
 * Valida un archivo de video local (tamaño, formato y duración).
 */
export const validateVideoFile = (file) => {
    return new Promise((resolve) => {
        if (!file) {
            return resolve({ valid: false, error: "No se ha seleccionado ningún archivo." });
        }

        const ext = `.${(file.name || "").split(".").pop().toLowerCase()}`;
        if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext) && file.type !== "video/mp4" && file.type !== "video/webm") {
            return resolve({
                valid: false,
                error: "Formato de video no permitido. Solo se aceptan archivos MP4 y WebM.",
            });
        }

        if (file.size > MAX_VIDEO_SIZE_BYTES) {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            return resolve({
                valid: false,
                error: `El video pesa ${sizeMb} MB y supera el tamaño máximo permitido de 15 MB.`,
            });
        }

        const tempUrl = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";

        let finished = false;
        const timer = setTimeout(() => {
            if (!finished) {
                finished = true;
                URL.revokeObjectURL(tempUrl);
                // Si la metadata tarda pero el tamaño y formato son correctos, permitir
                resolve({ valid: true, duration: null });
            }
        }, 6000);

        video.onloadedmetadata = () => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            const duration = video.duration;
            URL.revokeObjectURL(tempUrl);

            if (duration && duration > MAX_VIDEO_DURATION_SECONDS) {
                const seg = Math.round(duration);
                return resolve({
                    valid: false,
                    error: `El video dura ${seg} segundos y supera la duración máxima permitida de 60 segundos.`,
                });
            }

            resolve({ valid: true, duration: Math.round(duration) });
        };

        video.onerror = () => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            URL.revokeObjectURL(tempUrl);
            resolve({
                valid: false,
                error: "El archivo de video parece corrupto o incompatible con el navegador.",
            });
        };

        video.src = tempUrl;
    });
};

/**
 * Valida una URL de video externa comprobando formato y duración.
 */
export const validateVideoUrl = (url) => {
    return new Promise((resolve) => {
        const trimmed = (url || "").trim();
        if (!trimmed) {
            return resolve({ valid: false, error: "Ingresa una URL de video." });
        }

        if (!isValidHttpUrl(trimmed)) {
            return resolve({
                valid: false,
                error: "La URL debe comenzar con http:// o https://.",
            });
        }

        const clean = trimmed.split("?")[0].toLowerCase();
        const hasValidExt = ALLOWED_VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext));

        if (!hasValidExt) {
            return resolve({
                valid: false,
                error: "La URL debe ser un enlace directo a un archivo de video .mp4 o .webm.",
            });
        }

        const video = document.createElement("video");
        video.preload = "metadata";
        let finished = false;

        const timer = setTimeout(() => {
            if (!finished) {
                finished = true;
                resolve({ valid: true, url: trimmed });
            }
        }, 7000);

        video.onloadedmetadata = () => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            const duration = video.duration;
            if (duration && duration > MAX_VIDEO_DURATION_SECONDS) {
                const seg = Math.round(duration);
                return resolve({
                    valid: false,
                    error: `El video dura ${seg} segundos y supera la duración máxima permitida de 60 segundos.`,
                });
            }
            resolve({ valid: true, url: trimmed, duration: Math.round(duration) });
        };

        video.onerror = () => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            // Si el host bloquea CORS pero la URL termina en .mp4/.webm, la aceptamos
            if (hasValidExt) {
                resolve({ valid: true, url: trimmed, warning: "Video validado por extensión (CORS restringido)." });
            } else {
                resolve({
                    valid: false,
                    error: "No se pudo cargar el video desde esa URL. Verifica que el enlace sea directo y público.",
                });
            }
        };

        video.src = trimmed;
    });
};
