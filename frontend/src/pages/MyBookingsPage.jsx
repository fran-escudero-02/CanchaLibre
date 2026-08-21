import { useEffect, useState } from "react";
import { mockGetMyBookings, mockCancelBooking, ESTADO_BOOKING } from "../api/mockData";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";

export default function MyBookingsPage() {
  const toast = useToast();
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    mockGetMyBookings()
      .then((data) => {
        setReservas(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleCancel() {
    if (!cancelId) return;
    setCancelling(true);
    try {
      const res = await mockCancelBooking(cancelId);
      const msg = res.resultado === "CANCELADA_REEMBOLSADA"
        ? "Reserva cancelada. La seña será reembolsada por Mercado Pago."
        : "Reserva cancelada. La seña quedó retenida por el complejo (margen ≤ 2 hs).";
      toast?.success(msg);
      setCancelId(null);
      // Refresh
      const updated = await mockGetMyBookings();
      setReservas(updated);
    } catch (e) {
      toast?.error("Error: " + e.message);
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

      {reservas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <p className="empty-state__title">Todavía no tenés reservas</p>
          <p className="muted">Explorá los complejos y reservá tu primer turno.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", marginTop: "var(--space-md)" }}>
          {reservas.map((r) => {
            const estadoConfig = ESTADO_BOOKING[r.estado] || { label: r.estado, badge: "badge--disponible" };
            const fecha = new Date(r.inicio);
            const isFuture = fecha > new Date();

            return (
              <div className="card" key={r.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-sm)" }}>
                  <div>
                    <h2 style={{ marginBottom: "var(--space-xs)" }}>{r.complejo}</h2>
                    <p className="muted" style={{ marginBottom: "var(--space-xs)" }}>{r.cancha}</p>
                  </div>
                  <span className={`badge ${estadoConfig.badge}`}>
                    {estadoConfig.label}
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm) var(--space-md)", marginTop: "var(--space-sm)", fontSize: "0.88rem" }}>
                  <span>📅 {fecha.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}</span>
                  <span>🕒 {fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs</span>
                </div>

                <div className="resumen" style={{ marginTop: "var(--space-sm)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="muted">Seña</span>
                    <strong>${r.sena?.toLocaleString("es-AR")}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="muted">Saldo mostrador</span>
                    <span>${r.saldoMostrador?.toLocaleString("es-AR")}</span>
                  </div>
                </div>

                {r.estado === "CONFIRMADA" && isFuture && (
                  <button
                    className="btn btn--danger btn--small mt-md"
                    onClick={() => setCancelId(r.id)}
                  >
                    Cancelar reserva
                  </button>
                )}
              </div>
            );
          })}
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
            <button className="btn btn--danger" onClick={handleCancel} disabled={cancelling}>
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
