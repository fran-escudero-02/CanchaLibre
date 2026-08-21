import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, beforeEach } from "vitest";
import { RequireAuth, RequireRole } from "../components/RequireAuth";
import { AuthProvider } from "../context/AuthContext";

function renderAt(path, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>página de login</div>} />
          <Route path="/admin/agenda" element={element} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Route guards (HU-02 frontend)", () => {
  beforeEach(() => localStorage.clear());

  it("sin sesión redirige a /login conservando la ruta de vuelta", () => {
    renderAt(
      "/admin/agenda",
      <RequireRole roles={["ROLE_ADMIN_COMPLEX"]}>
        <div>secreto</div>
      </RequireRole>
    );
    expect(screen.getByText("página de login")).toBeInTheDocument();
    expect(screen.queryByText("secreto")).not.toBeInTheDocument();
  });

  it("RequireAuth con sesión activa renderiza el contenido", () => {
    localStorage.setItem("cl_token", "token");
    localStorage.setItem("cl_role", "ROLE_PLAYER");
    localStorage.setItem("cl_name", "Jugador");

    renderAt(
      "/admin/agenda",
      <RequireAuth>
        <div>contenido protegido</div>
      </RequireAuth>
    );
    expect(screen.getByText("contenido protegido")).toBeInTheDocument();
  });

  it("RequireRole con rol insuficiente muestra 403, no el contenido", () => {
    localStorage.setItem("cl_token", "token");
    localStorage.setItem("cl_role", "ROLE_PLAYER");

    renderAt(
      "/admin/agenda",
      <RequireRole roles={["ROLE_ADMIN_COMPLEX", "ROLE_SUPERADMIN"]}>
        <div>agenda secreta</div>
      </RequireRole>
    );
    expect(screen.queryByText("agenda secreta")).not.toBeInTheDocument();
    expect(screen.getByText(/No tenés permisos/i)).toBeInTheDocument();
  });

  it("RequireRole con rol correcto renderiza el contenido", () => {
    localStorage.setItem("cl_token", "token");
    localStorage.setItem("cl_role", "ROLE_ADMIN_COMPLEX");

    renderAt(
      "/admin/agenda",
      <RequireRole roles={["ROLE_ADMIN_COMPLEX", "ROLE_SUPERADMIN"]}>
        <div>agenda secreta</div>
      </RequireRole>
    );
    expect(screen.getByText("agenda secreta")).toBeInTheDocument();
  });
});
