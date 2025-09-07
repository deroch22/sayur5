// aman di admin (CF Pages) maupun store (GitHub Pages)
export const imgSrc = (url = "") => {
  const base = import.meta.env.BASE_URL || "/";

  // kosong → pakai default
  if (!url) return base.replace(/\/$/, "") + "/img/default.jpg";

  // biarkan URL absolut / data-url / blob-url / proxy API apa adanya
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/api/")) {
    return url;
  }

  // URL relatif → gabung dengan BASE_URL, tetapi jangan bikin app crash
  try {
    return new URL(url.replace(/^\//, ""), base).toString();
  } catch (e) {
    console.warn("[imgSrc] fallback", e, { url, base });
    return url; // terakhir, kembalikan apa adanya agar tidak crash
  }
};
