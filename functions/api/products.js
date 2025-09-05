// functions/api/products.js
export async function onRequest(context) {
  const { request, env } = context;

  const pickOrigin = () => {
    const allowed = (env.ALLOWED_ORIGIN || "")
      .split(",").map(s => s.trim()).filter(Boolean);
    const reqOrigin = request.headers.get("origin") || "";
    return allowed.includes(reqOrigin) ? reqOrigin : allowed[0] || "*";
  };
  const json = (body, status = 200, extra = {}) =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": pickOrigin(),
        "access-control-allow-methods": "GET,PUT,OPTIONS",
        "access-control-allow-headers": "content-type,authorization",
        "access-control-allow-credentials": "true",
        ...extra,
      },
    });

  if (request.method === "OPTIONS") return json("", 204);

  const KEY = "products";

  if (request.method === "GET") {
    const raw = (await env.PRODUCTS.get(KEY)) || "[]";
    return json(raw);
  }

  if (request.method === "PUT" || request.method === "POST") {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${env.ADMIN_PIN}`) return json({ error: "unauthorized" }, 401);

    const data = await request.json();
    if (!Array.isArray(data)) return json({ error: "bad payload" }, 400);

    await env.PRODUCTS.put(KEY, JSON.stringify(data));
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
}
