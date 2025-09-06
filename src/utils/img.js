// src/utils/img.js
export const imgSrc = (raw = "") => {
  let url = String(raw || "").trim();

  // ijinkan URL absolut / data: / blob: apa adanya
  if (/^(https?:)?\/\//i.test(url) || /^data:/i.test(url) || /^blob:/i.test(url)) {
    return url;
  }

  // kosong → pakai default
  if (!url) url = "img/default.jpg";

  // hilangkan leading slash agar bisa di-join
  const clean = url.replace(/^\//, "");

  // base dari Vite (bisa "" atau "/"), lalu jadikan ABSOLUT dgn origin
  let baseEnv = "/";
  try {
    baseEnv = (import.meta?.env?.BASE_URL ?? "/");
  } catch { /* ignore */ }

  const origin =
    (typeof window !== "undefined" && window.location?.origin) || "http://localhost";

  // jadikan absolut: contoh (origin="https://a.pages.dev", baseEnv="/sayur5/")
  let baseAbs = origin + "/";
  try {
    baseAbs = new URL(baseEnv, origin).toString(); // pasti absolut & berujung slash
  } catch { /* ignore */ }

  // konstruksi final; jika masih gagal, fallback concat manual
  try {
    return new URL(clean, baseAbs).toString();
  } catch {
    return baseAbs.replace(/\/+$/, "") + "/" + clean;
  }
};
