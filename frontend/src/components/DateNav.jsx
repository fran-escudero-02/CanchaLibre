/**
 * DateNav – Navegador de fecha con botones prev/next y acceso directo al date picker.
 */
export default function DateNav({ value, onChange, minDate }) {
  const min = minDate || todayStr();

  function shift(days) {
    const d = new Date(value + "T12:00:00");
    d.setDate(d.getDate() + days);
    const next = d.toLocaleDateString("en-CA");
    if (next >= min) onChange(next);
  }

  const label = formatDateLabel(value);
  const isPrevDisabled = value <= min;

  return (
    <div className="date-nav">
      <button
        className="date-nav__btn"
        onClick={() => shift(-1)}
        disabled={isPrevDisabled}
        aria-label="Día anterior"
      >
        ‹
      </button>
      <span className="date-nav__label">{label}</span>
      <button
        className="date-nav__btn"
        onClick={() => shift(1)}
        aria-label="Día siguiente"
      >
        ›
      </button>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Seleccionar fecha"
      />
    </div>
  );
}

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const today = todayStr();
  const tomorrow = (() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toLocaleDateString("en-CA");
  })();

  if (dateStr === today) return "📅 Hoy";
  if (dateStr === tomorrow) return "📅 Mañana";

  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
