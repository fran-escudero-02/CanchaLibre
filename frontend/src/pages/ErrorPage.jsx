import { Link } from "react-router-dom";

export default function ErrorPage() {
  return (
    <div className="page-enter" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card center">
        <div style={{ fontSize: "4rem", marginBottom: "var(--space-md)" }}>😞</div>
        <h1>El pago no se completó</h1>
        <p className="muted" style={{ marginTop: "var(--space-sm)", marginBottom: "var(--space-lg)" }}>
          No te preocupes, el turno fue liberado y podés volver a intentarlo.
        </p>
        <Link className="btn btn--primary w-full" to="/">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
