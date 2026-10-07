import AppRouter from "./routes/AppRouter";
import AuthProvider from "./context/AuthProvider";

function App() {

    return (

        <AuthProvider>

            <AppRouter />

        </AuthProvider>

    );

}

export default App;