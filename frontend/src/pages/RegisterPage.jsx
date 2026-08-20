import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, saveSession } from "../api/client";

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/auth/register", { method: "POST", auth: false, body: form });
      saveSession(data);
      navigate("/");
    } catch (err) {
      setError(err.status === 409 ? "Ese email ya está registrado" : "Error: " + err.message);
    }
  }

  return (
    <div className="card">
      <h1>Crear cuenta</h1>
      <form onSubmit={submit} className="form">
        <label>Nombre completo<input value={form.fullName} onChange={set("fullName")} required /></label>
        <label>Email<input type="email" value={form.email} onChange={set("email")} required /></label>
        <label>Teléfono<input value={form.phone} onChange={set("phone")} required /></label>
        <label>Contraseña (mínimo 8)<input type="password" minLength={8} value={form.password} onChange={set("password")} required /></label>
        {error && <p className="msg msg--error">{error}</p>}
        <button className="btn btn--primary" type="submit">Registrarme</button>
      </form>
      <p className="muted">Ya tenés cuenta? <Link to="/login">Ingresá</Link></p>
    </div>
  );
}
