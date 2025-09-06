// src/utils/upload.js
export async function uploadToR2(file, pin) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  const r = await fetch("/api/upload", {
    method: "POST",
    body: fd,
    headers: { Authorization: `Bearer ${pin}` },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text || `HTTP ${r.status}`);
  return JSON.parse(text);
}
