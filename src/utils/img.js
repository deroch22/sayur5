// src/utils/img.js
export const imgSrc = (u = "") => {
  // URL absolut / data / blob => biarkan
  if (/^https?:\/\//i.test(u) || /^data:|^blob:/i.test(u)) return u;

  // base dari <base href> (GitHub Pages pakai /sayur5/) atau Vite BASE_URL
  const base =
    (typeof document !== "undefined" && document.baseURI) ||
    (import.meta.env && import.meta.env.BASE_URL) ||
    "/";

  const root = base.replace(/\/+$/, "");
  const path = (u && u.trim() ? u : "img/default.jpg").replace(/^\/+/, "");
  return `${root}/${path}`;
};
