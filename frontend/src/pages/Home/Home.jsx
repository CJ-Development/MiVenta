import Hero from "../../components/Home/Hero/Hero";
import FeaturedProducts from "../Products/FeaturedProducts/FeaturedProducts";
import SEO from "../../components/SEO/SEO";

function Home() {

    return (

        <>

            <SEO
                title="miVenta.co — Tu tienda online"
                description="miVenta.co - Compra fácil, entrega segura. Encuentra productos de calidad con envíos rápidos a toda Colombia."
                path="/"
            />

            <Hero />

            <FeaturedProducts />

        </>

    );

}

export default Home;