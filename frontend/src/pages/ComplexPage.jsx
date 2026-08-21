import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getComplex, getGrid, initiateBooking } from "../api/client";
import { DEPORTES } from "../api/constants";
import { useAuth } from "../context/AuthContext";
import SlotGrid from "../components/SlotGrid";
import DateNav from "../components/DateNav";
import SportFilter from "../components/SportFilter";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useApi } from "../hooks/useApi";
import { calcularSena, calcularSaldo, formatMoney, hoy, formatHoraSlot } from "../utils/format";

export default function ComplexPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isLoggedIn, role } = useAuth();
  const [searchParams] = useSearchParams();

  const [fecha, setFecha] = useState(hoy());
  const [sportFilter, setSportFilter] = useState(searchParams.get("deporte"));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [reservando, setReservando] = useState(false);

  const { data: complejo, error: complexError } = useApi(() => getComplex(id), [id]);
  const {
    data: grillaData,
    loading: loadingGrid,
    error: gridError,
    reload: reloadGrid,
  } = useApi(() => getGrid(id, fecha), [id, fecha]);

  const grilla = grillaData ?? [];

  // Deportes únicos + conteo de canchas por deporte
  const sportsInfo = useMemo(() => {
    const counts = {};
    for (const c of grilla) counts[c.deporte] = (counts[c.deporte] || 0) + 1;
    return { sports: Object.keys(counts), counts };
  }, [grilla]);

  // Grilla filtrada
  const filteredGrid = useMemo(() => {
    if (!sportFilter) return grilla;
    return grilla.filter((c) => c.deporte === sportFilter);
  }, [grilla, sportFilter]);

  function handleSlotClick(slot, court) {
    if (!isLoggedIn) {
      toast.info("Ingresá para reservar tu turno");
      navigate("/login", { state: { next: `/complejo/${id}` } });
      return;
    }
    if (role === "ROLE_ADMIN_COMPLEX") {
      // El dueño registra turnos desde su agenda (reserva manual), no via checkout.
      toast.info("Como dueño del complejo, registrá el turno desde tu Agenda (turno manual)");
      return;
    }
    setSelectedSlot(slot);
    setSelectedCourt(court);
  }

  async function handleReservar() {
    if (!selectedSlot) return;
    setReservando(true);
    try {
      const data = await initiateBooking(selectedSlot.id);
      closeModal();
      toast.success("Turno retenido. Tenés 5 minutos para pagar.");
      navigate(`/checkout/${data.bookingId}`, { state: data });
    } catch (e) {
      // 409 = el slot acaba de ser tomado por otro jugador (HU-08, escenario 2)
      toast.error(e.status === 409 ? "El turno acaba de ser tomado por otro jugador" : e.message);
      closeModal();
      reloadGrid();
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
  const sena = calcularSena(selectedCourt);
  const saldo = calcularSaldo(selectedCourt);
  const error = complexError || gridError;

  return (
    <div className="page-enter">
      {/* Banner del complejo con foto y acciones de contacto */}
      {complejo && (
        <div className="complex-hero">
          <h1>{complejo.name}</h1>
          <div className="complex-hero__meta">
            <span>📍 {complejo.address}</span>
            <span>🕒 {complejo.openTime} a {complejo.closeTime}</span>
            <span>⏱️ Turnos de {complejo.slotDurationMinutes} min</span>
            {complejo.phone && (
              <>
                <a href={`tel:${complejo.phone}`}>📞 Llamar</a>
                <a
                  href={`https://wa.me/54${complejo.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  💬 WhatsApp
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {/* Navegación de fecha */}
      <DateNav value={fecha} onChange={setFecha} minDate={hoy()} />

      {/* Filtros de deporte con conteo */}
      <SportFilter
        sports={sportsInfo.sports}
        counts={sportsInfo.counts}
        active={sportFilter}
        onChange={setSportFilter}
      />

      {/* Error */}
      {error && <p className="msg msg--error" role="alert">⚠️ {error}</p>}

      {/* Grilla de slots */}
      <SlotGrid
        grid={filteredGrid}
        onSlotClick={handleSlotClick}
        loading={loadingGrid}
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
                🕒 {formatHoraSlot(selectedSlot.inicio)} hs
              </p>
            </div>
            <div className="resumen">
              <p>Precio total: <strong>${formatMoney(selectedCourt.precio)}</strong></p>
              <p>
                Seña online ({selectedCourt.porcentajeSena}%):{" "}
                <strong style={{ color: "var(--accent)" }}>${formatMoney(sena)}</strong>
              </p>
              <p className="muted" style={{ fontSize: "0.8rem", marginTop: "var(--space-xs)" }}>
                Saldo de ${formatMoney(saldo)} se abona en el mostrador
              </p>
            </div>
            <p className="muted" style={{ fontSize: "0.78rem", marginTop: "var(--space-md)" }}>
              🔒 Al reservar, el turno se retiene 5 minutos para completar el pago vía Mercado Pago.
            </p>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
