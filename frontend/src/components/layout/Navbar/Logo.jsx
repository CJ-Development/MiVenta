import { Link } from "react-router-dom";
import logoImg from "../../../assets/images/Logo miVenta.co con bolsa y envío.png";

function Logo({ className = "" }) {
    return (
        <Link to="/" className={`logo-link ${className}`} aria-label="miVenta.co — Inicio">
            <img
                src={logoImg}
                alt="miVenta.co"
                className="logo logo-img"
            />
        </Link>
    );
}

export default Logo;

