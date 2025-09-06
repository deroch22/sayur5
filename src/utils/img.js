// src/utils/img.js
export const imgSrc = (url = "") => {
  try {
    if (!url) return "/img/default.jpg";                 // fallback
    if (/^(https?:)?\/\//i.test(url)) return url;        // http/https
    if (/^data:/i.test(url)) return "/img/default.jpg";  // tolak base64
    if (/^blob:/i.test(url)) return "/img/default.jpg";  // tolak blob
    // relatif: untuk aman, tetap pakai default
    return "/img/default.jpg";
  } catch {
    return "/img/default.jpg";
  }
};
