import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { clearSession, session } from "./api/client";
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

  function logout() {
    clearSession();
    navigate("/");
  }

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="header__logo">🏟️ CanchaLibre</Link>
        <nav className="header__nav">
          {logged ? (
            <>
              <NavLink to="/mis-reservas">Mis reservas</NavLink>
              {role === "ROLE_ADMIN_COMPLEX" && <NavLink to="/admin/agenda">Agenda</NavLink>}
              <button className="btn btn--ghost" onClick={logout}>Salir</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Ingresar</NavLink>
              <NavLink to="/registro">Registrarse</NavLink>
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
  );
}
