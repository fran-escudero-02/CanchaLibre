import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * RequireAuth / RequireRole – guards de rutas (HU-02 en el frontend).
 * Sin sesión → redirect a /login volviendo a la ruta original.
 * Con sesión pero sin rol → pantalla 403.
 */
export function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ next: location.pathname + location.search }} replace />;
  }
  return children;
}

export function RequireRole({ roles, children }) {
  const { isLoggedIn, role } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ next: location.pathname + location.search }} replace />;
  }
  if (!roles.includes(role)) {
    return <Forbidden />;
  }
  return children;
}

function Forbidden() {
  return (
    <div className="page-enter">
      <div className="empty-state">
        <div className="empty-state__icon">🔒</div>
        <p className="empty-state__title">No tenés permisos para acceder acá</p>
        <p className="muted">Esta sección es exclusiva del rol correspondiente.</p>
        <Link className="btn btn--primary mt-md" to="/">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
