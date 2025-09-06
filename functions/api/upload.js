export const onRequestOptions = () =>
  new Response(null, { headers: cors() });

export const onRequestPost = async ({ request, env }) => {
  const pin = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!pin || pin !== env.ADMIN_PIN) return json({ error: "unauthorized" }, 401);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "file missing" }, 400);
  if (file.size > 5 * 1024 * 1024) return json({ error: "max 5MB" }, 413); // batas 5MB

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const key = `img/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await env.IMAGES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  const base = env.PUBLIC_BASE_URL.replace(/\/$/, "");
  return json({ ok: true, key, url: `${base}/${key}` });
};

const json = (obj, status=200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...cors() } });

const cors = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});
