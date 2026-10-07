import "./Navbar.css";

import Logo from "./Logo";
import SearchBar from "./SearchBar";
import NavLinks from "./NavLinks";
import CartButton from "./CartButton";
import MobileNavPanel from "./MobileNavPanel";

import CartDrawer from "../../cart/CartDrawer/CartDrawer";

import { useAuth } from "../../../hooks/useAuth";
import { esAdmin } from "../../../utils/esAdmin";
import { Link } from "react-router-dom";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";

function Navbar() {
    const { usuario } = useAuth();
    const isAdmin = esAdmin(usuario);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="navbar">

            <div className="navbar-top">

                <div className="navbar-left">
                    <button
                        className="mobile-menu-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <Logo />
                </div>

                <div className="navbar-actions">
                    {isAdmin && (
                        <Link
                            to="/admin"
                            className="admin-panel-link"
                            title="Panel administrativo"
                        >
                            <LayoutDashboard size={18} />
                            <span>Panel admin</span>
                        </Link>
                    )}
                    <SearchBar />
                    <CartButton />
                </div>

            </div>

            <NavLinks mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

            {/* Panel de navegación móvil (drawer) */}
            <MobileNavPanel
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
            />

            <CartDrawer />

        </header>
    );
}

export default Navbar;
