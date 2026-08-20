import { useEffect, useState } from "react";
import { api } from "../api/client";

const hoy = () => new Date().toLocaleDateString("en-CA");

export default function AdminAgendaPage() {
  const [fecha, setFecha] = useState(hoy());
  const [agenda, setAgenda] = useState(null);
  const [manual, setManual] = useState(null);
  const [titular, setTitular] = useState("");
  const [telefono, setTelefono] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api(`/admin/agenda?fecha=${fecha}`).then(setAgenda).catch(console.error);
  }, [fecha, msg]);

  async function bloquear(slotId) {
    const motivo = prompt("Motivo del bloqueo (ej: mantenimiento):", "Mantenimiento");
    if (!motivo) return;
    await api(`/admin/slots/${slotId}/bloquear`, { method: "POST", body: { motivo } });
    setMsg("Slot bloqueado. " + new Date().toLocaleTimeString());
  }

  async function confirmarManual() {
    try {
      await api("/admin/bookings/manual", {
        method: "POST",
        body: { slotId: manual, titular, telefono }
      });
      setManual(null); setTitular(""); setTelefono("");
      setMsg("Turno registrado como CONFIRMADO (sin seña online). " + new Date().toLocaleTimeString());
    } catch (e) {
      setMsg("Error: " + e.message);
    }
  }

  if (!agenda) return <p className="muted">Cargando agenda…</p>;

  return (
    <div>
      <h1>Agenda del día</h1>
      <label className="fecha">Fecha:{" "}
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </label>
      {msg && <p className="msg msg--ok">{msg}</p>}
      <div className="resumen resumen--admin">
        <p>Señas online cobradas: <strong>${agenda.totalSenas}</strong></p>
        <p>Saldos a cobrar en mostrador: <strong>${agenda.totalSaldos}</strong></p>
      </div>
      {agenda.canchas.map((c) => (
        <section className="card" key={c.cancha}>
          <h2>{c.cancha}</h2>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr><th>Hora</th><th>Estado</th><th>Titular</th><th>Teléfono</th><th>Seña</th><th>Saldo</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {c.slots.map((s) => (
                  <tr key={s.slotId}>
                    <td>{s.hora}</td>
                    <td className={"estado estado--" + s.estado}>{s.estado}</td>
                    <td>{s.titular || "—"}</td>
                    <td>{s.telefono || "—"}</td>
                    <td>{s.titular ? "$" + s.sena : "—"}</td>
                    <td>{s.titular ? "$" + s.saldo : "—"}</td>
                    <td>
                      {s.estado === "DISPONIBLE" && (
                        <span className="acciones">
                          <button className="btn btn--small" onClick={() => setManual(s.slotId)}>Turno manual</button>
                          <button className="btn btn--small btn--danger" onClick={() => bloquear(s.slotId)}>Bloquear</button>
                        </span>
                      )}
                      {manual === s.slotId && (
                        <span className="manual">
                          <input placeholder="Titular" value={titular} onChange={(e) => setTitular(e.target.value)} />
                          <input placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                          <button className="btn btn--small btn--primary" onClick={confirmarManual}>Confirmar</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
