import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock de la capa de API: HomePage debe consumir la API real, no datos inventados.
vi.mock("../api/client", () => ({
  getComplexes: vi.fn(),
}));

import HomePage from "../pages/HomePage";
import { getComplexes } from "../api/client";

const complejos = {
  content: [
    {
      id: 1,
      name: "Club CanchaLibre",
      address: "Av. Siempreviva 742",
      openTime: "08:00",
      closeTime: "23:00",
      slotDurationMinutes: 60,
    },
  ],
};

describe("HomePage", () => {
  afterEach(() => vi.clearAllMocks());

  it("carga y muestra los complejos desde la API", async () => {
    getComplexes.mockResolvedValue(complejos);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Club CanchaLibre")).toBeInTheDocument();
    });
    expect(screen.getByText(/Av\. Siempreviva 742/)).toBeInTheDocument();
    expect(getComplexes).toHaveBeenCalledTimes(1);
  });

  it("muestra estado vacío cuando no hay complejos", async () => {
    getComplexes.mockResolvedValue({ content: [] });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No hay complejos activos/i)).toBeInTheDocument();
    });
  });

  it("muestra el error de la API al usuario (no lo traga)", async () => {
    getComplexes.mockRejectedValue(new Error("Backend caído"));

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Backend caído");
    });
  });
});
