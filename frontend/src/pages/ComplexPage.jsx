import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { session } from "../api/client";
import {
  mockGetComplex,
  mockGetGrid,
  mockInitiateBooking,
  DEPORTES,
  ESTADO_SLOT,
} from "../api/mockData";
import SlotGrid from "../components/SlotGrid";
import DateNav from "../components/DateNav";
import SportFilter from "../components/SportFilter";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";

const hoy = () => new Date().toLocaleDateString("en-CA");

export default function ComplexPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [complejo, setComplejo] = useState(null);
  const [fecha, setFecha] = useState(hoy());
  const [grilla, setGrilla] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sportFilter, setSportFilter] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [reservando, setReservando] = useState(false);

  // Cargar info del complejo
  useEffect(() => {
    mockGetComplex(id)
      .then(setComplejo)
      .catch((e) => setError(e.message));
  }, [id]);

  // Cargar grilla
  useEffect(() => {
    setLoading(true);
    setError("");
    mockGetGrid(id, fecha)
      .then((data) => {
        setGrilla(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [id, fecha]);

  // Deportes únicos para filtros
  const uniqueSports = useMemo(() => {
    const set = new Set(grilla.map((c) => c.deporte));
    return [...set];
  }, [grilla]);

  // Grilla filtrada
  const filteredGrid = useMemo(() => {
    if (!sportFilter) return grilla;
    return grilla.filter((c) => c.deporte === sportFilter);
  }, [grilla, sportFilter]);

  function handleSlotClick(slot, court) {
    if (!session.token()) {
      toast?.info("Ingresá para reservar tu turno");
      navigate("/login", { state: { next: `/complejo/${id}` } });
      return;
    }
    setSelectedSlot(slot);
    setSelectedCourt(court);
  }

  async function handleReservar() {
    if (!selectedSlot) return;
    setReservando(true);
    setError("");
    try {
      const data = await mockInitiateBooking(selectedSlot.id);
      setSelectedSlot(null);
      setSelectedCourt(null);
      toast?.success("Turno retenido. Tenés 15 minutos para pagar.");
      navigate(`/checkout/${data.bookingId}`, { state: data });
    } catch (e) {
      setError(e.message);
      toast?.error(e.message);
      setReservando(false);
    }
  }

  function closeModal() {
    setSelectedSlot(null);
    setSelectedCourt(null);
    setReservando(false);
  }

  const deporteInfo = selectedCourt
    ? DEPORTES[selectedCourt.deporte] || { label: selectedCourt.deporte, icon: "🏟️" }
    : null;

  return (
    <div className="page-enter">
      {/* Hero del complejo */}
      {complejo && (
        <div className="complex-hero">
          <h1>{complejo.name}</h1>
          <div className="complex-hero__meta">
            <span>📍 {complejo.address}</span>
            <span>🕒 {complejo.openTime} a {complejo.closeTime}</span>
            <span>⏱️ Turnos de {complejo.slotDurationMinutes} min</span>
            {complejo.phone && <span>📞 {complejo.phone}</span>}
          </div>
        </div>
      )}

      {/* Navegación de fecha */}
      <DateNav value={fecha} onChange={setFecha} minDate={hoy()} />

      {/* Filtros de deporte */}
      <SportFilter
        sports={uniqueSports}
        active={sportFilter}
        onChange={setSportFilter}
      />

      {/* Error */}
      {error && <p className="msg msg--error">⚠️ {error}</p>}

      {/* Grilla de slots */}
      <SlotGrid
        grid={filteredGrid}
        onSlotClick={handleSlotClick}
        loading={loading}
      />

      {/* Modal de confirmación */}
      <ConfirmModal
        open={!!selectedSlot}
        onClose={closeModal}
        title="Confirmar turno"
        actions={
          <>
            <button className="btn btn--outline" onClick={closeModal}>
              Cancelar
            </button>
            <button
              className="btn btn--primary"
              onClick={handleReservar}
              disabled={reservando}
            >
              {reservando ? "Reteniendo…" : "🔒 Reservar turno"}
            </button>
          </>
        }
      >
        {selectedCourt && selectedSlot && (
          <div>
            <div className="resumen" style={{ marginBottom: "var(--space-md)" }}>
              <p><strong>{selectedCourt.nombre}</strong></p>
              <p className="muted">
                {deporteInfo?.icon} {deporteInfo?.label}
                {selectedCourt.techada ? " · Techada" : ""}
              </p>
              <p style={{ marginTop: "var(--space-sm)" }}>
                📅 {new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <p>
                🕒 {selectedSlot.inicio.split("T")[1]?.substring(0, 5)} hs
              </p>
            </div>
            <div className="resumen">
              <p>Precio total: <strong>${selectedCourt.precio?.toLocaleString("es-AR")}</strong></p>
              <p>
                Seña online ({selectedCourt.porcentajeSena}%):{" "}
                <strong style={{ color: "var(--accent)" }}>
                  ${Math.round(selectedCourt.precio * selectedCourt.porcentajeSena / 100).toLocaleString("es-AR")}
                </strong>
              </p>
              <p className="muted" style={{ fontSize: "0.8rem", marginTop: "var(--space-xs)" }}>
                Saldo de ${(selectedCourt.precio - Math.round(selectedCourt.precio * selectedCourt.porcentajeSena / 100)).toLocaleString("es-AR")} se abona en el mostrador
              </p>
            </div>
            <p className="muted" style={{ fontSize: "0.78rem", marginTop: "var(--space-md)" }}>
              🔒 Al reservar, el turno se retiene 15 minutos para completar el pago vía Mercado Pago.
            </p>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
