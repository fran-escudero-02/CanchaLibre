import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConfirmModal from "../components/ConfirmModal";

describe("ConfirmModal", () => {
  it("renderiza en un portal sobre body con titulo accesible", () => {
    render(
      <ConfirmModal open onClose={() => {}} title="Confirmar turno">
        <p>Contenido</p>
      </ConfirmModal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("cierra con Escape", () => {
    const onClose = vi.fn();
    render(<ConfirmModal open onClose={onClose} title="Test" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cierra al clickear el overlay pero no el contenido", () => {
    const onClose = vi.fn();
    render(<ConfirmModal open onClose={onClose} title="Test" />);

    // El portal monta el overlay directamente en document.body
    const overlay = document.body.querySelector(".modal-overlay");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Test"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("bloquea el scroll del body mientras esta abierto", () => {
    const { unmount } = render(<ConfirmModal open onClose={() => {}} title="Test" />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
