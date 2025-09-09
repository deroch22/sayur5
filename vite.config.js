// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(() => {
  // gh = GitHub Pages (default), cf = Cloudflare Pages (opsional)
  const target = process.env.DEPLOY_TARGET || "gh";
  const isCF = target === "cf";

  return {
    plugins: [react()],
    // GH Pages butuh base subpath repo
    base: isCF ? "/" : "/sayur5/",

    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
      // cegah dua kopi React (penyebab invalid hook call)
      dedupe: ["react", "react-dom"],
    },
    // pastikan React di-prebundle oleh Vite
    optimizeDeps: { include: ["react", "react-dom"] },

    server: {
      proxy: {
        // opsional: forward /api ke backend kamu saat dev lokal
        "/api": {
          target: "https://sayur5-bl6.pages.dev",
          changeOrigin: true,
          secure: true,
        },
      },
    },

    build: {
      outDir: "dist",
      assetsDir: "assets",
      emptyOutDir: true,
      // aktifkan sourcemap kalau mau debug di production (boleh dimatikan)
      // sourcemap: true,

      // HANYA Cloudflare yang pakai multiple input (admin)
      ...(isCF
        ? {
            rollupOptions: {
              input: { admin: path.resolve(__dirname, "admin/index.html") },
            },
          }
        : {}),
    },
  };
});
