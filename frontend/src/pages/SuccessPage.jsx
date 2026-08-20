import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

export default function SuccessPage() {
  const [params] = useSearchParams();
  const bookingId = params.get("bookingId");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Simula polling de confirmación
    const t = setTimeout(() => setConfirmed(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="page-enter" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card center">
        <div style={{ fontSize: "4rem", marginBottom: "var(--space-md)" }}>
          {confirmed ? "🎉" : "⏳"}
        </div>
        <h1>
          {confirmed ? "¡Reserva confirmada!" : "Confirmando pago…"}
        </h1>
        {confirmed ? (
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
