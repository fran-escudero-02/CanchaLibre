/**
 * CanchaLibre – Mock Data Layer
 * Simula la respuesta de la API RESTful para desarrollo sin backend.
 *
 * TTL Anti-Collision Lock: 15 minutos (HU-08)
 */

const LOCK_TTL_MS = 15 * 60 * 1000; // 900 000 ms

// ─── COMPLEJOS ──────────────────────────────────────────────

export const MOCK_COMPLEXES = [
  {
    id: 1,
    name: "Club Atlético Los Robles",
    address: "Av. San Martín 1250, Tigre",
    phone: "011 4512-3344",
    openTime: "08:00",
    closeTime: "23:00",
    slotDurationMinutes: 60,
  },
  {
    id: 2,
    name: "Canchas del Sur",
    address: "Calle Mendoza 890, Quilmes",
    phone: "011 4200-6677",
    openTime: "09:00",
    closeTime: "22:00",
    slotDurationMinutes: 60,
  },
  {
    id: 3,
    name: "Complejo El Trébol",
    address: "Ruta 8 km 32, Pilar",
    phone: "0230 443-5599",
    openTime: "07:00",
    closeTime: "00:00",
    slotDurationMinutes: 90,
  },
];

// ─── CANCHAS / COURTS ──────────────────────────────────────

const COURTS_BY_COMPLEX = {
  1: [
    { id: 101, nombre: "Cancha 1", deporte: "FUTBOL_5", superficie: "CESPED_SINTETICO", techada: false, precio: 25000, porcentajeSena: 30 },
    { id: 102, nombre: "Cancha 2", deporte: "FUTBOL_5", superficie: "CESPED_SINTETICO", techada: true, precio: 30000, porcentajeSena: 30 },
    { id: 103, nombre: "Cancha 3", deporte: "PADEL", superficie: "CESPED_SINTETICO", techada: true, precio: 18000, porcentajeSena: 50 },
    { id: 104, nombre: "Cancha 4", deporte: "TENIS", superficie: "POLVO_DE_LADRILLO", techada: false, precio: 15000, porcentajeSena: 40 },
  ],
  2: [
    { id: 201, nombre: "Cancha A", deporte: "FUTBOL_7", superficie: "CESPED_SINTETICO", techada: false, precio: 35000, porcentajeSena: 30 },
    { id: 202, nombre: "Cancha B", deporte: "FUTBOL_5", superficie: "CESPED_SINTETICO", techada: true, precio: 28000, porcentajeSena: 30 },
    { id: 203, nombre: "Pádel 1", deporte: "PADEL", superficie: "CESPED_SINTETICO", techada: true, precio: 20000, porcentajeSena: 50 },
  ],
  3: [
    { id: 301, nombre: "Cancha Principal", deporte: "FUTBOL_11", superficie: "CESPED_NATURAL", techada: false, precio: 65000, porcentajeSena: 25 },
    { id: 302, nombre: "Cancha 5-a-side", deporte: "FUTBOL_5", superficie: "CESPED_SINTETICO", techada: true, precio: 22000, porcentajeSena: 30 },
    { id: 303, nombre: "Básquet", deporte: "BASQUET", superficie: "HORMIGON", techada: false, precio: 12000, porcentajeSena: 40 },
  ],
};

// ─── SLOT GENERATION ───────────────────────────────────────

let slotIdCounter = 1000;

/**
 * Genera estados pseudo-aleatorios pero deterministas para la misma fecha+cancha.
 */
function hashSeed(courtId, dateStr, hour) {
  const str = `${courtId}-${dateStr}-${hour}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function generateSlots(court, complex, dateStr) {
  const open = complex.openTime.split(":").map(Number);
  const close = complex.closeTime === "00:00" ? [24, 0] : complex.closeTime.split(":").map(Number);
  const openMinutes = open[0] * 60 + open[1];
  const closeMinutes = close[0] * 60 + close[1];
  const duration = complex.slotDurationMinutes;
  const slots = [];

  const today = new Date().toLocaleDateString("en-CA");
  const isPast = dateStr < today;
  const isToday = dateStr === today;
  const currentHour = new Date().getHours();

  for (let m = openMinutes; m + duration <= closeMinutes; m += duration) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const id = ++slotIdCounter;
    const inicio = `${dateStr}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;

    let estado;
    if (isPast) {
      estado = "CONFIRMADO";
    } else if (isToday && h <= currentHour) {
      estado = "CONFIRMADO";
    } else {
      const seed = hashSeed(court.id, dateStr, h);
      const r = seed % 100;
      if (r < 60) estado = "DISPONIBLE";
      else if (r < 75) estado = "CONFIRMADO";
      else if (r < 88) estado = "EN_PROCESO_PAGO";
      else estado = "BLOQUEADO";
    }

    slots.push({ id, inicio, estado });
  }

  return slots;
}

// ─── MUTABLE STATE (simula acciones del usuario) ───────────

const lockedSlots = new Map();   // slotId → { expiraEn, bookingId }
const manualBookings = new Map(); // slotId → { titular, telefono }
const blockedSlots = new Set();   // slotIds bloqueados por admin

