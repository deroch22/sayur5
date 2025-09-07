// src/utils/img.js
const PAGES_ORIGIN =
  (import.meta.env.VITE_PAGES_ORIGIN || "https://sayur5-bl6.pages.dev").replace(/\/$/, "");

// Pastikan BASE_URL absolut: gabung dengan origin browser
function absBase() {
  try {
    const base = import.meta.env.BASE_URL || "/";
    let u = new URL(base, window.location.origin).toString();
    if (!u.endsWith("/")) u += "/";
    return u;
  } catch {
    return (window?.location?.origin || "https://deroch22.github.io") + "/";
  }
}

function asAbsolute(relPath) {
  const rel = String(relPath || "").replace(/^\/+/, "");
  return new URL(rel, absBase()).toString();
}

export function imgSrc(raw = "", w = 256) {
  try {
    const val = String(raw ?? "").trim();

    // 1) data/blob/http → pakai apa adanya
    if (/^(data:|blob:|https?:)/i.test(val)) return val;

    // 2) kosong → default lokal
    if (!val) return asAbsolute("img/default.jpg");

    // 3) Jalur API yang sudah absolut (relatif root) → prefix dengan origin Pages
    if (val.startsWith("/api/")) {
      const url = new URL(PAGES_ORIGIN + val);
      // naikkan ke /api/img + tambahkan w jika perlu
      if (url.pathname.startsWith("/api/file")) {
        url.pathname = url.pathname.replace("/api/file", "/api/img");
      }
      if (w) url.searchParams.set("w", String(w));
      return url.toString();
    }

    // 4) Path lokal proyek (img/, products/, uploads/) → hormati BASE_URL
    if (/^(img|products|uploads)\//i.test(val)) {
      return asAbsolute(val);
    }

    // 5) Selain itu anggap sebagai KEY R2 → lewat proxy /api/img
    const u = new URL(PAGES_ORIGIN + "/api/img");
    u.searchParams.set("key", val.replace(/^\/+/, ""));
    if (w) u.searchParams.set("w", String(w));
    return u.toString();
  } catch {
    // Fallback terakhir agar tidak crash
    return asAbsolute("img/default.jpg");
  }
}
