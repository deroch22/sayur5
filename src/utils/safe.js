// src/utils/safe.js
import {
  safeGetItem,
  safeSetItem,
  safeJSONGetItem,
  safeJSONSetItem,
} from "@/utils/safeLS";

// Terima key lama "sayur5.xxx" maupun "xxx"
const normalize = (k) =>
  k && k.startsWith("sayur5.") ? k.slice("sayur5.".length) : k;

// Storage helpers (membungkus safeLS agar kompatibel dengan pemakaian lama)
export function readJSON(key, fallback) {
  return safeJSONGetItem(normalize(key), fallback);
}
export function writeJSON(key, obj) {
  return safeJSONSetItem(normalize(key), obj);
}
export function readStr(key, fallback = null) {
  return safeGetItem(normalize(key), fallback);
}
export function writeStr(key, val) {
  return safeSetItem(normalize(key), val);
}

// ---- CDN base & URL helpers (aman untuk incognito) ----
export function safeBaseURL() {
  // urutan sumber: localStorage -> ENV -> default
  const ls = (readStr("cdnBase", readStr("sayur5.cdnBase", "")) || "").trim();
  const env = (
    import.meta.env.VITE_CDN_BASE ||
    import.meta.env.VITE_R2_PUBLIC_BASE ||
    ""
  ).trim();

  let base =
    ls ||
    env ||
    "https://fddf923dd7920155166714b1a5f3c346.r2.cloudflarestorage.com/sayur5-images/";

  // pastikan absolut + berakhiran '/'
  if (!/^https?:\/\//i.test(base)) base = "https://" + base.replace(/^\/+/, "");
  if (!base.endsWith("/")) base += "/";
  return base;
}

export function joinCdn(path) {
  const p = String(path || "").replace(/^\/+/, "");
  try {
    return new URL(p, safeBaseURL()).toString();
  } catch {
    // fallback kalau constructor URL gagal
    return safeBaseURL() + p;
  }
}
