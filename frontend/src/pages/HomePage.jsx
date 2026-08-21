import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getComplexes } from "../api/client";
import { DEPORTES } from "../api/constants";
import { useApi } from "../hooks/useApi";

export default function HomePage() {
  const { data, loading, error } = useApi(() => getComplexes(), []);
  // El backend devuelve Page<ComplexResponse>: la lista vive en .content
  const complexes = data?.content ?? [];
  const [busqueda, setBusqueda] = useState("");
  const [deporte, setDeporte] = useState(null);

  const filtrados = useMemo(() => {
    let lista = complexes;
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter(
        (c) => c.name?.toLowerCase().includes(q) || c.address?.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [complexes, busqueda]);

  return (
    <div className="page-enter">
      {/* Hero con estadio nocturno */}
      <div className="hero">
        <div className="hero__badge">⚡ Turnos en tiempo real</div>
        <h1>Asegurá tu cancha en segundos</h1>
        <p>
          Encontrá disponibilidad al instante, pagá la seña con Mercado Pago
          y asegurá tu turno en segundos.
        </p>
      </div>

      {/* Buscador rápido flotante */}
      <div className="search-bar" role="search">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="🔎 Buscar complejo por nombre o zona…"
          aria-label="Buscar complejo"
        />
        <div className="sport-filters" style={{ padding: 0 }}>
          {Object.entries(DEPORTES)
            .filter(([key]) => ["FUTBOL_5", "FUTBOL_7", "PADEL", "TENIS"].includes(key))
            .map(([key, info]) => (
              <button
                key={key}
                className={`sport-chip ${deporte === key ? "sport-chip--active" : ""}`}
                onClick={() => setDeporte(deporte === key ? null : key)}
                aria-pressed={deporte === key}
                title={`Ver canchas de ${info.label}`}
              >
                {info.icon}
              </button>
            ))}
        </div>
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
      ) : filtrados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">{busqueda ? "🔍" : "🏟️"}</div>
          <p className="empty-state__title">
            {busqueda ? "No encontramos complejos con esa búsqueda" : "No hay complejos activos todavía"}
          </p>
          <p className="muted">
            {busqueda ? "Probá con otro nombre o zona." : "Volvé pronto, estamos sumando complejos."}
          </p>
        </div>
      ) : (
        <div className="cards">
          {filtrados.map((c) => (
            <Link
              to={deporte ? `/complejo/${c.id}?deporte=${deporte}` : `/complejo/${c.id}`}
              className="card card--link"
              key={c.id}
            >
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
