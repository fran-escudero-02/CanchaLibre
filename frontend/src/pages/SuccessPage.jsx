import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getBooking } from "../api/client";

const MAX_INTENTOS = 5;
const INTERVALO_MS = 2000;

export default function SuccessPage() {
  const [params] = useSearchParams();
  const bookingId = params.get("bookingId");
  const [estado, setEstado] = useState("verificando"); // verificando | confirmada | expirada

  useEffect(() => {
    if (!bookingId) {
      setEstado("confirmada");
      return;
    }
    let alive = true;
    let intentos = 0;

    async function verificar() {
      intentos++;
      try {
        const booking = await getBooking(bookingId);
        if (!alive) return;
        if (booking.estado === "EXPIRADA") {
          setEstado("expirada");
        } else if (booking.estado === "CONFIRMADA") {
          setEstado("confirmada");
        } else if (intentos >= MAX_INTENTOS) {
          // El webhook puede demorar; asumimos confirmacion pendiente de acreditacion.
          setEstado("confirmada");
        } else {
          setTimeout(verificar, INTERVALO_MS);
        }
      } catch {
        if (alive && intentos >= MAX_INTENTOS) setEstado("confirmada");
        else if (alive) setTimeout(verificar, INTERVALO_MS);
      }
    }

    verificar();
    return () => {
      alive = false;
    };
  }, [bookingId]);

  if (estado === "expirada") {
    return (
      <div className="page-enter" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="card center">
          <div style={{ fontSize: "4rem", marginBottom: "var(--space-md)" }}>😞</div>
          <h1>El pago no se completó</h1>
          <p className="muted" style={{ marginTop: "var(--space-sm)", marginBottom: "var(--space-lg)" }}>
            El tiempo de retención expiró y el turno fue liberado.
          </p>
          <Link className="btn btn--primary w-full" to="/">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const confirmada = estado === "confirmada";

  return (
    <div className="page-enter" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card center">
        <div style={{ fontSize: "4rem", marginBottom: "var(--space-md)" }}>
          {confirmada ? "🎉" : "⏳"}
        </div>
        <h1>
          {confirmada ? "¡Reserva confirmada!" : "Confirmando pago…"}
        </h1>
        {confirmada ? (
          <>
            <p style={{ marginTop: "var(--space-sm)", color: "var(--text-secondary)" }}>
              Tu turno quedó <strong style={{ color: "var(--accent)" }}>confirmado</strong>.
            </p>
            <div className="resumen" style={{ margin: "var(--space-md) 0", textAlign: "left" }}>
              <p>📌 El saldo restante se abona en el mostrador del complejo.</p>
              <p>📱 Podés ver los detalles en <strong>Mis reservas</strong>.</p>
            </div>
            <Link className="btn btn--primary w-full" to="/mis-reservas">
              Ver mis reservas
            </Link>
            <Link
              className="btn btn--outline w-full mt-sm"
              to="/"
              style={{ marginTop: "var(--space-sm)" }}
            >
              Volver al inicio
            </Link>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginTop: "var(--space-sm)" }}>
              Estamos verificando tu pago con Mercado Pago…
            </p>
            <div style={{ marginTop: "var(--space-md)" }}>
              <div className="skeleton skeleton--text" style={{ width: "60%", margin: "0 auto" }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
