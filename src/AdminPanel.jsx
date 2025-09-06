// src/AdminPanel.jsx
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Lock, Trash2, ImagePlus, Download } from "lucide-react";
import { imgSrc } from "@/utils/img";
import { uploadToR2 } from "@/utils/upload";

/* ====== KONSTANTA & HELPERS ====== */
const ADMIN_PIN_FALLBACK = "555622";
const DEFAULT_BASE_PRICE = 5000;
const DEFAULT_IMG = "img/default.jpg";

// simpan ke localStorage dengan guard
function safeSetItem(key, val) {
  try {
    localStorage.setItem(key, val);
    return true;
  } catch (e) {
    console.warn("[localStorage] gagal set", key, e);
    alert("Penyimpanan browser penuh. Kurangi ukuran/jumlah gambar.");
    return false;
  }
  
function toProxyFromR2(u = "") {
  try {
    // ambil path setelah "uploads/..."
    const url = new URL(u);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("uploads");
    if (idx >= 0) {
      const key = parts.slice(idx).join("/");
      return `/api/file?key=${encodeURIComponent(key)}`;
    }
    // fallback: kalau pola tak ketemu, biarkan apa adanya
    return u;
  } catch {
    return u;
  }
}

  
}
function safeJSONSetItem(key, obj) {
  return safeSetItem(key, JSON.stringify(obj));
}

