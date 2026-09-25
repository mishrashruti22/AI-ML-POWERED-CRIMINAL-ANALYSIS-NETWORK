import Login from "../components/Login";

function LoginPage({ onNavigate, onLoginSuccess }) {
    return (
        <main>
            <Login onNavigate={onNavigate} onLoginSuccess={onLoginSuccess} />
        </main>
    );
}

export default LoginPage;