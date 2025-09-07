// SAFE untuk 2 lingkungan: Cloudflare Pages ("/") & GitHub Pages ("/sayur5/")
export const imgSrc = (raw = "") => {
  const url = (raw || "").trim();

  // izinkan http(s), data:, blob: apa adanya
  if (/^(https?:)?\/\//.test(url) || /^data:/.test(url) || /^blob:/.test(url)) return url;

  // fallback ke default bila kosong
  const rel = (url || "img/default.jpg").replace(/^\//, "");
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "/");

  // jika BASE_URL absolute (jarang), aman dipakai di new URL
  if (/^https?:\/\//i.test(base)) {
    try { return new URL(rel, base).toString(); } catch {}
  }

  // BASE_URL hanya path → gabung dengan origin saat runtime
  const origin = (typeof window !== "undefined" && window.location)
    ? window.location.origin
    : "";
  return `${origin}${base}${rel}`;
};
