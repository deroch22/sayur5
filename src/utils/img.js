// src/utils/img.js
export const imgSrc = (url = "") => {
  // Biarkan URL absolut/data/blob apa adanya
  if (/^(https?:)?\/\//.test(url) || /^data:/.test(url) || /^blob:/.test(url)) return url;

  // Fallback kalau kosong
  const rel = (url || "img/default.jpg").replace(/^\//, "");

  // Gabung dengan BASE_URL secara aman (tanpa new URL)
  const base = (import.meta.env.BASE_URL || "/");
  const baseNoTrail = base.endsWith("/") ? base.slice(0, -1) : base; // "/sayur5/"
  return `${baseNoTrail}/${rel}`; // -> "/sayur5/img/xxx.jpg" atau "/img/xxx.jpg"
};
