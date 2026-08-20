import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

export default function SuccessPage() {
  const [params] = useSearchParams();
  const bookingId = params.get("bookingId");
  const [estado, setEstado] = useState("PENDIENTE_PAGO");

  useEffect(() => {
    if (!bookingId) return;
    let intentos = 0;
    const t = setInterval(async () => {
      intentos++;
      try {
        const b = await api(`/bookings/${bookingId}`);
        setEstado(b.estado);
        if (b.estado === "CONFIRMADA" || intentos >= 10) clearInterval(t);
      } catch {
        if (intentos >= 10) clearInterval(t);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [bookingId]);

  return (
    <div className="card center">
      <h1>🎉 ¡Listo!</h1>
      {estado === "CONFIRMADA" ? (
        <>
          <p>Tu reserva quedó <strong>confirmada</strong>.</p>
          <p className="muted">El saldo restante se abona en el mostrador del complejo.</p>
        </>
      ) : (
        <p>Estamos confirmando el pago… Estado actual: {estado}</p>
      )}
      <Link className="btn btn--primary" to="/mis-reservas">Ver mis reservas</Link>
    </div>
  );
}
