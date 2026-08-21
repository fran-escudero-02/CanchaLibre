import { Link } from "react-router-dom";
import { getComplexes } from "../api/client";
import { useApi } from "../hooks/useApi";

export default function HomePage() {
  const { data, loading, error } = useApi(() => getComplexes(), []);
  // El backend devuelve Page<ComplexResponse>: la lista vive en .content
  const complexes = data?.content ?? [];

  return (
    <div className="page-enter">
      {/* Hero */}
      <div className="hero">
        <div className="hero__badge">⚡ Disponibilidad en tiempo real</div>
        <h1>Reservá tu cancha online</h1>
        <p>
          Encontrá disponibilidad al instante, pagá la seña con Mercado Pago
          y asegurá tu turno en segundos.
        </p>
      </div>

      {/* Complejos */}
      <div className="section-heading">
        <div className="section-heading__icon">🏟️</div>
        <h2>Complejos deportivos</h2>
      </div>

      {error ? (
        <p className="msg msg--error" role="alert">
          ⚠️ No se pudieron cargar los complejos: {error}
        </p>
      ) : loading ? (
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
              <h3 className="complex-card__title">{c.name}</h3>
              <p className="muted" style={{ marginBottom: 0 }}>
                📍 {c.address || "Sin dirección cargada"}
              </p>
              <div className="complex-card__footer">
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
