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

/** Hora HH:mm desde un ISO de inicio de slot (sin depender del timezone del browser). */
export function formatHoraSlot(iso) {
  return iso?.split("T")[1]?.substring(0, 5) || "--:--";
}
