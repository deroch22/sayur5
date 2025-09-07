const PAGES_ORIGIN =
  import.meta.env.VITE_PAGES_ORIGIN || "https://sayur5-bl6.pages.dev";

// Pastikan BASE_URL jadi absolut (gabung dengan origin browser)
function absBase() {
  try {
    const base = import.meta.env.BASE_URL || "/";
    // contoh hasil: "https://deroch22.github.io/sayur5/"
    let u = new URL(base, window.location.origin).toString();
    if (!u.endsWith("/")) u += "/";
    return u;
  } catch {
    return window.location.origin + "/";
  }
}

export const imgSrc = (raw = "", w = 256) => {
  try {
    // 1) data/blob/http → pakai apa adanya
    if (/^(data:|blob:|https?:)/i.test(raw)) return raw;

    // 2) kosong → default.jpg (respect BASE_URL absolut)
    if (!String(raw).trim()) {
      return new URL("img/default.jpg", absBase()).toString();
    }

    // 3) kalau field berisi key R2 (uploads/....png) → proxy ke /api/img
    if (!raw.startsWith("/")) {
      const base = PAGES_ORIGIN.replace(/\/$/, "");
      const url  = new URL(`${base}/api/img`);
      url.searchParams.set("key", raw.replace(/^\/+/, ""));
      if (w) url.searchParams.set("w", String(w));
      return url.toString();
    }

    // 4) sudah /api/file?key=... → ubah ke /api/img?key=...&w=...
    if (raw.startsWith("/api/file")) {
      const base = PAGES_ORIGIN.replace(/\/$/, "");
      const url = new URL(`${base}${raw}`);
      url.pathname = url.pathname.replace("/api/file", "/api/img");
      if (w) url.searchParams.set("w", String(w));
      return url.toString();
    }

    // 5) path relatif lokal (mis. "/img/foo.jpg" atau "img/foo.jpg")
    const rel = raw.replace(/^\/+/, "");
    return new URL(rel, absBase()).toString();
  } catch {
    // Fallback terakhir kalau apapun error
    return new URL("img/default.jpg", absBase()).toString();
  }
};
