// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(() => {
  server: { proxy: { '/api': 'https://sayur5-bl6.pages.dev'
  const isCF = process.env.DEPLOY_TARGET === "cf"; // cf=Cloudflare(admin), gh=GitHub(store)
  return {
    plugins: [react()],
    base: isCF ? "/" : "/sayur5/",
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    build: {
      outDir: "dist",
      rollupOptions: {
        input: isCF
          ? { admin: path.resolve(__dirname, "admin/index.html") } // Cloudflare: admin only
          : { main: path.resolve(__dirname, "index.html") },       // GitHub: store only
      },
    },
  };
});
