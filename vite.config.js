// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(() => {
  const target = process.env.DEPLOY_TARGET || "gh"; // gh | cf
  const isCF = target === "cf";

  return {
    plugins: [react()],
    base: isCF ? "/" : "/sayur5/",
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      emptyOutDir: true,
      // ⚠️ Penting: HANYA Cloudflare yang pakai multiple input (admin)
      ...(isCF
        ? {
            rollupOptions: {
              input: { admin: path.resolve(__dirname, "admin/index.html") },
            },
          }
        : {}),
    },
    server: {
      proxy: {
        "/api": {
          target: "https://sayur5-bl6.pages.dev",
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
