import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

// Initialize theme before first render to prevent flash.
// "Dark Sports Arena" es la identidad del producto: se usa oscuro salvo
// elección explícita del usuario o preferencia clara del sistema.
const storedTheme = localStorage.getItem("cl_theme");
const systemLight = window.matchMedia("(prefers-color-scheme: light)").matches;
const theme =
  storedTheme === "light" || (!storedTheme && systemLight) ? "light" : "dark";
document.documentElement.setAttribute("data-theme", theme);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
