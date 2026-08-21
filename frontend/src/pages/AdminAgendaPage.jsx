import { useEffect, useState } from "react";
import {
  mockGetAdminAgenda,
  mockBlockSlot,
  mockManualBooking,
  DEPORTES,
} from "../api/mockData";
import DateNav from "../components/DateNav";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";

const hoy = () => new Date().toLocaleDateString("en-CA");

export default function AdminAgendaPage() {
  const toast = useToast();
  const [fecha, setFecha] = useState(hoy());
  const [agenda, setAgenda] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal de turno manual
  const [manualSlot, setManualSlot] = useState(null);
  const [titular, setTitular] = useState("");
  const [telefono, setTelefono] = useState("");

  // Modal de bloqueo
  const [blockSlot, setBlockSlot] = useState(null);
  const [motivo, setMotivo] = useState("Mantenimiento");

  useEffect(() => {
    setLoading(true);
    mockGetAdminAgenda(fecha)
      .then((data) => {
        setAgenda(data);
        setLoading(false);
      })
      .catch((e) => {
        toast?.error(e.message);
        setLoading(false);
      });
  }, [fecha]);

  async function handleBlock() {
    if (!blockSlot) return;
    await mockBlockSlot(blockSlot);
    toast?.success("Slot bloqueado correctamente");
    setBlockSlot(null);
    // Refresh
    const data = await mockGetAdminAgenda(fecha);
    setAgenda(data);
  }

  async function handleManualBooking() {
    if (!manualSlot || !titular.trim()) {
      toast?.error("Ingresá al menos el nombre del titular");
      return;
    }
    try {
      await mockManualBooking(manualSlot, titular.trim(), telefono.trim());
      toast?.success("Turno manual registrado como CONFIRMADO");
      setManualSlot(null);
      setTitular("");
      setTelefono("");
      // Refresh
      const data = await mockGetAdminAgenda(fecha);
      setAgenda(data);
    } catch (e) {
      toast?.error(e.message);
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

  if (!agenda) {
    return (
      <div className="page-enter">
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <p className="empty-state__title">No se pudo cargar la agenda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <h1>Agenda del día</h1>

      {/* Date nav */}
      <DateNav value={fecha} onChange={setFecha} />

      {/* KPIs */}
      <div className="kpis">
        <div className="kpi kpi--accent">
          <span className="kpi__value">${agenda.totalSenas?.toLocaleString("es-AR")}</span>
          <span className="kpi__label">Señas cobradas</span>
        </div>
        <div className="kpi">
          <span className="kpi__value">${agenda.totalSaldos?.toLocaleString("es-AR")}</span>
          <span className="kpi__label">Saldos pendientes</span>
        </div>
        <div className="kpi">
          <span className="kpi__value">{agenda.ocupacion}%</span>
          <span className="kpi__label">Ocupación</span>
        </div>
        <div className="kpi">
          <span className="kpi__value">{agenda.slotsOcupados}/{agenda.totalSlots}</span>
          <span className="kpi__label">Turnos usados</span>
        </div>
      </div>

      {/* Barra de ocupación */}
      <div className="progress mb-md">
        <div
          className="progress__bar"
          style={{ width: `${agenda.ocupacion}%` }}
        />
      </div>

      {/* Tablas por cancha */}
      {agenda.canchas.map((c) => {
        const deporte = DEPORTES[c.deporte] || { label: c.deporte, icon: "🏟️" };
        return (
          <section className="card court-section" key={c.cancha}>
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
                      <td>{s.sena > 0 ? `$${s.sena.toLocaleString("es-AR")}` : "—"}</td>
                      <td>{s.saldo > 0 ? `$${s.saldo.toLocaleString("es-AR")}` : "—"}</td>
                      <td>
                        {s.estado === "DISPONIBLE" && (
                          <span className="acciones">
                            <button
                              className="btn btn--small btn--outline"
                              onClick={() => setManualSlot(s.slotId)}
                            >
                              📝 Manual
                            </button>
                            <button
                              className="btn btn--small btn--danger"
                              onClick={() => setBlockSlot(s.slotId)}
                            >
                              🔒 Bloquear
                            </button>
                          </span>
                        )}
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
        open={!!blockSlot}
        onClose={() => setBlockSlot(null)}
        title="Bloquear turno"
        actions={
          <>
            <button className="btn btn--outline" onClick={() => setBlockSlot(null)}>Cancelar</button>
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
            El turno quedará inaccesible para los jugadores.
          </p>
        </div>
      </ConfirmModal>

      {/* Modal turno manual */}
      <ConfirmModal
        open={!!manualSlot}
        onClose={() => { setManualSlot(null); setTitular(""); setTelefono(""); }}
        title="Registrar turno manual"
        actions={
          <>
            <button className="btn btn--outline" onClick={() => { setManualSlot(null); setTitular(""); setTelefono(""); }}>
              Cancelar
            </button>
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
              autoFocus
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
