// src/utils/safeLS.js
const PREFIX = "sayur5.";

const HAS_LS = (() => {
  try {
    const k = "__ls_test__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
})();

// Fallback in-memory store jika LS tidak tersedia
const mem = new Map();

function _key(k) { return PREFIX + String(k); }

function _getRaw(k) {
  try {
    if (!HAS_LS) return mem.get(_key(k)) ?? null;
    return localStorage.getItem(_key(k));
  } catch {
    return null;
  }
}

function _setRaw(k, v) {
  try {
    if (!HAS_LS) { mem.set(_key(k), String(v)); return true; }
    localStorage.setItem(_key(k), String(v));
    return true;
  } catch (e) {
    console.warn("[localStorage] gagal set:", _key(k), e);
    return false; // biar caller yang memutuskan mau alert/toast
  }
}

export function safeSetItem(key, val) {
  return _setRaw(key, val);
}

export function safeJSONSetItem(key, obj) {
  return _setRaw(key, JSON.stringify(obj));
}

export function safeGetItem(key, fallback = null) {
  const v = _getRaw(key);
  return v == null ? fallback : v;
}

export function safeJSONGetItem(key, fallback) {
  const v = _getRaw(key);
  if (v == null) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

export function safeRemoveItem(key) {
  try {
    if (!HAS_LS) { mem.delete(_key(key)); return; }
    localStorage.removeItem(_key(key));
  } catch {}
}

export function safeClear(prefix = PREFIX) {
  try {
    if (!HAS_LS) {
      for (const k of Array.from(mem.keys())) if (k.startsWith(prefix)) mem.delete(k);
    } else {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) localStorage.removeItem(k);
      }
    }
  } catch {}
}
