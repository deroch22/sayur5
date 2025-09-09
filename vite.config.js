// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(() => {
  const target = process.env.DEPLOY_TARGET || "gh";
  const isCF = target === "cf";

  return {
    plugins: [react()],
    base: isCF ? "/" : "/sayur5/",
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
      dedupe: ["react", "react-dom"],     // ⬅️ cegah dua kopi React
    },
    optimizeDeps: {
      include: ["react", "react-dom"],    // ⬅️ pastikan dipre-bundle
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      emptyOutDir: true,
      sourcemap: true,                    // ⬅️ biar trace error jelas
      ...(isCF ? { rollupOptions: { input: { admin: path.resolve(__dirname, "admin/index.html") } } } : {}),
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
