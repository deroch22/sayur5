// functions/api/upload.js
const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type",
      ...extra,
    },
  });

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "POST,OPTIONS",
    },
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const auth = request.headers.get("authorization") || "";
    const pin = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!env.ADMIN_PIN || pin !== env.ADMIN_PIN) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    const ct = request.headers.get("content-type") || "";
    if (!/multipart\/form-data/i.test(ct)) {
      return json({ ok: false, error: "content-type must be multipart/form-data" }, 400);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file.stream !== "function") {
      return json({ ok: false, error: "no file" }, 400);
    }

    const ext = (file.name || "bin").split(".").pop().toLowerCase();
    const key =
      `uploads/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext || "bin"}`;

    // R2 put
    await env.R2_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    const base = (env.R2_PUBLIC_BASE || "").replace(/\/$/, "");
    const url = base ? `${base}/${key}` : undefined;

    return json({ ok: true, key, url });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}
