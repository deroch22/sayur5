// Aman di GitHub Pages & Cloudflare Pages (tidak pakai new URL)
export const imgSrc = (url = "") => {
  // URL absolut / data: / blob: biarkan apa adanya
  if (/^(https?:)?\/\//i.test(url) || /^data:/i.test(url) || /^blob:/i.test(url)) return url;

  // fallback default
  if (!url) url = "img/default.jpg";

  // BASE_URL dari Vite bisa "/" atau "/sayur5/"
  const base = (import.meta?.env?.BASE_URL ?? "/");
  const prefix = base.endsWith("/") ? base : base + "/";

  // satukan tanpa double slash
  return prefix + String(url).replace(/^\/+/, "");
};
