import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
import "./DashboardCard.css";

function DashboardCard({
    icon,
    title,
    linkTo,
    value,
    trendText,
    variant = "purple", // "purple" | "pink"
    sparklinePoints,
}) {
    // Generar un path de sparkline SVG suave
    const strokeColor = variant === "pink" ? "#FF4F9A" : "#6A2CA0";
    const gradientId = `spark-grad-${variant}-${title.toLowerCase()}`;

    return (
        <article className={`dashboard-kpi-card ${variant}`}>
            {/* Header: Icono + Título con flecha */}
            <div className="kpi-card-header">
                <div className={`kpi-icon-box ${variant}`}>
                    {icon}
                </div>

                <Link to={linkTo || "#"} className="kpi-title-link">
                    <span>{title}</span>
                    <ArrowRight size={14} className="kpi-arrow" />
                </Link>
            </div>

            {/* Número y tendencia */}
            <div className="kpi-card-content">
                <h2 className="kpi-value">{value}</h2>
                <div className="kpi-trend">
                    <TrendingUp size={13} className="kpi-trend-icon" />
                    <span>{trendText}</span>
                </div>
            </div>

            {/* Gráfica Sparkline decorativa al fondo de la tarjeta */}
            <div className="kpi-sparkline-wrap">
                <svg
                    viewBox="0 0 240 50"
                    preserveAspectRatio="none"
                    className="kpi-sparkline-svg"
                >
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop
                                offset="0%"
                                stopColor={strokeColor}
                                stopOpacity={variant === "pink" ? "0.2" : "0.15"}
                            />
                            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Área sombreada */}
                    <path
                        d="M 0,35 Q 35,18 70,30 T 140,25 T 210,18 L 240,22 L 240,50 L 0,50 Z"
                        fill={`url(#${gradientId})`}
                    />

                    {/* Línea curva */}
                    <path
                        d="M 0,35 Q 35,18 70,30 T 140,25 T 210,18 L 240,22"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                    />

                    {/* Punto final destacado */}
                    <circle cx="238" cy="22" r="3.5" fill={strokeColor} />
                </svg>
            </div>
        </article>
    );
}

export default DashboardCard;