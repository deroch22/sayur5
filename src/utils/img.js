export async function onRequestGet({ request, env }) {
  try {
    const u = new URL(request.url);
    const key = u.searchParams.get("key");          // contoh: uploads/2025-09-06/xxx.png
    const w   = parseInt(u.searchParams.get("w") || "0", 10);  // lebar opsional
    const q   = parseInt(u.searchParams.get("q") || "75", 10); // quality

    if (!key) {
      return new Response(JSON.stringify({ ok:false, error:"key required" }), {
        status: 400, headers: { "content-type": "application/json" }
      });
    }

    // Jika punya public base (r2.dev), pakai Image Resizing Cloudflare
    if (env.R2_PUBLIC_BASE) {
      const origin = env.R2_PUBLIC_BASE.replace(/\/+$/, ""); // tanpa slash di akhir
      const src = `${origin}/${key.replace(/^\/+/, "")}`;

      const opts = w ? { cf: { image: { width: w, quality: q, fit: "cover" } } } : {};
      const r = await fetch(src, opts);

      if (!r.ok) return new Response("not found", { status: 404 });
      return new Response(r.body, {
        headers: {
          "content-type": r.headers.get("content-type") || "image/webp",
          "cache-control": "public, max-age=604800, immutable"
        }
      });
    }

    // Fallback: stream langsung dari binding R2 (tanpa resize)
    const obj = await env.R2.get(key);
    if (!obj) return new Response("not found", { status: 404 });

    return new Response(obj.body, {
      headers: {
        "content-type": obj.httpMetadata?.contentType || "image/jpeg",
        "cache-control": "public, max-age=31536000, immutable"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
}
