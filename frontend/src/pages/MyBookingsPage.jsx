import { useEffect, useState } from "react";
import { api } from "../api/client";

const LABEL = {
  PENDIENTE_PAGO: "Pendiente de pago", CONFIRMADA: "Confirmada",
  CANCELADA_REEMBOLSADA: "Cancelada (seña reembolsada)",
  CANCELADA_RETENIDA: "Cancelada (seña retenida)",
  EXPIRADA: "Expirada", COMPLETADA: "Completada"
};

export default function MyBookingsPage() {
  const [reservas, setReservas] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/bookings/mis-reservas").then(setReservas).catch(console.error);
  }, []);

  async function cancelar(id) {
    const ok = confirm(
      "Si faltan más de 2 horas para el turno, la seña se reembolsa automáticamente. " +
      "Si faltan 2 horas o menos, la seña queda para el complejo. ¿Continuar?"
    );
    if (!ok) return;
    setMsg("");
    try {
      const res = await api(`/bookings/${id}/cancel`, { method: "POST" });
      setMsg(res.resultado === "CANCELADA_REEMBOLSADA"
        ? "Reserva cancelada. La seña será reembolsada por Mercado Pago."
        : "Reserva cancelada. La seña quedó retenida por el complejo (margen ≤ 2 hs).");
      api("/bookings/mis-reservas").then(setReservas);
    } catch (e) {
      setMsg("Error: " + e.message);
    }
  }

  return (
    <div>
      <h1>Mis reservas</h1>
      {msg && <p className="msg msg--ok">{msg}</p>}
      {reservas.map((r) => (
        <div className="card" key={r.id}>
          <h2>{r.complejo} · {r.cancha}</h2>
          <p>{new Date(r.inicio).toLocaleString("es-AR")}</p>
          <p>Seña: ${r.sena} · Saldo en mostrador: ${r.saldoMostrador}</p>
          <p className={"estado estado--" + r.estado}>{LABEL[r.estado] || r.estado}</p>
          {r.estado === "CONFIRMADA" && (
            <button className="btn btn--danger" onClick={() => cancelar(r.id)}>Cancelar reserva</button>
          )}
        </div>
      ))}
      {reservas.length === 0 && <p className="muted">Todavía no tenés reservas.</p>}
    </div>
  );
}
