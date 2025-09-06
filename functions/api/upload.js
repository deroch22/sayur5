// functions/api/upload.js

const cors = (req, env) => {
  const origin = req.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
};

export const onRequestOptions = ({ request, env }) =>
  new Response(null, { status: 204, headers: cors(request, env) });

export const onRequestPost = async ({ request, env }) => {
  const headers = cors(request, env);
  try {
    // Auth PIN
    const auth = request.headers.get("authorization") || "";
    const pin = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const ADMIN_PIN = env.ADMIN_PIN || env.VITE_ADMIN_PIN || "";
    if (!pin || pin !== ADMIN_PIN) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401, headers
      });
    }

    if (!env.BUCKET) throw new Error("Missing R2 binding 'BUCKET'");

    // Ambil file dari form-data
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Missing form field 'file'");

    // Simpan ke R2
    const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase();
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    await env.BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    const base = (env.R2_PUBLIC_BASE || "").replace(/\/$/, "");
    const url = base ? `${base}/${key}` : "";

    return new Response(JSON.stringify({ ok: true, key, url }), { status: 200, headers });
  } catch (err) {
    // Penting untuk debugging: ini yang bikin 1101 tidak lagi jadi HTML
    console.error("upload error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500, headers
    });
  }
};
