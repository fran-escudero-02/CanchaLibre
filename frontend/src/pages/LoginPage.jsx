import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { saveSession } from "../api/client";
import { mockLogin } from "../api/mockData";
import { useToast } from "../components/Toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const next = location.state?.next || "/";

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await mockLogin(email, password);
      saveSession(data);
      toast?.success(`¡Bienvenido, ${data.fullName}!`);
      // Force re-render of App by navigating
      window.location.href = next;
    } catch (err) {
      setError(err.status === 401 ? "Email o contraseña incorrectos" : "Error: " + err.message);
      setLoading(false);
    }
  }

  return (
    <div className="page-enter" style={{ maxWidth: 420, margin: "0 auto" }}>
      <div className="card">
        <h1 style={{ textAlign: "center", marginBottom: "var(--space-lg)" }}>
          Ingresar
        </h1>
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
        <p className="muted text-center" style={{ marginTop: "var(--space-md)" }}>
          ¿No tenés cuenta? <Link to="/registro">Registrate</Link>
        </p>
        <p className="muted text-center" style={{ fontSize: "0.75rem", marginTop: "var(--space-sm)" }}>
          💡 Usá <strong>admin@canchalibre.com</strong> para ingresar como administrador (demo)
        </p>
      </div>
    </div>
  );
}
