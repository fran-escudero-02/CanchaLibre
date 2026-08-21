import { useState } from "react";
import {
  blockSlot,
  cancelBooking,
  getAdminAgenda,
  manualBooking,
  unblockSlot,
  updateManualBooking,
} from "../api/client";
import { DEPORTES } from "../api/constants";
import DateNav from "../components/DateNav";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useApi } from "../hooks/useApi";
import { formatMoney, hoy } from "../utils/format";

export default function AdminAgendaPage() {
  const toast = useToast();
  const [fecha, setFecha] = useState(hoy());

  const {
    data: agenda,
    loading,
    error,
    reload,
  } = useApi(() => getAdminAgenda(fecha), [fecha]);

  // Modal de turno manual (alta)
  const [manualSlot, setManualSlot] = useState(null);
  const [titular, setTitular] = useState("");
  const [telefono, setTelefono] = useState("");

  // Modal de edición de turno manual
  const [editBooking, setEditBooking] = useState(null); // { bookingId, titular, telefono }

  // Modal de cancelación de reserva
  const [cancelTarget, setCancelTarget] = useState(null); // { bookingId, titular }

  // Modal de bloqueo
  const [blockSlotId, setBlockSlotId] = useState(null);
  const [motivo, setMotivo] = useState("Mantenimiento");

  function cerrarModales() {
    setManualSlot(null);
    setEditBooking(null);
    setCancelTarget(null);
    setBlockSlotId(null);
    setTitular("");
    setTelefono("");
  }

  async function handleBlock() {
    if (!blockSlotId) return;
    try {
      await blockSlot(blockSlotId, motivo.trim() || "Mantenimiento");
      toast.success("Turno bloqueado correctamente");
      setBlockSlotId(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleUnblock(slotId) {
    try {
      await unblockSlot(slotId);
      toast.success("Turno desbloqueado");
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleManualBooking() {
    if (!manualSlot || !titular.trim()) {
      toast.error("Ingresá al menos el nombre del titular");
      return;
    }
    try {
      await manualBooking(manualSlot, titular.trim(), telefono.trim());
      toast.success("Turno manual registrado como CONFIRMADO");
      cerrarModales();
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleEditBooking() {
    if (!editBooking || !editBooking.titular.trim()) {
      toast.error("Ingresá al menos el nombre del titular");
      return;
    }
    try {
      await updateManualBooking(
        editBooking.bookingId,
        editBooking.titular.trim(),
        editBooking.telefono.trim()
      );
      toast.success("Turno manual actualizado");
      cerrarModales();
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleCancelBooking() {
    if (!cancelTarget) return;
    try {
      const res = await cancelBooking(cancelTarget.bookingId);
      const msg = res.resultado === "CANCELADA_REEMBOLSADA"
        ? "Reserva cancelada (seña reembolsada según política)."
        : "Reserva cancelada (seña retenida según política).";
      toast.success(msg);
      cerrarModales();
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (loading) {
    return (
      <div className="page-enter">
        <div className="skeleton skeleton--title" />
        <div className="kpis">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton--card" style={{ height: 80 }} />
          ))}
        </div>
        <div className="skeleton skeleton--card" style={{ height: 200 }} />
      </div>
    );
  }

  if (error || !agenda) {
    return (
      <div className="page-enter">
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <p className="empty-state__title">No se pudo cargar la agenda</p>
          <p className="muted">{error || "Intentá de nuevo más tarde."}</p>
          <button className="btn btn--outline mt-md" onClick={reload}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // KPIs de ocupación calculados sobre los slots de la agenda
  const totalSlots = agenda.canchas.reduce((acc, c) => acc + c.slots.length, 0);
  const slotsConfirmados = agenda.canchas.reduce(
    (acc, c) => acc + c.slots.filter((s) => s.estado === "CONFIRMADO").length,
    0
  );
  const slotsBloqueados = agenda.canchas.reduce(
    (acc, c) => acc + c.slots.filter((s) => s.estado === "BLOQUEADO").length,
    0
  );
  const ocupacion = totalSlots > 0 ? Math.round(((slotsConfirmados + slotsBloqueados) / totalSlots) * 100) : 0;

  // Anillo de progreso de ocupación
  const ringCircumference = 2 * Math.PI * 26;

  return (
    <div className="page-enter">
      <h1>Agenda del día</h1>

      {/* Date nav */}
      <DateNav value={fecha} onChange={setFecha} minDate={hoy()} />

      {/* KPIs — bento grid */}
      <div className="kpis">
        <div className="kpi kpi--accent">
          <div className="kpi-ring" role="img" aria-label={`Ocupación del día: ${ocupacion}%`}>
            <svg viewBox="0 0 64 64">
              <circle className="bg-ring" cx="32" cy="32" r="26" />
              <circle
                className="fg-ring"
                cx="32" cy="32" r="26"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringCircumference * (1 - ocupacion / 100)}
              />
            </svg>
            <span className="kpi-ring__pct">{ocupacion}%</span>
          </div>
          <div className="kpi__body">
            <span className="kpi__value">{slotsConfirmados + slotsBloqueados}/{totalSlots}</span>
            <span className="kpi__label">Ocupación del día</span>
          </div>
        </div>
        <div className="kpi kpi--accent">
          <div className="kpi__body">
            <span className="kpi__value">${formatMoney(agenda.totalSenas)}</span>
            <span className="kpi__label">Señas cobradas vía MP</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__body">
            <span className="kpi__value">${formatMoney(agenda.totalSaldos)}</span>
            <span className="kpi__label">Saldo a cobrar en mostrador</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__body">
            <span className="kpi__value">{slotsConfirmados}</span>
            <span className="kpi__label">Turnos activos</span>
            <span className="kpi__sub">{slotsBloqueados} bloqueados</span>
          </div>
        </div>
      </div>

      {/* Barra de ocupación */}
      <div className="progress mb-md">
        <div
          className="progress__bar"
          style={{ width: `${ocupacion}%` }}
        />
      </div>

      {/* Tablas por cancha */}
      {agenda.canchas.map((c) => {
        const deporte = DEPORTES[c.deporte] || { label: c.deporte, icon: "🏟️" };
        return (
          <section className="card court-section" key={c.courtId}>
            <h2>
              {c.cancha}{" "}
              <span className="court-header__tag">{deporte.icon} {deporte.label}</span>
            </h2>
            <div className="tabla-wrap">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Estado</th>
                    <th>Titular</th>
                    <th>Teléfono</th>
                    <th>Seña</th>
                    <th>Saldo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {c.slots.map((s) => (
                    <tr key={s.slotId}>
                      <td>
                        <strong style={{ fontFeatureSettings: "'tnum'" }}>{s.hora}</strong>
                      </td>
                      <td>
                        <span className={`badge badge--${badgeClass(s.estado)}`}>
                          {s.estado}
                        </span>
                      </td>
                      <td>{s.titular || "—"}</td>
                      <td>{s.telefono || "—"}</td>
                      <td>{s.sena > 0 ? `$${formatMoney(s.sena)}` : "—"}</td>
                      <td>{s.saldo > 0 ? `$${formatMoney(s.saldo)}` : "—"}</td>
                      <td>
                        <span className="acciones">
                          {s.estado === "DISPONIBLE" && (
                            <>
                              <button
                                className="btn btn--small btn--outline"
                                onClick={() => { setManualSlot(s.slotId); setTitular(""); setTelefono(""); }}
                                aria-label={`Registrar turno manual de las ${s.hora}`}
                              >
                                📝 Manual
                              </button>
                              <button
                                className="btn btn--small btn--danger"
                                onClick={() => setBlockSlotId(s.slotId)}
                                aria-label={`Bloquear turno de las ${s.hora}`}
                              >
                                🔒 Bloquear
                              </button>
                            </>
                          )}
                          {s.estado === "BLOQUEADO" && (
                            <button
                              className="btn btn--small btn--outline"
                              onClick={() => handleUnblock(s.slotId)}
                              aria-label={`Desbloquear turno de las ${s.hora}`}
                            >
                              🔓 Desbloquear
                            </button>
                          )}
                          {s.estado === "CONFIRMADO" && s.bookingId && s.fuente === "MOSTRADOR" && (
                            <>
                              <button
                                className="btn btn--small btn--outline"
                                onClick={() =>
                                  setEditBooking({ bookingId: s.bookingId, titular: s.titular || "", telefono: s.telefono || "" })
                                }
                                aria-label={`Editar turno manual de las ${s.hora}`}
                              >
                                ✏️ Editar
                              </button>
                              <button
                                className="btn btn--small btn--danger"
                                onClick={() => setCancelTarget({ bookingId: s.bookingId, titular: s.titular })}
                                aria-label={`Cancelar turno de las ${s.hora}`}
                              >
                                ✖ Cancelar
                              </button>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {/* Modal bloqueo */}
      <ConfirmModal
        open={!!blockSlotId}
        onClose={() => setBlockSlotId(null)}
        title="Bloquear turno"
        actions={
          <>
            <button className="btn btn--outline" onClick={() => setBlockSlotId(null)}>Cancelar</button>
            <button className="btn btn--danger" onClick={handleBlock}>🔒 Confirmar bloqueo</button>
          </>
        }
      >
        <div className="form">
          <label>
            Motivo del bloqueo
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Mantenimiento"
            />
          </label>
          <p className="muted" style={{ fontSize: "0.78rem" }}>
            El turno quedará inaccesible para los jugadores. Podés desbloquearlo cuando quieras.
          </p>
        </div>
      </ConfirmModal>

      {/* Modal turno manual (alta) */}
      <ConfirmModal
        open={!!manualSlot}
        onClose={cerrarModales}
        title="Registrar turno manual"
        actions={
          <>
            <button className="btn btn--outline" onClick={cerrarModales}>Cancelar</button>
            <button className="btn btn--primary" onClick={handleManualBooking}>
              ✅ Confirmar turno
            </button>
          </>
        }
      >
        <div className="form">
          <label>
            Nombre del titular
            <input
              value={titular}
              onChange={(e) => setTitular(e.target.value)}
              placeholder="Nombre completo"
            />
          </label>
          <label>
            Teléfono
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 11-2345-6789"
            />
          </label>
          <p className="muted" style={{ fontSize: "0.78rem" }}>
            El turno se registra como CONFIRMADO sin seña online. El cobro se gestiona presencialmente.
          </p>
        </div>
      </ConfirmModal>

      {/* Modal edición de turno manual */}
      <ConfirmModal
        open={!!editBooking}
        onClose={cerrarModales}
        title="Editar turno manual"
        actions={
          <>
            <button className="btn btn--outline" onClick={cerrarModales}>Cancelar</button>
            <button className="btn btn--primary" onClick={handleEditBooking}>
              💾 Guardar cambios
            </button>
          </>
        }
      >
        <div className="form">
          <label>
            Nombre del titular
            <input
              value={editBooking?.titular || ""}
              onChange={(e) => setEditBooking({ ...editBooking, titular: e.target.value })}
              placeholder="Nombre completo"
            />
          </label>
          <label>
            Teléfono
            <input
              value={editBooking?.telefono || ""}
              onChange={(e) => setEditBooking({ ...editBooking, telefono: e.target.value })}
              placeholder="Ej: 11-2345-6789"
            />
          </label>
        </div>
      </ConfirmModal>

      {/* Modal cancelación de reserva */}
      <ConfirmModal
        open={!!cancelTarget}
        onClose={cerrarModales}
        title="¿Cancelar este turno?"
        actions={
          <>
            <button className="btn btn--outline" onClick={cerrarModales}>Volver</button>
            <button className="btn btn--danger" onClick={handleCancelBooking}>
              Sí, cancelar turno
            </button>
          </>
        }
      >
        <div>
          <p style={{ marginBottom: "var(--space-sm)" }}>
            {cancelTarget?.titular
              ? <>Se cancelará el turno de <strong>{cancelTarget.titular}</strong>.</>
              : "Se cancelará el turno seleccionado."}
          </p>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Si es una reserva online con más de 2 hs de margen, la seña se reembolsa;
            si es manual, solo se libera el turno.
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
}

function badgeClass(estado) {
  switch (estado) {
    case "CONFIRMADO": return "confirmado";
    case "DISPONIBLE": return "disponible";
    case "EN_PROCESO_PAGO": return "en-proceso";
    case "BLOQUEADO": return "bloqueado";
    default: return "disponible";
  }
}
