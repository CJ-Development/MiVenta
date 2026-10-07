
// Convierte un nombre de categoría a un slug URL-safe.
// "Ropa de Mujer" -> "ropa-de-mujer", "Niños" -> "ninos".
export function slugify(value) {
    if (!value) return "";
    return String(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}
