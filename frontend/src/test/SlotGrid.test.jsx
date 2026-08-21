import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SlotGrid from "../components/SlotGrid";

const CANCHA = {
  id: 1,
  nombre: "Cancha 1",
  deporte: "FUTBOL_5",
  superficie: "CESPED_SINTETICO",
  techada: false,
  precio: 20000,
  porcentajeSena: 30,
  slots: [
    { id: 10, inicio: "2026-08-21T19:00:00Z", estado: "DISPONIBLE" },
    { id: 11, inicio: "2026-08-21T20:00:00Z", estado: "EN_PROCESO_PAGO" },
    { id: 12, inicio: "2026-08-21T21:00:00Z", estado: "CONFIRMADO" },
    { id: 13, inicio: "2026-08-21T22:00:00Z", estado: "BLOQUEADO" },
  ],
};

describe("SlotGrid (HU-07: grilla de disponibilidad)", () => {
  it("muestra los slots clasificados por estado", () => {
    render(<SlotGrid grid={[CANCHA]} onSlotClick={() => {}} loading={false} />);

    expect(screen.getByText("Cancha 1")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Turno/ })).toHaveLength(4);
  });

  it("solo los slots DISPONIBLES son clickeables (HU-08 visual)", () => {
    const onSlotClick = vi.fn();
    render(<SlotGrid grid={[CANCHA]} onSlotClick={onSlotClick} loading={false} />);

    const disponible = screen.getByRole("button", { name: /Turno.*Disponible/ });
    const retenido = screen.getByRole("button", { name: /Turno.*Retenido/ });

    expect(disponible).toBeEnabled();
    expect(retenido).toBeDisabled();

    fireEvent.click(disponible);
    expect(onSlotClick).toHaveBeenCalledTimes(1);
  });

  it("muestra estado vacío cuando no hay canchas", () => {
    render(<SlotGrid grid={[]} onSlotClick={() => {}} loading={false} />);
    expect(screen.getByText(/No hay canchas disponibles/i)).toBeInTheDocument();
  });

  it("muestra skeletons mientras carga", () => {
    const { container } = render(<SlotGrid grid={[]} onSlotClick={() => {}} loading={true} />);
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
  });
});
