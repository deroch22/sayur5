// src/utils/img.js
// Domain Cloudflare Pages kamu untuk mem-proxy file R2:
const PAGES_ORIGIN =
  import.meta.env.VITE_PAGES_ORIGIN || "https://sayur5-bl6.pages.dev";

/**
 * Kembalikan URL gambar yang valid untuk kedua deploy:
 * - GitHub Pages (public store, base '/sayur5/')
 * - Cloudflare Pages (admin)
 */
export const imgSrc = (url = "") => {
  const u = (url || "").trim();

  // 1) Sudah absolut / data / blob → langsung pakai
  if (/^(https?:)?\/\//i.test(u) || /^data:/.test(u) || /^blob:/.test(u)) return u;

  // 2) Path ke proxy gambar di Cloudflare Pages → buat absolut ke PAGES_ORIGIN
  if (/^\/?api\/file\b/i.test(u)) {
    const path = u.startsWith("/") ? u : `/${u}`;
    return `${PAGES_ORIGIN}${path}`;
  }

  // 3) Relatif (mis. "img/default.jpg") → hormati BASE_URL (GitHub Pages pakai '/sayur5/')
  const rel = (u || "img/default.jpg").replace(/^\//, "");
  return new URL(rel, import.meta.env.BASE_URL).toString();
};
