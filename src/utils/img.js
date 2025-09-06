export const imgSrc = (url = "") => {
  // ijinkan URL absolut + data/blob
  if (/^(https?:)?\/\//.test(url) || /^data:/.test(url) || /^blob:/.test(url)) return url;
  // fallback ke /img/default.jpg (menghormati BASE_URL)
  const rel = (url || "img/default.jpg").replace(/^\//, "");
  return new URL(rel, import.meta.env.BASE_URL).toString();
};
