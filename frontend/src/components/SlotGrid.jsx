import { ESTADO_SLOT, DEPORTES } from "../api/constants";
import { calcularSena, formatMoney } from "../utils/format";

/**
 * SlotGrid – Grilla interactiva de disponibilidad.
 * Renderiza las canchas con sus slots clasificados por estado.
 *
 * @param {Array} grid – Array de canchas con sus slots
 * @param {function} onSlotClick – Callback al hacer click en un slot DISPONIBLE
 * @param {boolean} loading – Si está cargando datos
 */
export default function SlotGrid({ grid, onSlotClick, loading }) {
  if (loading) return <SlotGridSkeleton />;

  if (!grid || grid.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📅</div>
        <p className="empty-state__title">No hay canchas disponibles</p>
        <p className="muted">Probá con otra fecha o complejo.</p>
      </div>
    );
  }

  return (
    <>
      <SlotLegend />
      {grid.map((cancha) => (
        <CourtSection
          key={cancha.id}
          cancha={cancha}
          onSlotClick={onSlotClick}
        />
      ))}
    </>
  );
}

function CourtSection({ cancha, onSlotClick }) {
  const deporte = DEPORTES[cancha.deporte] || { label: cancha.deporte, icon: "🏟️" };

  return (
    <section className="card court-section">
      <div className="court-header">
        <div>
          <h2>{cancha.nombre}</h2>
          <div className="court-header__info">
            <span className="court-header__tag">
              {deporte.icon} {deporte.label}
            </span>
            {cancha.techada && <span className="court-header__tag">🏠 Techada</span>}
            {cancha.superficie && (
              <span className="muted" style={{ fontSize: "0.75rem" }}>
                {cancha.superficie.replace(/_/g, " ").toLowerCase()}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="court-header__price">${formatMoney(cancha.precio)}</div>
          <div className="muted" style={{ fontSize: "0.72rem" }}>
            Seña {cancha.porcentajeSena}% · ${formatMoney(calcularSena(cancha))}
          </div>
        </div>
      </div>
      <div className="slots">
        {cancha.slots.map((slot) => (
          <SlotButton
            key={slot.id}
            slot={slot}
            onClick={() => onSlotClick?.(slot, cancha)}
          />
        ))}
      </div>
    </section>
  );
}

function SlotButton({ slot, onClick }) {
  const config = ESTADO_SLOT[slot.estado] || ESTADO_SLOT.DISPONIBLE;
  const disabled = slot.estado !== "DISPONIBLE";
  const time = formatTime(slot.inicio);

  return (
    <button
      className={`slot ${config.clase}`}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      title={`${time} – ${config.label}`}
      aria-label={`Turno ${time} – ${config.label}`}
    >
      <strong>{time}</strong>
      <small>{config.label}</small>
    </button>
  );
}

function SlotLegend() {
  return (
    <div className="slot-legend mb-md">
      <div className="slot-legend__item">
        <span className="slot-legend__dot slot-legend__dot--disponible" />
        Disponible
      </div>
      <div className="slot-legend__item">
        <span className="slot-legend__dot slot-legend__dot--proceso" />
        En proceso
      </div>
      <div className="slot-legend__item">
        <span className="slot-legend__dot slot-legend__dot--ocupado" />
        Ocupado
      </div>
      <div className="slot-legend__item">
        <span className="slot-legend__dot slot-legend__dot--bloqueado" />
        Bloqueado
      </div>
    </div>
  );
}

function SlotGridSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      {[1, 2].map((i) => (
        <div key={i} className="card">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--text" style={{ width: "40%" }} />
          <div className="slots" style={{ marginTop: "var(--space-md)" }}>
            {Array.from({ length: 10 }, (_, j) => (
              <div key={j} className="skeleton skeleton--slot" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      // Fallback: extract from ISO string
      return iso.split("T")[1]?.substring(0, 5) || "--:--";
    }
    return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}
