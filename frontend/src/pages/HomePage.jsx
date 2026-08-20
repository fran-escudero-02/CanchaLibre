import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function HomePage() {
  const [complexes, setComplexes] = useState([]);

  useEffect(() => {
    api("/complexes", { auth: false }).then(setComplexes).catch(console.error);
  }, []);

  return (
    <div>
      <h1>Complejos deportivos</h1>
      <div className="cards">
        {complexes.map((c) => (
          <Link to={`/complejo/${c.id}`} className="card card--link" key={c.id}>
            <h2>{c.name}</h2>
            <p className="muted">{c.address}</p>
            <p>🕒 {c.openTime} a {c.closeTime} · Turnos de {c.slotDurationMinutes} min</p>
          </Link>
        ))}
        {complexes.length === 0 && <p className="muted">No hay complejos activos todavía.</p>}
      </div>
    </div>
  );
}