let bookingIdCounter = 5000;

// ─── PUBLIC API FUNCTIONS ──────────────────────────────────

/**
 * GET /complexes
 */
export function mockGetComplexes() {
  return delay(MOCK_COMPLEXES);
}

/**
 * GET /complexes/:id
 */
export function mockGetComplex(id) {
  const c = MOCK_COMPLEXES.find((x) => x.id === Number(id));
  if (!c) throw mockError(404, "Complejo no encontrado");
  return delay(c);
}

/**
 * GET /complexes/:id/grid?date=YYYY-MM-DD
 */
export function mockGetGrid(complexId, dateStr) {
  const complex = MOCK_COMPLEXES.find((x) => x.id === Number(complexId));
  if (!complex) throw mockError(404, "Complejo no encontrado");

  const courts = COURTS_BY_COMPLEX[complex.id] || [];
  const grid = courts.map((court) => {
    const slots = generateSlots(court, complex, dateStr).map((s) => {
      // Aplica overrides de bloqueo/lock
      if (blockedSlots.has(s.id)) {
        return { ...s, estado: "BLOQUEADO" };
      }
      if (manualBookings.has(s.id)) {
        return { ...s, estado: "CONFIRMADO" };
      }
      const lock = lockedSlots.get(s.id);
      if (lock && new Date(lock.expiraEn) > new Date()) {
        return { ...s, estado: "EN_PROCESO_PAGO" };
      }
      return s;
    });
    return { ...court, slots };
  });

  return delay(grid);
}

/**
 * POST /bookings/initiate – Anti-Collision Lock (TTL = 15 min)
 */
export function mockInitiateBooking(slotId) {
  const bookingId = ++bookingIdCounter;
  const expiraEn = new Date(Date.now() + LOCK_TTL_MS).toISOString();

  lockedSlots.set(slotId, { expiraEn, bookingId });

  // Buscar datos del slot
  let slotData = null;
  let courtData = null;
  let complexData = null;
  for (const complex of MOCK_COMPLEXES) {
    const courts = COURTS_BY_COMPLEX[complex.id] || [];
    for (const court of courts) {
      const slots = generateSlots(court, complex, new Date().toLocaleDateString("en-CA"));
      const found = slots.find((s) => s.id === slotId);
      if (found) {
        slotData = found;
        courtData = court;
        complexData = complex;
        break;
      }
    }
    if (slotData) break;
  }

  const sena = courtData ? Math.round(courtData.precio * courtData.porcentajeSena / 100) : 5000;
  const saldoMostrador = courtData ? courtData.precio - sena : 10000;

  return delay({
    bookingId,
    complejo: complexData?.name || "Complejo",
    cancha: courtData?.nombre || "Cancha",
    inicio: slotData?.inicio || new Date().toISOString(),
    sena,
    saldoMostrador,
    expiraEn,
    estado: "PENDIENTE_PAGO",
  });
}

/**
 * GET /bookings/:id
 */
export function mockGetBooking(bookingId) {
  // Buscar en locks
  for (const [, lock] of lockedSlots) {
    if (lock.bookingId === Number(bookingId)) {
      return delay({
        bookingId: lock.bookingId,
        complejo: "Club Atlético Los Robles",
        cancha: "Cancha 1",
        inicio: new Date().toISOString(),
        sena: 7500,
        saldoMostrador: 17500,
        expiraEn: lock.expiraEn,
        estado: new Date(lock.expiraEn) > new Date() ? "PENDIENTE_PAGO" : "EXPIRADA",
      });
    }
  }
  throw mockError(404, "Reserva no encontrada");
}

/**
 * GET /bookings/mis-reservas
 */
export function mockGetMyBookings() {
  const now = new Date();
  const reservas = [
    {
      id: 4001,
      complejo: "Club Atlético Los Robles",
      cancha: "Cancha 1",
      inicio: new Date(now.getTime() + 2 * 86400000).toISOString(),
      sena: 7500,
      saldoMostrador: 17500,
      estado: "CONFIRMADA",
    },
    {
      id: 4002,
      complejo: "Canchas del Sur",
      cancha: "Pádel 1",
      inicio: new Date(now.getTime() + 5 * 86400000).toISOString(),
      sena: 10000,
      saldoMostrador: 10000,
      estado: "CONFIRMADA",
    },
    {
      id: 4003,
      complejo: "Club Atlético Los Robles",
      cancha: "Cancha 2",
      inicio: new Date(now.getTime() - 3 * 86400000).toISOString(),
      sena: 9000,
      saldoMostrador: 21000,
      estado: "COMPLETADA",
    },
    {
      id: 4004,
      complejo: "Complejo El Trébol",
      cancha: "Básquet",
      inicio: new Date(now.getTime() - 7 * 86400000).toISOString(),
      sena: 4800,
      saldoMostrador: 7200,
      estado: "CANCELADA_REEMBOLSADA",
    },
  ];
  return delay(reservas);
}

/**
 * POST /bookings/:id/cancel
 */
export function mockCancelBooking(bookingId) {
  return delay({ resultado: "CANCELADA_REEMBOLSADA" });
}

