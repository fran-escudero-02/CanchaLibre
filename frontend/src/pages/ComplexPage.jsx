import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, session } from "../api/client";

const DEPORTES = {
  FUTBOL_5: "Fútbol 5", FUTBOL_7: "Fútbol 7", FUTBOL_11: "Fútbol 11",
  PADEL: "Pádel", TENIS: "Tenis", BASQUET: "Básquet"
};
const ESTADO_CLASE = {
  DISPONIBLE: "slot--disponible",
  EN_PROCESO_PAGO: "slot--proceso",
  CONFIRMADO: "slot--ocupado",
  BLOQUEADO: "slot--bloqueado"
};
const ESTADO_LABEL = {
  DISPONIBLE: "Disponible", EN_PROCESO_PAGO: "Retenido",
  CONFIRMADO: "Ocupado", BLOQUEADO: "Bloqueado"
};

const hoy = () => new Date().toLocaleDateString("en-CA");

export default function ComplexPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fecha, setFecha] = useState(hoy());
  const [grilla, setGrilla] = useState([]);
  const [complejo, setComplejo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/complexes/${id}`, { auth: false }).then(setComplejo).catch(console.error);
  }, [id]);

  useEffect(() => {
    api(`/complexes/${id}/grid?date=${fecha}`, { auth: false })
      .then(setGrilla)
      .catch((e) => setError(e.message));
  }, [id, fecha]);

  async function reservar(slotId) {
    if (!session.token()) {
      navigate("/login", { state: { next: `/complejo/${id}` } });
      return;
    }
    setError("");
    try {
      const data = await api("/bookings/initiate", { method: "POST", body: { slotId } });
      navigate(`/checkout/${data.bookingId}`, { state: data });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      {complejo && (
        <>
          <h1>{complejo.name}</h1>
          <p className="muted">{complejo.address} · 🕒 {complejo.openTime} a {complejo.closeTime}</p>
        </>
      )}
      <label className="fecha">Fecha:{" "}
        <input type="date" value={fecha} min={hoy()} onChange={(e) => setFecha(e.target.value)} />
      </label>
      {error && <p className="msg msg--error">{error}</p>}
      {grilla.map((cancha) => (
        <section className="card" key={cancha.id}>
          <h2>{cancha.nombre}</h2>
          <p className="muted">
            {DEPORTES[cancha.deporte] || cancha.deporte} · ${cancha.precio} · Seña {cancha.porcentajeSena}%
            {cancha.techada ? " · Techada" : ""}
          </p>
          <div className="slots">
            {cancha.slots.map((s) => (
              <button key={s.id} className={`slot ${ESTADO_CLASE[s.estado]}`}
                disabled={s.estado !== "DISPONIBLE"} onClick={() => reservar(s.id)}>
                <strong>{new Date(s.inicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</strong>
                <small>{ESTADO_LABEL[s.estado]}</small>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
