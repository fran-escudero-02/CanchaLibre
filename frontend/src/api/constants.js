/**
 * Constantes de dominio compartidas (antes vivían en mockData.js).
 * Los valores de estado matchean los enums del backend.
 */

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

export const LOCK_TTL_SECONDS = 5 * 60; // 300 s — SLOT_LOCK_MINUTES=5 en el backend

/**
 * Imágenes de portada por deporte (Unsplash, sin copyright).
 */
export const SPORT_IMAGES = {
  FUTBOL_5: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=400&q=70",
  FUTBOL_7: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=400&q=70",
  FUTBOL_11: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=70",
  PADEL: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=400&q=70",
  TENIS: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=400&q=70",
  BASQUET: "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=400&q=70",
};
