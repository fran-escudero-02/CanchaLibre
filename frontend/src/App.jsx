import { useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { clearSession, session } from "./api/client";
import { ToastProvider } from "./components/Toast";
import ThemeToggle from "./components/ThemeToggle";
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="currentColor" fillOpacity="0.15"/>
              <path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16.2c-3.97 0-7.2-3.23-7.2-7.2S8.03 4.8 12 4.8s7.2 3.23 7.2 7.2-3.23 7.2-7.2 7.2z" fill="currentColor"/>
              <path d="M12 6.6a5.4 5.4 0 100 10.8 5.4 5.4 0 000-10.8zm0 9a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z" fill="currentColor" fillOpacity="0.5"/>
              <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            </svg>
            CanchaLibre
          </Link>

          <div className="header__right">
            <nav className={`header__nav ${menuOpen ? "header__nav--open" : ""}`}>
              {logged ? (
                <>
                  {name && (
                    <span className="nav-link muted" style={{ fontSize: "0.82rem", cursor: "default" }}>
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
            <ThemeToggle />
            {/* Hamburger toggle */}
            <button
              className="header__toggle"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menú"
              aria-expanded={menuOpen}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
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

        <footer className="footer">
          <p>© {new Date().getFullYear()} CanchaLibre — Reservá tu cancha online</p>
        </footer>
      </div>
    </ToastProvider>
  );
}