/**
 * POST /payments/checkout
 */
export function mockCheckout(bookingId) {
  // Simula redirección a Mercado Pago
  return delay({
    initPoint: `/reserva/exito?bookingId=${bookingId}`,
  }, 1200);
}

// ─── ADMIN FUNCTIONS ───────────────────────────────────────

/**
 * GET /admin/agenda?fecha=YYYY-MM-DD
 */
export function mockGetAdminAgenda(fecha) {
  const complex = MOCK_COMPLEXES[0];
  const courts = COURTS_BY_COMPLEX[complex.id] || [];
  let totalSenas = 0;
  let totalSaldos = 0;
  let totalSlots = 0;
  let slotsOcupados = 0;

  const canchas = courts.map((court) => {
    const rawSlots = generateSlots(court, complex, fecha);
    const slots = rawSlots.map((s) => {
      totalSlots++;
      const hora = s.inicio.split("T")[1].substring(0, 5);
      const isConfirmed = s.estado === "CONFIRMADO" || manualBookings.has(s.id);
      const isBlocked = blockedSlots.has(s.id) || s.estado === "BLOQUEADO";

      if (isConfirmed) slotsOcupados++;
      if (isBlocked) slotsOcupados++;

      const sena = isConfirmed ? Math.round(court.precio * court.porcentajeSena / 100) : 0;
      const saldo = isConfirmed ? court.precio - sena : 0;
      if (isConfirmed) {
        totalSenas += sena;
        totalSaldos += saldo;
      }

      const manual = manualBookings.get(s.id);

      return {
        slotId: s.id,
        hora,
        estado: isBlocked ? "BLOQUEADO" : isConfirmed ? "CONFIRMADO" : s.estado,
        titular: isConfirmed ? (manual?.titular || "Juan Pérez") : null,
        telefono: isConfirmed ? (manual?.telefono || "11-2345-6789") : null,
        sena,
        saldo,
      };
    });
    return { cancha: court.nombre, deporte: court.deporte, slots };
  });

  const ocupacion = totalSlots > 0 ? Math.round((slotsOcupados / totalSlots) * 100) : 0;

  return delay({
    totalSenas,
    totalSaldos,
    ocupacion,
    totalSlots,
    slotsOcupados,
    canchas,
  });
}

/**
 * POST /admin/slots/:slotId/bloquear
 */
export function mockBlockSlot(slotId) {
  blockedSlots.add(slotId);
  return delay(null, 300);
}

/**
 * POST /admin/bookings/manual
 */
export function mockManualBooking(slotId, titular, telefono) {
  manualBookings.set(slotId, { titular, telefono });
  return delay({ bookingId: ++bookingIdCounter, estado: "CONFIRMADO" });
}

// ─── AUTH (mock) ───────────────────────────────────────────

export function mockLogin(email, password) {
  if (email === "admin@canchalibre.com") {
    return delay({
      token: "mock-jwt-admin-token",
      role: "ROLE_ADMIN_COMPLEX",
      fullName: "Admin Los Robles",
    }, 500);
  }
  return delay({
    token: "mock-jwt-player-token",
    role: "ROLE_PLAYER",
    fullName: email.split("@")[0],
  }, 500);
}

export function mockRegister(form) {
  return delay({
    token: "mock-jwt-player-token",
    role: "ROLE_PLAYER",
    fullName: form.fullName,
  }, 500);
}

// ─── HELPERS ───────────────────────────────────────────────

function delay(data, ms = 400) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

function mockError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// ─── CONSTANTS ─────────────────────────────────────────────

export const DEPORTES = {
  FUTBOL_5: { label: "Fútbol 5", icon: "⚽" },
  FUTBOL_7: { label: "Fútbol 7", icon: "⚽" },
  FUTBOL_11: { label: "Fútbol 11", icon: "⚽" },
  PADEL: { label: "Pádel", icon: "🏸" },
  TENIS: { label: "Tenis", icon: "🎾" },
  BASQUET: { label: "Básquet", icon: "🏀" },
};

export const ESTADO_SLOT = {
  DISPONIBLE: { label: "Disponible", clase: "slot--disponible" },
  EN_PROCESO_PAGO: { label: "Retenido", clase: "slot--proceso" },
  CONFIRMADO: { label: "Ocupado", clase: "slot--ocupado" },
  BLOQUEADO: { label: "Bloqueado", clase: "slot--bloqueado" },
};

export const ESTADO_BOOKING = {
  PENDIENTE_PAGO: { label: "Pendiente de pago", badge: "badge--pendiente" },
  CONFIRMADA: { label: "Confirmada", badge: "badge--confirmada" },
  COMPLETADA: { label: "Completada", badge: "badge--confirmada" },
  CANCELADA_REEMBOLSADA: { label: "Cancelada (reembolsada)", badge: "badge--cancelada" },
  CANCELADA_RETENIDA: { label: "Cancelada (retenida)", badge: "badge--cancelada" },
  EXPIRADA: { label: "Expirada", badge: "badge--expirada" },
};

export const LOCK_TTL_SECONDS = LOCK_TTL_MS / 1000; // 900
