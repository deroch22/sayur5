// functions/api/file.js
// Proxy baca objek dari R2 agar bisa dipakai sebagai URL gambar di frontend.
// Mendukung dua cara:
//   1) /api/file?key=uploads/2025-09-06/uuid.png
//   2) /api/file/uploads/2025-09-06/uuid.png

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("Origin")) });
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.R2 || typeof env.R2.get !== "function") {
      return new Response(JSON.stringify({ ok: false, error: "R2 binding missing" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const url = new URL(request.url);
    // Ambil key dari ?key=... atau dari path setelah /api/file/
    let key = url.searchParams.get("key");
    if (!key) {
      const m = url.pathname.match(/\/api\/file\/(.+)$/);
      if (m) key = decodeURIComponent(m[1]);
    }
    if (!key) return new Response("missing key", { status: 400 });

    const obj = await env.R2.get(key);
    if (!obj) return new Response("not found", { status: 404, headers: corsHeaders(url.origin) });

    const headers = new Headers(corsHeaders(url.origin));
    // Set metadata HTTP dari objek (Content-Type, dll)
    obj.writeHttpMetadata(headers);
    // Cache lama di edge/browser (sesuaikan kebutuhan)
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    // ETag / Last-Modified agar efektif di cache
    if (obj.httpEtag) headers.set("ETag", obj.httpEtag);
    if (obj.uploaded) headers.set("Last-Modified", new Date(obj.uploaded).toUTCString());

    return new Response(obj.body, { headers });
  } catch (e) {
    return new Response("error: " + e.message, {
      status: 500,
      headers: { "content-type": "text/plain" },
    });
  }
}
