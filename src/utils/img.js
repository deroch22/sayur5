// Paling aman: jangan pernah pakai new URL. Selalu fallback ke file default.
export const imgSrc = (url = "") => {
  try {
    if (!url) return "/img/default.jpg";
    if (/^(https?:)?\/\//i.test(url)) return url;   // http/https
    if (/^data:/i.test(url)) return "/img/default.jpg"; // tolak base64
    if (/^blob:/i.test(url)) return "/img/default.jpg"; // tolak blob
    // kalau relatif seperti "img/xyz.jpg" → tetap fallback dulu
    return "/img/default.jpg";
  } catch {
    return "/img/default.jpg";
  }
};
