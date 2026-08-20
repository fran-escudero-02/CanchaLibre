import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(location.state || null);
  const [segundos, setSegundos] = useState(null);
  const [error, setError] = useState("");
  const [pagando, setPagando] = useState(false);

  useEffect(() => {
    if (!booking) {
      api(`/bookings/${bookingId}`).then(setBooking).catch(() => navigate("/"));
    }
  }, [bookingId]);

  useEffect(() => {
    if (!booking?.expiraEn) return;
    setSegundos(Math.max(0, Math.floor((new Date(booking.expiraEn) - Date.now()) / 1000)));
    const t = setInterval(() => setSegundos((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearInterval(t);
  }, [booking?.expiraEn]);

  useEffect(() => {
    if (segundos !== null && segundos <= 0) {
      setError("El tiempo de retención expiró. El turno vuelve a estar disponible.");
    }
  }, [segundos]);

  async function pagar() {
    setPagando(true);
    setError("");
    try {
      const res = await api("/payments/checkout", {
        method: "POST",
        body: { bookingId: Number(bookingId) }
      });
      window.location.href = res.initPoint;
    } catch (e) {
      setError(e.message);
      setPagando(false);
    }
  }

  if (!booking) return <p className="muted">Cargando…</p>;

  const mm = segundos === null ? "--" : String(Math.floor(Math.max(0, segundos) / 60)).padStart(2, "0");
  const ss = segundos === null ? "--" : String(Math.max(0, segundos) % 60).padStart(2, "0");

  return (
    <div className="card">
      <h1>Confirmá tu reserva</h1>
      <p>{booking.complejo} · {booking.cancha}</p>
      <p>{new Date(booking.inicio).toLocaleString("es-AR")}</p>
      <div className="resumen">
        <p>Seña online: <strong>${booking.sena}</strong></p>
        <p>Saldo en mostrador: <strong>${booking.saldoMostrador}</strong></p>
      </div>
      <p className="timer" role="timer">⏱️ Turno retenido: {mm}:{ss}</p>
      {error && <p className="msg msg--error">{error}</p>}
      <button className="btn btn--primary" onClick={pagar}
        disabled={pagando || (segundos !== null && segundos <= 0)}>
        {pagando ? "Redirigiendo…" : "Pagar seña con Mercado Pago"}
      </button>
    </div>
  );
}
