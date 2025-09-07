// functions/api/file.js
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  // key bisa dari ?key=... atau dari path /api/file/<key>
  let key = url.searchParams.get("key");
  if (!key) {
    const prefix = "/api/file/";
    if (url.pathname.startsWith(prefix)) {
      key = decodeURIComponent(url.pathname.slice(prefix.length));
    }
  }
  if (!key) {
    return new Response(JSON.stringify({ ok: false, error: "missing key" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // dukung Range agar bisa di-stream sebagai image/video
  const range = request.headers.get("range");
  const obj = await env.R2.get(key, range ? { range } : undefined); // <— BINDING: R2
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  if (!headers.get("content-type"))
    headers.set("content-type", "application/octet-stream");
  headers.set("etag", obj.httpEtag);
  headers.set("Cache-Control", "public, max-age=86400, immutable");
  headers.set("Access-Control-Allow-Origin", "*");

  if (range && obj.range) {
    headers.set(
      "content-range",
      `bytes ${obj.range.offset}-${obj.range.end}/${obj.size}`
    );
    return new Response(obj.body, { status: 206, headers });
  }

  return new Response(obj.body, { headers });
}
