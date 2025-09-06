// functions/api/upload.js

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",               // simple
    },
  });
}

// Preflight CORS (kalau nanti diakses lintas origin)
export const onRequestOptions = () =>
  new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Max-Age": "86400",
    },
  });

export const onRequestPost = async ({ request, env }) => {
  try {
    // --- Auth pakai PIN ---
    const auth = request.headers.get("authorization") || "";
    const pin = auth.replace(/^Bearer\s+/i, "").trim();
    const targetPin = (env.VITE_ADMIN_PIN || env.ADMIN_PIN || "").trim();
    if (!targetPin || pin !== targetPin) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    // --- Cek multipart ---
    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return json({ ok: false, error: "expected multipart/form-data" }, 400);
    }

    // --- Ambil file dari form ---
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return json({ ok: false, error: "file missing" }, 400);
    }

    // --- Tentukan key ---
    const ext = (file.name?.split(".").pop() || "").toLowerCase();
    const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? "." + ext : "";
    const key = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${safeExt}`;

    // --- Upload ke R2 (pastikan binding env.R2 ada) ---
    await env.R2.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
        contentDisposition: `inline; filename="${file.name || "file"}"`,
      },
      customMetadata: { origin: "admin" },
    });

    // --- Bangun URL publik (kalau R2_PUBLIC_BASE diset) ---
    const base = (env.R2_PUBLIC_BASE || "").replace(/\/+$/, "");
    const url = base ? `${base}/${key}` : undefined;

    return json({ ok: true, key, url });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
};
