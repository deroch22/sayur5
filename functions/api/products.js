// functions/api/products.js
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const KEY = "catalog"; // satu key untuk simpan seluruh katalog (array)

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestGet({ env }) {
  const text = (await env.PRODUCTS.get(KEY)) || "[]";
  return new Response(text, {
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export async function onRequestPut({ request, env }) {
  try {
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!env.ADMIN_PIN) {
      return new Response(JSON.stringify({ error: "ADMIN_PIN not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }
    if (token !== env.ADMIN_PIN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    const data = await request.json().catch(() => null);
    if (!Array.isArray(data)) {
      return new Response(JSON.stringify({ error: "Body must be an array" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    await env.PRODUCTS.put(KEY, JSON.stringify(data));
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
}
