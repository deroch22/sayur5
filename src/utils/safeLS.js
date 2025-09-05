// src/utils/safeLS.js
export function safeSetItem(key, val) {
  try {
    localStorage.setItem(key, val);
    return true;
  } catch (e) {
    console.warn("[localStorage] gagal set:", key, e);
    alert("Penyimpanan lokal penuh / diblokir. Kurangi ukuran/jumlah foto produk.");
    return false;
  }
}

export function safeJSONSetItem(key, obj) {
  return safeSetItem(key, JSON.stringify(obj));
}
