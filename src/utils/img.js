// PASTIKAN file ini yang dipakai di semua <img src={imgSrc(...)} />

export const imgSrc = (raw = "") => {
  let url = (raw || "").trim();

  // Izinkan URL absolut & data/blob apa adanya
  if (/^(https?:)?\/\//i.test(url) || /^data:/i.test(url) || /^blob:/i.test(url)) {
    return url || "";
  }

  // kosong → pakai default
  if (!url) url = "img/default.jpg";

  // bersihkan leading slash
  const clean = url.replace(/^\//, "");

  // ambil BASE_URL Vite kalau ada, fallback ke "/"
  const base =
    (typeof import !== "undefined" &&
      import.meta &&
      import.meta.env &&
      import.meta.env.BASE_URL) ||
    "/";

  try {
    // coba konstruksi URL normal
    return new URL(clean, base).toString();
  } catch {
    // fallback super-aman: kalau base seperti "https://.../subdir/"
    if (String(base).startsWith("http")) {
      return String(base).replace(/\/+$/, "") + "/" + clean;
    }
    // fallback terakhir: root origin
    return "/" + clean;
  }
};
