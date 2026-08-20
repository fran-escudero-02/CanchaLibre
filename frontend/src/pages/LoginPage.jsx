import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, saveSession } from "../api/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const next = location.state?.next || "/";

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/auth/login", { method: "POST", auth: false, body: { email, password } });
      saveSession(data);
      navigate(next);
    } catch (err) {
      setError(err.status === 401 ? "Email o contraseña incorrectos" : "Error: " + err.message);
    }
  }

  return (
    <div className="card">
      <h1>Ingresar</h1>
      <form onSubmit={submit} className="form">
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p className="msg msg--error">{error}</p>}
        <button className="btn btn--primary" type="submit">Ingresar</button>
      </form>
      <p className="muted">No tenés cuenta? <Link to="/registro">Registrate</Link></p>
    </div>
  );
}
