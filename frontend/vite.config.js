import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "CanchaLibre",
        short_name: "CanchaLibre",
        theme_color: "#16a34a",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/"
      }
    })
  ],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8080" }
  }
});
