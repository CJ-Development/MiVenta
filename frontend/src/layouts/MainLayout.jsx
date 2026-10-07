import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import DataConsentBanner from "../components/common/DataConsentBanner/DataConsentBanner";
import { Outlet } from "react-router-dom";

function MainLayout() {
  return (
    <>
      <Navbar />

      <main>
        <Outlet />
      </main>

      <Footer />

      <DataConsentBanner />
    </>
  );
}

export default MainLayout;