/**
 * Helpers de formato compartidos (antes duplicados en varias páginas).
 */

/** Fecha de hoy en formato YYYY-MM-DD (local). */
export function hoy() {
  return new Date().toLocaleDateString("en-CA");
}

/** Seña calculada de una cancha: precio × porcentajeSena / 100, redondeada. */
export function calcularSena(cancha) {
  if (!cancha) return 0;
  return Math.round((cancha.precio * cancha.porcentajeSena) / 100);
}

/** Saldo a abonar en mostrador: precio − seña. */
export function calcularSaldo(cancha) {
  if (!cancha) return 0;
  return cancha.precio - calcularSena(cancha);
}

/** Monto en formato monetario es-AR. */
export function formatMoney(valor) {
  return Number(valor ?? 0).toLocaleString("es-AR");
}

/** Hora HH:mm de un slot en la zona horaria del complejo (los ISO llegan en UTC). */
export function formatHoraSlot(iso) {
  if (!iso) return "--:--";
  try {
    return new Date(iso).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Argentina/Buenos_Aires",
    });
  } catch {
    return "--:--";
  }
}
