import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * ConfirmModal – Modal de confirmación con glassmorphism.
 * Se presenta como bottom-sheet en mobile, centrado en desktop.
 *
 * Se renderiza vía portal a document.body: así el overlay fixed no depende
 * de ancestros con transform (p. ej. la animación de .page-enter), que
 * rompían el centrado y el scroll del modal.
 *
 * Los efectos dependen solo de `open` y onClose va por ref: si dependieran
 * de onClose (identidad nueva en cada render del padre), el efecto se
 * re-ejecutaba con cada tecla y el focus() inicial robaba el foco del input.
 */
export default function ConfirmModal({ open, onClose, title, children, actions }) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") onCloseRef.current?.();
      if (e.key === "Tab") trapFocus(e);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Foco inicial dentro del diálogo (una sola vez por apertura)
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused instanceof HTMLElement && previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  function trapFocus(e) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onCloseRef.current?.();
  }

  return createPortal(
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        ref={dialogRef}
      >
        <button className="modal__close" onClick={onClose} aria-label="Cerrar">✕</button>
        {title && (
          <h2 id={titleId} style={{ marginBottom: "var(--space-md)" }}>{title}</h2>
        )}
        <div>{children}</div>
        {actions && <div className="modal__actions">{actions}</div>}
      </div>
    </div>,
    document.body
  );
}
