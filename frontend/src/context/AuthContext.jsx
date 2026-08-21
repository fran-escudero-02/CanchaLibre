import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { clearSession, saveSession } from "../api/client";

/**
 * AuthContext – estado de sesión reactivo (antes se leía de localStorage
 * sin reactividad y se forzaba window.location.href para re-renderizar).
 */
const AuthContext = createContext(null);

const readSession = () => ({
  token: localStorage.getItem("cl_token"),
  role: localStorage.getItem("cl_role") || "",
  name: localStorage.getItem("cl_name") || "",
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const login = useCallback((data) => {
    saveSession(data);
    setSession({ token: data.token, role: data.role || "", name: data.fullName || "" });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession({ token: null, role: "", name: "" });
  }, []);

  const value = useMemo(
    () => ({ ...session, isLoggedIn: !!session.token, login, logout }),
    [session, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
