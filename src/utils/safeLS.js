export function readJSON(key, fallback){
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}

export function safeBaseURL(){
  const ls  = (localStorage.getItem("sayur5.cdnBase") || "").trim();
  const env = (import.meta.env.VITE_CDN_BASE || import.meta.env.VITE_R2_PUBLIC_BASE || "").trim();
  let base = ls || env || "https://fddf923dd7920155166714b1a5f3c346.r2.cloudflarestorage.com/sayur5-images/";
  if (!/^https?:\/\//i.test(base)) base = "https://" + base.replace(/^\/+/, "");
  if (!base.endsWith("/")) base += "/";
  return base;
}

export function joinCdn(path){
  const p = String(path || "").replace(/^\/+/, "");
  try { return new URL(p, safeBaseURL()).toString(); }
  catch { return safeBaseURL() + p; }
}
