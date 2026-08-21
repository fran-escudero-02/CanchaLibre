import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cancelBooking, getMyBookings } from "../api/client";
import { ESTADO_BOOKING } from "../api/constants";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useApi } from "../hooks/useApi";
import { formatMoney } from "../utils/format";

const REFUND_WINDOW_MS = 2 * 60 * 60 * 1000; // política de 2 hs (HU-12)

const TABS = [
  { id: "proximas", label: "Próximas" },
  { id: "completadas", label: "Completadas" },
  { id: "canceladas", label: "Canceladas" },
];

export default function MyBookingsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => getMyBookings(), []);
  // El backend devuelve Page<MyBookingDTO>: la lista vive en .content
  const reservas = data?.content ?? [];
  const [tab, setTab] = useState("proximas");
  const [cancelId, setCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Clasificación por pestaña según estado y fecha
  const buckets = useMemo(() => {
    const now = Date.now();
    const b = { proximas: [], completadas: [], canceladas: [] };
    for (const r of reservas) {
      const future = new Date(r.inicio).getTime() > now;
      if (r.estado.startsWith("CANCELADA") || r.estado === "EXPIRADA") b.canceladas.push(r);
      else if (future && (r.estado === "CONFIRMADA" || r.estado === "PENDIENTE_PAGO")) b.proximas.push(r);
      else b.completadas.push(r); // COMPLETADA o confirmadas que ya pasaron
    }
    return b;
  }, [reservas]);

  const visibles = buckets[tab] ?? [];

  async function handleCancel() {
    if (!cancelId) return;
    setCancelling(true);
    try {
      const res = await cancelBooking(cancelId);
      const msg = res.resultado === "CANCELADA_REEMBOLSADA"
        ? "Reserva cancelada. La seña será reembolsada por Mercado Pago."
        : "Reserva cancelada. La seña quedó retenida por el complejo (margen ≤ 2 hs).";
      toast.success(msg);
      setCancelId(null);
      reload();
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setCancelling(false);
  }

  if (loading) {
    return (
      <div className="page-enter">
        <div className="skeleton skeleton--title" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="card" style={{ marginBottom: "var(--space-md)" }}>
            <div className="skeleton skeleton--title" style={{ width: "70%" }} />
            <div className="skeleton skeleton--text" />
            <div className="skeleton skeleton--text" style={{ width: "50%" }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="page-enter">
      <h1>Mis reservas</h1>

      {/* Pestañas */}
      <div className="tabs" role="tablist" aria-label="Estado de las reservas">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? "tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span className="tab__count">{buckets[t.id]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      {error ? (
        <p className="msg msg--error" role="alert">⚠️ {error}</p>
      ) : visibles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <p className="empty-state__title">
            {tab === "proximas" ? "No tenés reservas próximas" : `No tenés reservas ${tab}`}
          </p>
          {tab === "proximas" && (
            <>
              <p className="muted">Explorá los complejos y reservá tu primer turno.</p>
              <Link className="btn btn--primary mt-md" to="/">Buscar canchas</Link>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {visibles.map((r) => (
            <BookingTicket key={r.id} r={r} onCancel={() => setCancelId(r.id)} />
          ))}
        </div>
      )}

      {/* Modal de cancelación */}
      <ConfirmModal
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        title="¿Cancelar esta reserva?"
        actions={
          <>
            <button className="btn btn--outline" onClick={() => setCancelId(null)}>
              Volver
            </button>
            <button className="btn btn--danger btn--filled" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelando…" : "Sí, cancelar"}
            </button>
          </>
        }
      >
        <div>
          <p style={{ marginBottom: "var(--space-sm)" }}>
            ⚠️ <strong>Política de cancelación:</strong>
          </p>
          <ul style={{ paddingLeft: "var(--space-lg)", fontSize: "0.88rem", color: "var(--text-secondary)" }}>
            <li>Si faltan <strong>más de 2 horas</strong> para el turno → la seña se reembolsa automáticamente.</li>
            <li>Si faltan <strong>2 horas o menos</strong> → la seña queda para el complejo.</li>
          </ul>
        </div>
      </ConfirmModal>
    </div>
  );
}

/**
 * Ticket deportivo: código de reserva, cancha, fecha/hora, desglose de pago
 * y botón de cancelación con la política visual de reembolso (HU-12).
 */
function BookingTicket({ r, onCancel }) {
  const estadoConfig = ESTADO_BOOKING[r.estado] || { label: r.estado, badge: "badge--disponible" };
  const fecha = new Date(r.inicio);
  const marginMs = fecha.getTime() - Date.now();
  const esManual = r.fuente === "MOSTRADOR";
  const reembolsable = marginMs > REFUND_WINDOW_MS;

  const sideClass = r.estado.startsWith("CANCELADA") || r.estado === "EXPIRADA"
    ? "ticket__side--error"
    : r.estado === "CONFIRMADA" || r.estado === "PENDIENTE_PAGO"
      ? ""
      : "ticket__side--muted";

  return (
    <article className={`ticket ${esManual ? "ticket--manual" : ""}`}>
      <div className={`ticket__side ${sideClass}`} aria-hidden="true" />
      <div className="ticket__body">
        <div className="ticket__header">
          <div>
            <h2 style={{ margin: 0 }}>{r.complejo}</h2>
            <p className="muted" style={{ marginBottom: 0 }}>{r.cancha}</p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {esManual && <span className="badge badge--manual">🎫 Mostrador</span>}
            <span className={`badge ${estadoConfig.badge}`}>{estadoConfig.label}</span>
          </div>
        </div>

        <p className="ticket__code" style={{ marginTop: "var(--space-xs)" }}>
          RESERVA #{String(r.id).padStart(4, "0")}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm) var(--space-md)", marginTop: "var(--space-sm)", fontSize: "0.88rem" }}>
          <span>📅 {fecha.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}</span>
          <span className="tnum">🕒 {fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs</span>
        </div>

        {/* Turno manual: el dueño distingue a quién corresponde la reserva */}
        {esManual && r.titular && (
          <p className="muted" style={{ marginTop: "var(--space-sm)", marginBottom: 0 }}>
            👤 Titular: <strong style={{ color: "var(--text-primary)" }}>{r.titular}</strong>
            {r.telefono && <> · 📞 {r.telefono}</>}
          </p>
        )}

        <hr className="ticket__divider" />

        <div className="resumen" style={{ background: "transparent", border: "none", padding: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Seña abonada {esManual ? "—" : "vía MP"}</span>
            <strong>${formatMoney(r.sena)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Saldo pendiente en el club</span>
            <span>${formatMoney(r.saldoMostrador)}</span>
          </div>
        </div>

        {r.estado === "PENDIENTE_PAGO" && marginMs > 0 && (
          <Link to={`/checkout/${r.id}`} className="btn btn--primary btn--small mt-md">
            💳 Completar pago
          </Link>
        )}

        {r.estado === "CONFIRMADA" && marginMs > 0 && (
          esManual ? (
            <button className="btn btn--danger btn--small mt-md" onClick={onCancel}>
              ✖ Cancelar turno
            </button>
          ) : reembolsable ? (
            <button className="btn btn--danger btn--small mt-md" onClick={onCancel}>
              Cancelar Reserva (Reembolso 100% de la seña)
            </button>
          ) : (
            <div style={{ marginTop: "var(--space-md)" }}>
              <button className="btn btn--danger btn--small" disabled title="La seña no es reembolsable con menos de 2 horas de margen">
                Cancelar Reserva
              </button>
              <p className="msg msg--error" style={{ marginTop: "var(--space-sm)", fontSize: "0.78rem" }}>
                ⏰ Cancelación tardía: la seña no es reembolsable (faltan ≤ 2 hs para el turno)
              </p>
            </div>
          )
        )}
      </div>
    </article>
  );
}
