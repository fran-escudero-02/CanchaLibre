import { useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { clearSession, session } from "./api/client";
import { ToastProvider } from "./components/Toast";
import HomePage from "./pages/HomePage";
import ComplexPage from "./pages/ComplexPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CheckoutPage from "./pages/CheckoutPage";
import SuccessPage from "./pages/SuccessPage";
import ErrorPage from "./pages/ErrorPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import AdminAgendaPage from "./pages/AdminAgendaPage";

export default function App() {
  const navigate = useNavigate();
  const logged = !!session.token();
  const role = session.role();
  const name = session.name();
  const [menuOpen, setMenuOpen] = useState(false);

  function logout() {
    clearSession();
    window.location.href = "/";
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <ToastProvider>
      <div className="app">
        <header className="header">
          <Link to="/" className="header__logo" onClick={closeMenu}>
            🏟️ CanchaLibre
          </Link>

          {/* Hamburger toggle */}
          <button
            className="header__toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
            aria-expanded={menuOpen}
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          <nav className={`header__nav ${menuOpen ? "header__nav--open" : ""}`}>
            {logged ? (
              <>
                {name && (
                  <span className="nav-link muted" style={{ fontSize: "0.8rem", cursor: "default" }}>
                    👤 {name}
                  </span>
                )}
                <NavLink to="/mis-reservas" onClick={closeMenu}>
                  📋 Mis reservas
                </NavLink>
                {role === "ROLE_ADMIN_COMPLEX" && (
                  <NavLink to="/admin/agenda" onClick={closeMenu}>
                    📊 Agenda
                  </NavLink>
                )}
                <button className="btn btn--ghost" onClick={logout}>
                  Salir
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" onClick={closeMenu}>
                  Ingresar
                </NavLink>
                <NavLink to="/registro" className="btn btn--primary btn--small" onClick={closeMenu}>
                  Registrarse
                </NavLink>
              </>
            )}
          </nav>
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/complejo/:id" element={<ComplexPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/checkout/:bookingId" element={<CheckoutPage />} />
            <Route path="/reserva/exito" element={<SuccessPage />} />
            <Route path="/reserva/error" element={<ErrorPage />} />
            <Route path="/mis-reservas" element={<MyBookingsPage />} />
            <Route path="/admin/agenda" element={<AdminAgendaPage />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
