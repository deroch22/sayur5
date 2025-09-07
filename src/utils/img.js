const PAGES_ORIGIN =
  import.meta.env.VITE_PAGES_ORIGIN || "https://sayur5-bl6.pages.dev";

export const imgSrc = (raw = "", w = 256) => {
  // data/blob/http → pakai apa adanya
  if (/^(data:|blob:|https?:)/i.test(raw)) return raw;

  // kosong → default.jpg (respect BASE_URL untuk GitHub Pages)
  if (!raw.trim()) {
    return new URL("img/default.jpg", import.meta.env.BASE_URL).toString();
  }

  // kalau field berisi path key R2 (uploads/....png)
  if (!raw.startsWith("/")) {
    const base = PAGES_ORIGIN.replace(/\/$/, "");
    const url  = new URL(`${base}/api/img`);
    url.searchParams.set("key", raw.replace(/^\/+/, ""));
    if (w) url.searchParams.set("w", String(w));
    return url.toString();
  }

  // kalau sudah /api/file?key=... → ubah ke /api/img?key=...&w=...
  if (raw.startsWith("/api/file")) {
    const base = PAGES_ORIGIN.replace(/\/$/, "");
    const url = new URL(`${base}${raw}`);
    url.pathname = url.pathname.replace("/api/file", "/api/img");
    if (w) url.searchParams.set("w", String(w));
    return url.toString();
  }

  // path relatif lokal (mis. img/foo.jpg)
  return new URL(raw.replace(/^\//, ""), import.meta.env.BASE_URL).toString();
};
