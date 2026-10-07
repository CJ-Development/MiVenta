import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MagnifyingGlass, Spinner, X, Package } from "@phosphor-icons/react";

import { getProducts } from "../../../services/adminService";
import { mediaUrl } from "../../../utils/mediaUrl";
import NoImage from "../../../assets/images/Imagen no disponible.png";

function SearchBar() {
    const navigate = useNavigate();
    const location = useLocation();

    const initialQuery =
        location.pathname === "/products"
            ? new URLSearchParams(location.search).get("q") || ""
            : "";

    const [query, setQuery] = useState(initialQuery);
    const [sugerencias, setSugerencias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isExpanded, setIsExpanded] = useState(false);

    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);
    const abortRef = useRef(null);

    /* Cargar sugerencias con debounce */
    useEffect(() => {
        const termino = query.trim();

        if (termino.length < 2) {
            setSugerencias([]);
            setOpen(false);
            setLoading(false);
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            try {
                if (abortRef.current) {
                    abortRef.current.abort();
                }

                const controller = new AbortController();
                abortRef.current = controller;

                setLoading(true);

                const { data } = await getProducts({
                    signal: controller.signal,
                });

                const lista = Array.isArray(data) ? data : [];
                const texto = termino.toLowerCase();

                const matches = lista
                    .filter(
                        (p) =>
                            p.estado === "activo" &&
                            (p.nombre || "")
                                .toLowerCase()
                                .includes(texto)
                    )
                    .slice(0, 6);

                setSugerencias(matches);
                setOpen(matches.length > 0);
                setActiveIndex(-1);
            } catch (err) {
                if (
                    err?.name !== "CanceledError" &&
                    err?.code !== "ERR_CANCELED"
                ) {
                    console.error("Error buscando:", err);
                }
                setSugerencias([]);
                setOpen(false);
            } finally {
                if (!abortRef.current?.signal.aborted) {
                    setLoading(false);
                }
            }
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query]);

    /* Cerrar al hacer click fuera */
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target)
            ) {
                setOpen(false);
                setIsExpanded(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, []);

    const handleOpen = () => {
        setIsExpanded(true);
        setTimeout(() => {
            inputRef.current?.focus();
        }, 60);
    };

    const handleClose = () => {
        setIsExpanded(false);
        setOpen(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const termino = query.trim();

        if (!termino) {
            setIsExpanded(false);
            setOpen(false);
            if (location.pathname === "/products") {
                navigate("/products");
            }
            return;
        }

        setOpen(false);
        setIsExpanded(false);
        navigate(`/products?q=${encodeURIComponent(termino)}`);
    };

    const handleSelect = (producto) => {
        setOpen(false);
        setIsExpanded(false);
        setQuery("");
        setSugerencias([]);
        navigate(`/producto/${producto.slug || producto.id_producto}`);
    };

    const handleClear = () => {
        setQuery("");
        setSugerencias([]);
        setOpen(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            setOpen(false);
            setIsExpanded(false);
            return;
        }

        if (!open || sugerencias.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) =>
                prev < sugerencias.length - 1
                    ? prev + 1
                    : 0
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) =>
                prev > 0
                    ? prev - 1
                    : sugerencias.length - 1
            );
        } else if (
            e.key === "Enter" &&
            activeIndex >= 0
        ) {
            e.preventDefault();
            handleSelect(sugerencias[activeIndex]);
        }
    };

    const getProductImage = (p) => {
        const variantes = p?.variantes || [];
        for (const v of variantes) {
            const imgs = v.imagenes || [];
            const principal = imgs.find(
                (i) => i.principal === true
            );
            if (principal?.imagen) {
                return mediaUrl(principal.imagen, NoImage);
            }
            if (imgs[0]?.imagen) {
                return mediaUrl(imgs[0].imagen, NoImage);
            }
        }
        return NoImage;
    };

    const formatPrice = (n) =>
        Number(n || 0).toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
        });

    return (
        <div className="search-container" ref={containerRef}>
            {!isExpanded ? (
                <button
                    type="button"
                    className="search-trigger-btn"
                    onClick={handleOpen}
                    aria-label="Buscar productos"
                    title="Buscar productos"
                >
                    <MagnifyingGlass size={20} weight="bold" />
                </button>
            ) : (
                <form
                    className="search-form-expanded"
                    onSubmit={handleSubmit}
                    role="search"
                >
                    <button
                        type="submit"
                        className="search-submit-btn"
                        aria-label="Buscar"
                    >
                        <MagnifyingGlass size={18} weight="bold" />
                    </button>

                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Buscar productos..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => {
                            if (sugerencias.length > 0) {
                                setOpen(true);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        aria-label="Buscar productos"
                        aria-autocomplete="list"
                        aria-expanded={open}
                        autoComplete="off"
                    />

                    {query && !loading && (
                        <button
                            type="button"
                            className="search-clear-btn"
                            onClick={handleClear}
                            aria-label="Limpiar búsqueda"
                        >
                            <X size={15} weight="bold" />
                        </button>
                    )}

                    {loading && (
                        <span
                            className="search-loading-icon"
                            aria-label="Buscando"
                        >
                            <Spinner size={16} />
                        </span>
                    )}

                    <button
                        type="button"
                        className="search-close-btn"
                        onClick={handleClose}
                        aria-label="Cerrar buscador"
                        title="Cerrar"
                    >
                        <X size={17} weight="bold" />
                    </button>

                    {open && sugerencias.length > 0 && (
                        <div
                            className="search-suggestions"
                            role="listbox"
                        >
                            <div className="search-suggestions-header">
                                <Package size={13} weight="bold" />
                                <span>
                                    {sugerencias.length}{" "}
                                    {sugerencias.length === 1
                                        ? "producto encontrado"
                                        : "productos encontrados"}
                                </span>
                            </div>

                            <ul className="search-suggestions-list">
                                {sugerencias.map((p, idx) => {
                                    const isActive =
                                        idx === activeIndex;
                                    return (
                                        <li
                                            key={p.id_producto}
                                            role="option"
                                            aria-selected={isActive}
                                            className={
                                                isActive
                                                    ? "search-suggestion-item active"
                                                    : "search-suggestion-item"
                                            }
                                            onMouseEnter={() =>
                                                setActiveIndex(idx)
                                            }
                                            onMouseDown={(e) =>
                                                e.preventDefault()
                                            }
                                            onClick={() =>
                                                handleSelect(p)
                                            }
                                        >
                                            <img
                                                src={getProductImage(p)}
                                                alt={p.nombre}
                                                className="search-suggestion-img"
                                                loading="lazy"
                                            />
                                            <div className="search-suggestion-info">
                                                <strong className="search-suggestion-name">
                                                    {p.nombre}
                                                </strong>
                                                <span className="search-suggestion-cat">
                                                    {p.categoria?.nombre ||
                                                        "Producto"}
                                                </span>
                                            </div>
                                            <span className="search-suggestion-price">
                                                {formatPrice(p.precio)}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>

                            <button
                                type="button"
                                className="search-suggestions-footer"
                                onClick={handleSubmit}
                            >
                                Ver todos los resultados para "{query.trim()}"
                            </button>
                        </div>
                    )}

                    {open &&
                        query.trim().length >= 2 &&
                        sugerencias.length === 0 &&
                        !loading && (
                            <div className="search-suggestions search-empty">
                                <span>
                                    No encontramos productos para "{query.trim()}"
                                </span>
                            </div>
                        )}
                </form>
            )}
        </div>
    );
}

export default SearchBar;