// buat slug id dari nama produk
function slugify(s = "") {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
function makeUniqueId(base, products) {
  let id = base || "item";
  if (!products.some((p) => p.id === id)) return id;
  let i = 2;
  while (products.some((p) => p.id === `${id}-${i}`)) i++;
  return `${id}-${i}`;
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// Parser CSV sederhana
function parseCSV(text) {
  const rows = text.split(/\r?\n/).filter((l) => l.trim());
  if (!rows.length) return [];
  const first = rows[0].toLowerCase();
  const hasHeader =
    /id|name|nama|desc|deskripsi|stock|stok|image|gambar|foto|url|price|harga/.test(first);
  const start = hasHeader ? 1 : 0;

  const splitLine = (line) => {
    const res = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === "," && !inQ) {
        res.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    res.push(cur);
    return res.map((s) => s.trim());
  };

  const header = hasHeader
    ? splitLine(rows[0]).map((h) => h.toLowerCase())
    : ["id", "name", "desc", "stock", "image", "price"];

  const out = [];
  for (let i = start; i < rows.length; i++) {
    const cols = splitLine(rows[i]);
    const rec = {};
    header.forEach((h, idx) => (rec[h] = cols[idx]));
    const id =
      (rec.id ||
        rec.kode ||
        rec.sku ||
        (rec.name || rec.nama || "").toLowerCase().replace(/\s+/g, "-"))?.toLowerCase() || "";
    const name = rec.name || rec.nama || id || "produk";
    const desc = rec.desc || rec.deskripsi || "";
    const stock = parseInt(rec.stock || rec.stok || 0, 10) || 0;
    const image = rec.image || rec.gambar || rec.foto || rec.photo || rec.url || "";
    const priceRaw = parseInt(rec.price || rec.harga || "", 10);
    const price = Number.isFinite(priceRaw) ? priceRaw : undefined;

    const recOut = {
      id: id || slugify(name),
      name,
      desc,
      stock,
      image,
    };
    if (price !== undefined) recOut.price = price;
    out.push(recOut);
  }
  return out;
}

// bersihkan nilai image: kalau base64/blob → kosongkan agar fallback default
function normalizeImage(s) {
  const v = (s || "").trim();
  if (!v || v.startsWith("data:") || v.startsWith("blob:")) return "";
  return v;
}

/* ====== KOMPONEN UTAMA ====== */
export default function AdminPanel() {
  // --- Auth PIN ---
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const ADMIN_PIN =
    (import.meta.env.VITE_ADMIN_PIN?.trim() &&
      import.meta.env.VITE_ADMIN_PIN !== "ADMIN_PIN" &&
      import.meta.env.VITE_ADMIN_PIN) ||
    ADMIN_PIN_FALLBACK;

  // --- Pengaturan toko ---
  const [basePrice, setBasePrice] = useState(() => {
    const v = parseInt(localStorage.getItem("sayur5_price") || String(DEFAULT_BASE_PRICE), 10);
    return Number.isFinite(v) ? v : DEFAULT_BASE_PRICE;
  });
  const [freeOngkirMin, setFreeOngkirMin] = useState(() => {
    const v = parseInt(localStorage.getItem("sayur5_freeMin") || "30000", 10);
    return Number.isFinite(v) ? v : 30000;
  });
  const [ongkir, setOngkir] = useState(() => {
    const v = parseInt(localStorage.getItem("sayur5_ongkir") || "10000", 10);
    return Number.isFinite(v) ? v : 10000;
  });
  const [storePhone, setStorePhone] = useState(
    () => localStorage.getItem("sayur5_storePhone") || "6281233115194"
  );

  // --- Data lokal (cache) ---
  const [products, setProducts] = useState(() => {
    try {
      const raw = localStorage.getItem("sayur5_products");
      return raw ? JSON.parse(raw) : [];
    } catch {
      localStorage.removeItem("sayur5_products");
      return [];
    }
  });
useEffect(() => {
  fetch("https://sayur5-bl6.pages.dev/api/products", { mode: "cors" })
    .then(r => r.ok ? r.json() : Promise.reject(new Error(r.statusText)))
    .then(data => { if (Array.isArray(data)) setProducts(data); })
    .catch(() => { /* biarkan pakai localStorage */ });
}, []);

  
  const [orders, setOrders] = useState(() => {
    try {
      const raw = localStorage.getItem("sayur5_orders");
      return raw ? JSON.parse(raw) : [];
    } catch {
      localStorage.removeItem("sayur5_orders");
      return [];
    }
  });

  // --- Persist lokal dengan guard (pastikan setelah state dideklarasi) ---
  useEffect(() => { safeJSONSetItem("sayur5_products", products); }, [products]);
  useEffect(() => { safeJSONSetItem("sayur5_orders", orders); }, [orders]);
  useEffect(() => { safeSetItem("sayur5_price", String(basePrice)); }, [basePrice]);
  useEffect(() => { safeSetItem("sayur5_freeMin", String(freeOngkirMin)); }, [freeOngkirMin]);
  useEffect(() => { safeSetItem("sayur5_ongkir", String(ongkir)); }, [ongkir]);
  useEffect(() => { safeSetItem("sayur5_storePhone", storePhone); }, [storePhone]);

  // --- API Cloudflare (Pages Functions) ---
  const API_URL = (import.meta.env.VITE_API_URL ?? "").trim() || "/api/products";

  async function loadFromCloud() {
    try {
      const r = await fetch(API_URL, { mode: "cors" });
      const text = await r.text();
      if (!r.ok) throw new Error(`GET ${r.status}: ${text}`);
      const data = JSON.parse(text);
      setProducts(Array.isArray(data) ? data : []);
      alert("Katalog dimuat dari Cloudflare KV.");
    } catch (e) {
      alert("Gagal load: " + e.message);
      console.error(e);
    }
  }

  async function publishToCloud() {
    try {
      const r = await fetch(API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pin}`,
        },
        body: JSON.stringify(products),
      });
      const text = await r.text();
      if (!r.ok) throw new Error(`PUT ${r.status}: ${text}`);
      alert("Katalog berhasil dipublish ke Cloudflare KV.");
    } catch (e) {
      alert("Gagal publish: " + e.message);
      console.error(e);
    }
  }

  function stripBase64Images() {
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        image: /^(data:|blob:)/.test(p.image || "") ? "" : p.image || "",
      }))
    );
  }

  // Auto-load setelah login
  useEffect(() => {
    if (authed) loadFromCloud().catch(() => {});
  }, [authed]);

  const login = () => (pin === ADMIN_PIN ? setAuthed(true) : alert("PIN salah"));

  /* ====== RENDER: Halaman PIN ====== */
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Edit className="w-5 h-5" />
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          <div className="text-sm text-slate-600 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Masukkan PIN admin
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              className="max-w-xs"
            />
            <Button onClick={login}>Masuk</Button>
          </div>
        </div>
      </div>
    );
  }

  /* ====== RENDER: Isi Admin ====== */
  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadFromCloud}>
              Load dari Cloud
            </Button>
            <Button variant="outline" onClick={stripBase64Images}>
              Bersihkan Foto Base64
            </Button>
            <Button onClick={publishToCloud}>Publish ke Cloud</Button>
          </div>
        </div>

        {/* Pengaturan Toko */}
        <section className="border rounded-2xl p-4 bg-white">
          <h3 className="font-semibold mb-3">Pengaturan Toko</h3>
          <div className="grid md:grid-cols-4 gap-3">
            <label className="grid gap-1 text-sm">
              <span>Harga Dasar (IDR)</span>
              <Input
                type="number"
                value={basePrice}
                onChange={(e) =>
                  setBasePrice(Math.max(0, parseInt(e.target.value || "0", 10)))
                }
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Min. Gratis Ongkir</span>
              <Input
                type="number"
                value={freeOngkirMin}
                onChange={(e) =>
                  setFreeOngkirMin(Math.max(0, parseInt(e.target.value || "0", 10)))
                }
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Biaya Ongkir</span>
              <Input
                type="number"
                value={ongkir}
                onChange={(e) =>
                  setOngkir(Math.max(0, parseInt(e.target.value || "0", 10)))
                }
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>No. WA Toko</span>
              <Input
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="628xxxxxxxxxx"
              />
            </label>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            *Tersimpan di browser (localStorage). Frontstore membaca ini saat runtime.
          </div>
        </section>

        {/* Tambah Produk */}
        <section className="border rounded-2xl p-4 bg-white">
          <h3 className="font-semibold mb-3">Tambah Produk Baru</h3>
          <AddProductForm
            pin={pin}
            products={products}
            setProducts={setProducts}
            basePrice={basePrice || DEFAULT_BASE_PRICE}
          />
        </section>

        {/* Daftar Produk */}
        <section className="border rounded-2xl p-4 bg-white">
          <h3 className="font-semibold mb-3">Daftar Produk (Edit / Hapus)</h3>
          <ProductsManager products={products} setProducts={setProducts} />
        </section>

        {/* Import CSV */}
        <section className="border rounded-2xl p-4 bg-white">
          <h3 className="font-semibold mb-3">Import Katalog (CSV)</h3>
          <ImportCSV products={products} setProducts={setProducts} />
        </section>

        {/* Unduh CSV Pesanan */}
        {orders.length > 0 && (
          <div className="bg-white border rounded-2xl p-4">
            <Button
              variant="outline"
              onClick={() => downloadCSV(orders)}
              className="rounded-xl inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Unduh CSV Pesanan
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ====== SUB-KOMPONEN ====== */
function AddProductForm({ pin, products, setProducts, basePrice }) {
  const [form, setForm] = useState({
    name: "",
    image: "",
    desc: "",
    stock: 20,
    price: basePrice ?? DEFAULT_BASE_PRICE,
  });
  const [uploading, setUploading] = useState(false);
  const canAdd = form.name.trim().length > 0;
  const fileId = "file_" + Math.random().toString(36).slice(2);

  return (
    <div className="grid md:grid-cols-5 gap-2 items-end">
      <label className="grid gap-1 text-sm md:col-span-2">
        <span>Nama</span>
        <Input
          placeholder="Nama produk"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>
      <label className="grid gap-1 text-sm md:col-span-1">
        <span>Harga (IDR)</span>
        <Input
          type="number"
          value={form.price}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setForm({ ...form, price: Number.isFinite(v) && v >= 0 ? v : 0 });
          }}
        />
      </label>
      <label className="grid gap-1 text-sm md:col-span-1">
        <span>Stok</span>
        <Input
          type="number"
          value={form.stock}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setForm({ ...form, stock: Number.isFinite(v) && v >= 0 ? v : 0 });
          }}
        />
      </label>

      <div className="md:col-span-5 grid md:grid-cols-3 gap-2 items-end">
        <div className="flex items-center gap-3">
          <img
            src={imgSrc(form.image || DEFAULT_IMG)}
            alt="preview"
            className="w-16 h-16 object-cover rounded-lg border"
          />
          <div className="grid gap-1 text-sm flex-1">
            <span>URL Gambar</span>
            <Input
              placeholder="https://... (disarankan URL R2) atau img/nama-file.jpg"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />
          </div>
        </div>

        <div>
          <input
            id={fileId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setUploading(true);
                // Upload ke R2 via Pages Function /api/upload
                const { key, url } = await uploadToR2(file, pin);
                const finalUrl =
                  url && /^https?:\/\//.test(url)
                    ? url
                    : `/api/file?key=${encodeURIComponent(key)}`;
                setForm((s) => ({ ...s, image: finalUrl })); // simpan FULL URL R2
              } catch (err) {
                alert("Upload gagal: " + err.message);
                console.error(err);
              } finally {
                setUploading(false);
              }
            }}
          />
          <Button
            type="button"
            disabled={uploading}
            onClick={() => document.getElementById(fileId).click()}
            className="rounded-xl inline-flex items-center gap-2"
          >
            <ImagePlus className="w-4 h-4" />
            {uploading ? "Mengunggah…" : "Upload Foto"}
          </Button>
        </div>
      </div>

      <label className="grid gap-1 text-sm md:col-span-5">
        <span>Deskripsi (opsional)</span>
        <Input
          placeholder="panen pagi, segar untuk sop"
          value={form.desc}
          onChange={(e) => setForm({ ...form, desc: e.target.value })}
        />
      </label>

      <div className="md:col-span-5">
        <Button
          disabled={!canAdd}
          onClick={() => {
            // auto-generate id dari nama (unik)
            const base = slugify(form.name);
            const id = makeUniqueId(base, products);
            const toSave = { id, ...form, image: normalizeImage(form.image) };
            setProducts([toSave, ...products]);
            setForm({ name: "", image: "", desc: "", stock: 20, price: basePrice ?? DEFAULT_BASE_PRICE });
          }}
        >
          Tambah Produk
        </Button>
        {!canAdd && (
          <span className="text-xs text-slate-500 ml-2">Isi nama produk dulu.</span>
        )}
      </div>
    </div>
  );
}

function ProductsManager({ products, setProducts }) {
  const update = (id, patch) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const remove = (id) => {
    if (confirm("Hapus produk ini?"))
      setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  if (!products.length) return <div className="text-sm text-slate-500">Belum ada produk.</div>;

  return (
    <div className="grid gap-2">
      {products.map((p) => (
        <Card key={p.id} className="rounded-2xl">
          <CardContent className="p-3 grid md:grid-cols-12 gap-2 items-center">
            <div className="md:col-span-1">
              <img
                src={imgSrc(p.image || DEFAULT_IMG)}
                alt={p.name}
                className="w-14 h-14 rounded-lg object-cover border"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] text-slate-500">ID (otomatis)</div>
              <div className="text-xs font-mono break-all">{p.id}</div>
            </div>

            <div className="md:col-span-3">
              <div className="text-[11px] text-slate-500">Nama</div>
              <Input value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} />
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] text-slate-500">Harga</div>
              <Input
                type="number"
                value={p.price ?? ""}
                placeholder="(pakai harga dasar)"
                onChange={(e) =>
                  update(p.id, {
                    price:
                      e.target.value === ""
                        ? undefined
                        : Math.max(0, parseInt(e.target.value || "0", 10)),
                  })
                }
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] text-slate-500">Stok</div>
              <Input
                type="number"
                value={p.stock}
                onChange={(e) =>
                  update(p.id, {
                    stock: Math.max(0, parseInt(e.target.value || "0", 10)),
                  })
                }
              />
            </div>

            <div className="md:col-span-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(p.id)}
                className="rounded-xl"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="md:col-span-12">
              <div className="text-[11px] text-slate-500 mb-1">URL Gambar</div>
              <Input
                value={p.image || ""}
                placeholder="https://... (R2) atau img/nama-file.jpg"
                onChange={(e) => update(p.id, { image: normalizeImage(e.target.value) })}
              />
              <div className="text-[11px] text-slate-500 mt-2">Deskripsi</div>
              <Input
                value={p.desc || ""}
                onChange={(e) => update(p.id, { desc: e.target.value })}
                placeholder="deskripsi singkat"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ImportCSV({ products, setProducts }) {
  const [status, setStatus] = useState("");
  const inputId = "csv_input_" + Math.random().toString(36).slice(2);

  const onFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const recs = parseCSV(text);
        if (!recs.length) {
          setStatus("CSV kosong atau tidak terbaca.");
          return;
        }
        setProducts((prev) => {
          const next = [...prev];
          for (const r of recs) {
            const id = r.id || makeUniqueId(slugify(r.name || "item"), next);
            const idx = next.findIndex((p) => p.id === id);
            const merged = {
              ...(idx >= 0 ? next[idx] : {}),
              ...r,
              id,
              image: normalizeImage(r.image || (idx >= 0 ? next[idx].image : "")),
            };
            if (idx >= 0) next[idx] = merged;
            else next.unshift(merged);
          }
          return next;
        });
        setStatus(`Berhasil memproses ${recs.length} baris.`);
      } catch (e) {
        setStatus("Gagal memproses CSV: " + e.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid gap-2 text-sm">
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files && onFile(e.target.files[0])}
        />
        <Button onClick={() => document.getElementById(inputId).click()}>Import CSV</Button>
        <Button
          variant="outline"
          onClick={() => {
            const sample = [
              "id,name,desc,stock,image,price",
              "bayam-merah,Bayam Merah,Panen pagi 250g,30,https://images.unsplash.com/photo-1543339308-43f2a5a7c8e8,5000",
              "pakcoy,Pakcoy Hijau,Segar untuk tumisan,40,,6000",
              "paprika-merah,Paprika Merah,Manis & renyah,25,https://images.unsplash.com/photo-1546471180-3ad1c6925f59,7000",
            ].join("\n");
            const blob = new Blob([sample], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "template_sayur5.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Unduh Template
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setProducts(
              products.map((p) => ({
                ...p,
                image: p.image && String(p.image).trim() ? p.image : DEFAULT_IMG,
              }))
            );
            setStatus("Foto default diisi untuk produk tanpa gambar.");
          }}
        >
          Isi Foto Default
        </Button>
      </div>
      {status && <div className="text-slate-600">{status}</div>}
      <div className="text-xs text-slate-500">
        Format: <code>id,name,desc,stock,image,price</code>. Kolom <code>image</code> boleh
        kosong (akan pakai foto default) dan <code>price</code> opsional.
      </div>
    </div>
  );
}

function downloadCSV(orders) {
  const header = [
    "id",
    "tanggal",
    "nama",
    "telepon",
    "alamat",
    "payment",
    "subtotal",
    "ongkir",
    "total",
    "status",
    "items",
  ];
  const rows = orders.map((o) => [
    o.id,
    new Date(o.date).toLocaleString("id-ID"),
    JSON.stringify(o.name),
    o.phone,
    JSON.stringify(o.address),
    o.payment,
    o.subtotal,
    o.shipping,
    o.total,
    o.status,
    o.items.map((it) => `${it.name} x${it.qty}`).join("; "),
  ]);
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sayur5_orders_${todayKey()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
