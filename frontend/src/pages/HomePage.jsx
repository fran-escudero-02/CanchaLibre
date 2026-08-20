import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { mockGetComplexes, DEPORTES } from "../api/mockData";

export default function HomePage() {
  const [complexes, setComplexes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mockGetComplexes()
      .then((data) => {
        setComplexes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="page-enter">
      {/* Hero */}
      <div className="hero">
        <h1>🏟️ Reservá tu cancha online</h1>
        <p>
          Encontrá disponibilidad en tiempo real, pagá la seña con Mercado Pago
          y asegurá tu turno en segundos.
        </p>
      </div>

      {/* Complejos */}
      <h2 style={{ marginBottom: "var(--space-md)" }}>Complejos deportivos</h2>

      {loading ? (
        <div className="cards">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton skeleton--title" />
              <div className="skeleton skeleton--text" />
              <div className="skeleton skeleton--text" style={{ width: "50%" }} />
            </div>
          ))}
        </div>
      ) : complexes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🏟️</div>
          <p className="empty-state__title">No hay complejos activos todavía</p>
          <p className="muted">Volvé pronto, estamos sumando complejos.</p>
        </div>
      ) : (
        <div className="cards">
          {complexes.map((c) => (
            <Link to={`/complejo/${c.id}`} className="card card--link" key={c.id}>
              <h2>{c.name}</h2>
              <p className="muted" style={{ marginBottom: "var(--space-sm)" }}>
                📍 {c.address}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", fontSize: "0.85rem" }}>
                <span>🕒 {c.openTime} a {c.closeTime}</span>
                <span>⏱️ {c.slotDurationMinutes} min</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
