// src/utils/img.js
export const imgSrc = (url = "") => {
  // biarkan URL publik, data URL, dan blob URL lewat apa adanya
  if (/^(https?:)?\/\//.test(url) || /^data:/.test(url) || /^blob:/.test(url)) return url;

  // kalau kosong, fallback ke gambar default di public/img/default.jpg
  if (!url) return new URL('img/default.jpg', import.meta.env.BASE_URL).toString();

  // URL relatif → hormati BASE_URL (mis. /sayur5/ di GitHub Pages)
  return new URL(url.replace(/^\//, ''), import.meta.env.BASE_URL).toString();
};
