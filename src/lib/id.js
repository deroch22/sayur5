// src/lib/id.js
export function slugify(s = "") {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function makeUniqueId(base, products) {
  let id = base || "item";
  if (!products.some(p => p.id === id)) return id;
  let i = 2;
  while (products.some(p => p.id === `${id}-${i}`)) i++;
  return `${id}-${i}`;
}
