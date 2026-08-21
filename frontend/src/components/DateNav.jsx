/**
 * DateNav – Carrusel horizontal de días (Hoy, Mañana, semana) estilo sports-app
 * + picker directo para fechas más lejanas.
 */
export default function DateNav({ value, onChange, minDate }) {
  const min = minDate || todayStr();
  const days = buildDays(7, min);

  return (
    <div className="day-nav" role="group" aria-label="Elegir fecha">
      {days.map(({ iso, weekdayLabel, dayLabel, ariaLabel }) => {
        const disabled = iso < min;
        return (
          <button
            key={iso}
            className={`day-chip ${value === iso ? "day-chip--active" : ""}`}
            onClick={() => onChange(iso)}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-pressed={value === iso}
          >
            <span className="day-chip__weekday">{weekdayLabel}</span>
            <span className="day-chip__day">{dayLabel}</span>
          </button>
        );
      })}
      <label className="day-nav__picker" title="Elegir otra fecha">
        📅
        <input
          type="date"
          value={value}
          min={min}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label="Seleccionar fecha"
        />
      </label>
    </div>
  );
}

function buildDays(count, min) {
  const today = new Date();
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const iso = d.toLocaleDateString("en-CA");
    days.push({
      iso,
      weekdayLabel: i === 0 ? "Hoy" : i === 1 ? "Mañana" : d.toLocaleDateString("es-AR", { weekday: "short" }),
      dayLabel: d.toLocaleDateString("es-AR", { day: "numeric", month: "numeric" }),
      ariaLabel: d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }),
      disabled: iso < min,
    });
  }
  return days;
}

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}
