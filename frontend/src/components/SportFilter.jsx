import { DEPORTES } from "../api/constants";

/**
 * SportFilter – Chips de filtro por deporte con conteo de canchas.
 * @param {string[]} sports – Lista de claves de deporte únicas
 * @param {string|null} active – Deporte activo (null = todos)
 * @param {function} onChange – Callback con la clave seleccionada o null
 * @param {Object|null} counts – Mapa clave → cantidad de canchas (opcional)
 */
export default function SportFilter({ sports, active, onChange, counts }) {
  if (!sports || sports.length <= 1) return null;

  return (
    <div className="sport-filters">
      <button
        className={`sport-chip ${active === null ? "sport-chip--active" : ""}`}
        onClick={() => onChange(null)}
        aria-pressed={active === null}
      >
        Todas
      </button>
      {sports.map((key) => {
        const info = DEPORTES[key] || { label: key, icon: "🏟️" };
        return (
          <button
            key={key}
            className={`sport-chip ${active === key ? "sport-chip--active" : ""}`}
            onClick={() => onChange(active === key ? null : key)}
            aria-pressed={active === key}
          >
            {info.icon} {info.label}
            {counts && counts[key] != null && (
              <span className="sport-chip__count">{counts[key]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
