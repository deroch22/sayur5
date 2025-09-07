// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(() => {
  const isCF = process.env.DEPLOY_TARGET === "cf"; // cf=Cloudflare(admin), gh=GitHub(store)
  return {
    plugins: [react()],
    base: isCF ? "/" : "/sayur5/",
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },

    // HANYA untuk dev lokal (vite dev). Abaikan saat build/CI.
    server: {
      proxy: {
        "/api": {
          target: "https://sayur5-bl6.pages.dev",
          changeOrigin: true,
          secure: true,
          // rewrite optional kalau perlu:
          // rewrite: (p) => p.replace(/^\/api/, "/api"),
        },
      },
    },

    build: {
      outDir: "dist",
      rollupOptions: {
        input: isCF
          ? { admin: path.resolve(__dirname, "admin/index.html") }
          : { main: path.resolve(__dirname, "index.html") },
      },
    },
  };
});
