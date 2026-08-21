import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const auth = useAuth();

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await register(form);
      auth.login(data);
      toast.success(`¡Cuenta creada! Bienvenido, ${data.fullName}`);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.status === 409 ? "Ese email ya está registrado" : "Error: " + err.message);
      setLoading(false);
    }
  }

  return (
    <div className="page-enter auth-page">
      <div className="auth-card">
        <div className="card">
          <h1>Crear cuenta</h1>
          <p className="auth-card__subtitle">Registrate para empezar a reservar</p>
          <form onSubmit={submit} className="form">
            <label>
              Nombre completo
              <input value={form.fullName} onChange={set("fullName")} placeholder="Tu nombre" required autoFocus />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={set("email")} placeholder="tu@email.com" required />
            </label>
            <label>
              Teléfono
              <input value={form.phone} onChange={set("phone")} placeholder="Ej: 11-2345-6789" required />
            </label>
            <label>
              Contraseña (mínimo 8)
              <input type="password" minLength={8} value={form.password} onChange={set("password")} placeholder="Mínimo 8 caracteres" required />
            </label>
            {error && <p className="msg msg--error">⚠️ {error}</p>}
            <button className="btn btn--primary w-full" type="submit" disabled={loading}>
              {loading ? "Creando cuenta…" : "Registrarme"}
            </button>
          </form>
          <div className="auth-divider">o</div>
          <p className="muted text-center">
            ¿Ya tenés cuenta? <Link to="/login">Ingresá</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
