import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const auth = useAuth();
  const next = location.state?.next || "/";

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      auth.login(data);
      toast.success(`¡Bienvenido, ${data.fullName}!`);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.status === 401 ? "Email o contraseña incorrectos" : "Error: " + err.message);
      setLoading(false);
    }
  }

  return (
    <div className="page-enter auth-page">
      <div className="auth-card">
        <div className="card">
          <h1>Bienvenido de vuelta</h1>
          <p className="auth-card__subtitle">Ingresá a tu cuenta para reservar</p>
          <form onSubmit={submit} className="form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
              />
            </label>
            {error && <p className="msg msg--error">⚠️ {error}</p>}
            <button className="btn btn--primary w-full" type="submit" disabled={loading}>
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
          <div className="auth-divider">o</div>
          <p className="muted text-center">
            ¿No tenés cuenta? <Link to="/registro">Registrate</Link>
          </p>
          <p className="muted text-center" style={{ fontSize: "0.75rem", marginTop: "var(--space-sm)" }}>
            💡 Demo: <strong>player@canchalibre.dev</strong> / player1234 ·{" "}
            <strong>admin@canchalibre.dev</strong> / admin1234
          </p>
        </div>
      </div>
    </div>
  );
}
