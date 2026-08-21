const API = import.meta.env.VITE_API_URL || "/api/v1";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("cl_token");
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || res.statusText);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export function saveSession({ token, role, fullName }) {
  localStorage.setItem("cl_token", token);
  localStorage.setItem("cl_role", role || "");
  localStorage.setItem("cl_name", fullName || "");
}

export function clearSession() {
  ["cl_token", "cl_role", "cl_name"].forEach((k) => localStorage.removeItem(k));
}

// ─── Autenticación ──────────────────────────────────────────

export const login = (email, password) =>
  api("/auth/login", { method: "POST", body: { email, password }, auth: false });

export const register = (form) =>
  api("/auth/register", { method: "POST", body: form, auth: false });

// ─── Catálogo público ───────────────────────────────────────

export const getComplexes = (page = 0, size = 20) =>
  api(`/complexes?page=${page}&size=${size}`, { auth: false });

export const getComplex = (id) => api(`/complexes/${id}`, { auth: false });

export const getGrid = (complexId, date) =>
  api(`/complexes/${complexId}/grid?date=${date}`, { auth: false });

// ─── Reservas (jugador) ─────────────────────────────────────

export const initiateBooking = (slotId) =>
  api("/bookings/initiate", { method: "POST", body: { slotId } });

export const getMyBookings = (page = 0, size = 20) =>
  api(`/bookings/mis-reservas?page=${page}&size=${size}`);

export const getBooking = (bookingId) => api(`/bookings/${bookingId}`);

export const cancelBooking = (bookingId) =>
  api(`/bookings/${bookingId}/cancel`, { method: "POST" });

// ─── Pagos ──────────────────────────────────────────────────

export const checkout = (bookingId) =>
  api("/payments/checkout", { method: "POST", body: { bookingId } });

// ─── Perfil ─────────────────────────────────────────────────

export const getProfile = () => api("/me");

export const updateProfile = (body) => api("/me", { method: "PUT", body });

// ─── Panel de administración del complejo ───────────────────

export const getAdminAgenda = (fecha) =>
  api(`/admin/agenda?fecha=${fecha}`);

export const blockSlot = (slotId, motivo) =>
  api(`/admin/slots/${slotId}/bloquear`, { method: "POST", body: { motivo } });

export const unblockSlot = (slotId) =>
  api(`/admin/slots/${slotId}/desbloquear`, { method: "POST" });

export const manualBooking = (slotId, titular, telefono) =>
  api("/admin/bookings/manual", { method: "POST", body: { slotId, titular, telefono } });

export const updateManualBooking = (bookingId, titular, telefono) =>
  api(`/admin/bookings/${bookingId}/manual`, { method: "PUT", body: { titular, telefono } });

export const getMyCourts = () => api("/courts");
