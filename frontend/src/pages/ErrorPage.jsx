import { Link } from "react-router-dom";

export default function ErrorPage() {
  return (
    <div className="card center">
      <h1>😞 El pago no se completó</h1>
      <p className="muted">Podés reintentar la reserva desde la grilla del complejo.</p>
      <Link className="btn btn--primary" to="/">Volver al inicio</Link>
    </div>
  );
}
