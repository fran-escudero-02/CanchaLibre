import { useState, useEffect, useCallback, useRef } from "react";
import { LOCK_TTL_SECONDS } from "../api/constants";

/**
 * CountdownTimer – Timer circular animado para el Anti-Collision Lock.
 * TTL sincronizado con el backend (SLOT_LOCK_MINUTES = 5 min).
 *
 * @param {string} expiresAt - ISO timestamp de expiración
 * @param {function} onExpired - Callback cuando el timer llega a 0
 */
export default function CountdownTimer({ expiresAt, onExpired }) {
  const [remaining, setRemaining] = useState(() => calcRemaining(expiresAt));
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    if (!expiresAt) return;
    setRemaining(calcRemaining(expiresAt));
    const interval = setInterval(() => {
      const r = calcRemaining(expiresAt);
      setRemaining(r);
      if (r <= 0) {
        clearInterval(interval);
        onExpiredRef.current?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const totalSeconds = LOCK_TTL_SECONDS;
  const pct = Math.max(0, remaining / totalSeconds);
  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - pct);

  const mm = String(Math.floor(Math.max(0, remaining) / 60)).padStart(2, "0");
  const ss = String(Math.max(0, remaining) % 60).padStart(2, "0");

  const ringClass = remaining <= 60
    ? "fg-ring fg-ring--danger"
    : remaining <= 180
      ? "fg-ring fg-ring--warn"
      : "fg-ring";

  return (
    <div className="countdown">
      <div className="countdown__ring">
        <svg viewBox="0 0 120 120">
          <circle className="bg-ring" cx="60" cy="60" r="52" />
          <circle
            className={ringClass}
            cx="60" cy="60" r="52"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="countdown__time">{mm}:{ss}</span>
      </div>
      <span className="countdown__label">
        {remaining <= 0
          ? "⏰ Tiempo expirado"
          : remaining <= 60
            ? "⚠️ ¡Último minuto!"
            : "⏱️ Turno retenido"}
      </span>
    </div>
  );
}

function calcRemaining(expiresAt) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
}
