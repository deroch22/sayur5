// src/utils/img.js
export const imgSrc = (url = "") => {
  try {
    // ijinkan http(s)
    if (/^https?:\/\//i.test(url)) return url;
    // tolak data: dan blob: (raw base64) → pakai default
    if (/^(data:|blob:)/i.test(url)) return "/img/default.jpg";
    // kosong atau relatif → pakai default absolut (root)
    return "/img/default.jpg";
  } catch {
    return "/img/default.jpg";
  }
};
