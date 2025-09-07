// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(() => {
  const target = process.env.DEPLOY_TARGET || "gh"; // "cf" utk Cloudflare, "gh" utk GitHub
  const isCF = target === "cf";

  return {
    plugins: [react()],
    base: isCF ? "/" : "/sayur5/", // <<< penting untuk GitHub Pages
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    build: {
      outDir: "dist",
      rollupOptions: {
        input: isCF
          ? { admin: path.resolve(__dirname, "admin/index.html") } // Cloudflare: admin only
          : { main: path.resolve(__dirname, "index.html") },       // GitHub: store only
      },
    },
    // server.proxy hanya kepake saat `vite dev`, aman diabaikan di build
  };
});
