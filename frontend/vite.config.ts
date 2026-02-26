import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * FIX: убран viteSingleFile — не нужен для нормального деплоя
 * FIX: добавлен server.proxy — без него запросы к /api/ в dev-режиме не доходят до backend
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Все запросы /api/* → http://localhost:8000
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      // Загруженные файлы
      "/uploads": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
