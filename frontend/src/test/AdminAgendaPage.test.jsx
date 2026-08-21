import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../components/Toast";
import { AuthProvider } from "../context/AuthContext";

vi.mock("../api/client", () => ({
  getAdminAgenda: vi.fn(),
  blockSlot: vi.fn(),
  unblockSlot: vi.fn(),
  manualBooking: vi.fn(),
  updateManualBooking: vi.fn(),
  cancelBooking: vi.fn(),
}));

import AdminAgendaPage from "../pages/AdminAgendaPage";
import { getAdminAgenda } from "../api/client";

const AGENDA_MANANA = () => {
  const manana = new Date(Date.now() + 86400000).toLocaleDateString("en-CA");
  return {
    canchas: [
      {
        courtId: 1,
        cancha: "Cancha 1",
        deporte: "FUTBOL_5",
        slots: [
          { slotId: 101, hora: "09:00", estado: "DISPONIBLE", titular: null, telefono: null, sena: 0, saldo: 0, bookingId: null, fuente: null },
          { slotId: 102, hora: "10:00", estado: "CONFIRMADO", titular: "Juan Perez", telefono: "11-2345-6789", sena: 0, saldo: 20000, bookingId: 55, fuente: "MOSTRADOR" },
        ],
      },
    ],
    totalSenas: 0,
    totalSaldos: 20000,
  };
};

function renderPage() {
  localStorage.setItem("cl_token", "admin-token");
  localStorage.setItem("cl_role", "ROLE_ADMIN_COMPLEX");
  localStorage.setItem("cl_name", "Admin");
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <AdminAgendaPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("AdminAgendaPage – registro de turno manual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminAgenda.mockResolvedValue(AGENDA_MANANA());
  });

  it("al escribir en el modal el input NO pierde el foco (bug reportado)", async () => {
    const user = userEvent.setup();
    renderPage();

    const manualBtn = await screen.findByRole("button", { name: /Registrar turno manual de las 09:00/ });
    await user.click(manualBtn);

    const titularInput = screen.getByLabelText(/Nombre del titular/i);
    await user.click(titularInput);

    // Escribo letra por letra: si algo roba el foco en cada render,
    // userEvent lanza error o el valor queda cortado.
    await user.type(titularInput, "Juan Perez");

    expect(titularInput).toHaveValue("Juan Perez");
    expect(titularInput).toHaveFocus();
  });

  it("al escribir el teléfono tampoco se pierde el foco ni el valor", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Registrar turno manual de las 09:00/ }));

    const telInput = screen.getByLabelText(/Teléfono/i);
    await user.type(telInput, "1133445566");

    expect(telInput).toHaveValue("1133445566");
    expect(telInput).toHaveFocus();
  });

  it("el turno manual confirma contra la API y recarga la agenda", async () => {
    const user = userEvent.setup();
    const { manualBooking } = await import("../api/client");
    manualBooking.mockResolvedValue({ bookingId: 77, estado: "CONFIRMADA" });

    renderPage();
    await user.click(await screen.findByRole("button", { name: /Registrar turno manual de las 09:00/ }));

    await user.type(screen.getByLabelText(/Nombre del titular/i), "Ana Gomez");
    await user.click(screen.getByRole("button", { name: /Confirmar turno/i }));

    await waitFor(() => {
      expect(manualBooking).toHaveBeenCalledWith(101, "Ana Gomez", "");
    });
  });

  it("solo los turnos manuales muestran cancelar; los online no", async () => {
    const agenda = AGENDA_MANANA();
    agenda.canchas[0].slots[1].fuente = "ONLINE"; // reserva online de un jugador
    getAdminAgenda.mockResolvedValue(agenda);

    renderPage();

    await screen.findByText("Juan Perez");
    expect(screen.queryByRole("button", { name: /Cancelar turno de las 10:00/ })).not.toBeInTheDocument();
  });
});
