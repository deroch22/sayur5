// functions/api/upload.js
export async function onRequestPost({ request, env }) {
  // Otorisasi sederhana via PIN di header Authorization: Bearer <PIN>
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401, headers: { "content-type": "application/json" }
    });
  }
  const pin = auth.slice(7).trim();
  // Opsional: kalau kamu punya ENV ADMIN_PIN, validasi di sini
  if (env.ADMIN_PIN && pin !== env.ADMIN_PIN) {
    return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
      status: 403, headers: { "content-type": "application/json" }
    });
  }

  // Terima multipart/form-data
  const ct = request.headers.get("content-type") || "";
  if (!ct.startsWith("multipart/form-data")) {
    return new Response(JSON.stringify({ ok: false, error: "expected multipart/form-data" }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ ok: false, error: "missing file" }), {
      status: 400, headers: { "content-type": "application/json" }
    });
  }

  // Buat key penyimpanan
  const ext = (file.name?.split(".").pop() || "bin").toLowerCase();
  const dir = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `uploads/${dir}/${crypto.randomUUID()}.${ext}`;

  // Simpan ke R2 via binding "R2"
  await env.R2.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  // Kalau kamu set env "R2_PUBLIC_BASE" (opsional), kirimkan juga URL publiknya
  const base = (env.R2_PUBLIC_BASE || "").replace(/\/$/, "");
  const url = base ? `${base}/${key}` : "";

  return new Response(JSON.stringify({ ok: true, key, url }), {
    headers: { "content-type": "application/json" }
  });
}
