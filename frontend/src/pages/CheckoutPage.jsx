import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { checkout, getBooking } from "../api/client";
import CountdownTimer from "../components/CountdownTimer";
import { useToast } from "../components/Toast";
import { formatMoney } from "../utils/format";

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [booking, setBooking] = useState(location.state || null);
  const [error, setError] = useState("");
  const [pagando, setPagando] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (booking) return;
    let alive = true;
    getBooking(bookingId)
      .then((data) => {
        if (alive) setBooking(data);
      })
      .catch(() => {
        if (!alive) return;
        toast.error("No se encontró la reserva");
        navigate("/");
      });
    return () => {
      alive = false;
    };
  }, [bookingId, booking, navigate, toast]);

  function handleExpired() {
    setExpired(true);
    setError("El tiempo de retención expiró. El turno vuelve a estar disponible.");
    toast.error("⏰ Tiempo expirado. El turno fue liberado.");
  }

  async function pagar() {
    setPagando(true);
    setError("");
    try {
      const res = await checkout(Number(bookingId));
      if (res.simulacion) {
        toast.success("Seña confirmada (modo simulación)");
        navigate(`/reserva/exito?bookingId=${bookingId}`);
      } else {
        toast.success("Redirigiendo a Mercado Pago…");
        window.location.href = res.initPoint;
      }
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
      setPagando(false);
    }
  }

  if (!booking) {
    return (
      <div className="page-enter">
        <div className="card" style={{ maxWidth: 500, margin: "0 auto" }}>
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--text" />
          <div className="skeleton skeleton--text" style={{ width: "60%" }} />
          <div className="skeleton skeleton--card" style={{ marginTop: "var(--space-md)" }} />
        </div>
      </div>
    );
  }

  const expirado = expired || booking.estado === "EXPIRADA";

  return (
    <div className="page-enter" style={{ maxWidth: 500, margin: "0 auto" }}>
      <div className="card">
        <h1 style={{ textAlign: "center", marginBottom: "var(--space-md)" }}>
          Confirmá tu reserva
        </h1>

        {/* Info del turno */}
        <div className="resumen" style={{ marginBottom: "var(--space-md)" }}>
          <p><strong>{booking.complejo}</strong></p>
          <p className="muted">{booking.cancha}</p>
          <p style={{ marginTop: "var(--space-sm)" }}>
            📅 {new Date(booking.inicio).toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p>
            🕒 {new Date(booking.inicio).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })} hs
          </p>
        </div>

        {/* Desglose de precios */}
        <div className="resumen" style={{ marginBottom: "var(--space-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-xs)" }}>
            <span>Seña online</span>
            <strong style={{ color: "var(--accent)", fontSize: "1.1rem" }}>
              ${formatMoney(booking.sena)}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Saldo en mostrador</span>
            <span className="muted">${formatMoney(booking.saldoMostrador)}</span>
          </div>
          <div style={{
            borderTop: "1px solid var(--border-color)",
            marginTop: "var(--space-sm)",
            paddingTop: "var(--space-sm)",
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700,
          }}>
            <span>Total</span>
            <span>${formatMoney((booking.sena || 0) + (booking.saldoMostrador || 0))}</span>
          </div>
        </div>

        {/* Timer */}
        <CountdownTimer
          expiresAt={booking.expiraEn}
          onExpired={handleExpired}
        />

        {/* Error */}
        {error && (
          <p className="msg msg--error" style={{ marginBottom: "var(--space-md)" }}>
            ⚠️ {error}
          </p>
        )}

        {/* Botón de pago */}
        <button
          className="btn btn--primary w-full"
          onClick={pagar}
          disabled={pagando || expirado}
          style={{ padding: "14px 24px", fontSize: "1rem" }}
        >
          {pagando ? "⏳ Procesando el pago…" : "💳 Pagar seña con Mercado Pago"}
        </button>

        {expirado && (
          <button
            className="btn btn--outline w-full mt-md"
            onClick={() => navigate(-1)}
          >
            ← Volver a la grilla
          </button>
        )}

        <p className="muted text-center" style={{ marginTop: "var(--space-md)", fontSize: "0.75rem" }}>
          Serás redirigido a la plataforma de Mercado Pago para completar el pago de la seña.
          El saldo restante se abona en el mostrador del complejo.
        </p>
      </div>
    </div>
  );
}
