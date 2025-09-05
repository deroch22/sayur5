import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Leaf, Search, Truck, BadgePercent, Phone, MapPin,
  CreditCard, X, Plus, Minus, Edit, Lock, Download, ImagePlus, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLocation, useNavigate } from "react-router-dom";

/* Host yang boleh melihat TOMBOL Admin (opsional – untuk dev/local saja) */
const ADMIN_ALLOWED_HOSTS = (import.meta.env.VITE_ADMIN_ALLOWED_HOSTS || "localhost,127.0.0.1").split(",");

/* Helper: format rupiah (tahan NaN/undefined) */
const toIDR = (n) => {
  const x = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(x);
};

/* Konstanta & helper telepon */
const DEFAULT_BASE_PRICE = 5000;
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "555622";

function toWA(msisdn) {
  // Normalisasi ke 62xxxxxxxxx
  let d = String(msisdn || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  else if (d.startsWith("+")) d = d.slice(1);
  return d;
}
function isValidIndoPhone(s) {
  const d = String(s || "").replace(/\D/g, "");
  // 08xxxxxxxx(10–13 digit) atau 62xxxxxxxx
  return /^0?8\d{8,12}$/.test(d) || /^62?8\d{8,12}$/.test(d);
}

/* Placeholder gambar default (SVG inline) */
const DEFAULT_IMG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'>
    <defs><linearGradient id='g' x1='0' x2='1'><stop stop-color='#bbf7d0'/><stop stop-color='#ecfeff' offset='1'/></linearGradient></defs>
    <rect width='100%' height='100%' rx='16' fill='url(#g)'/>
    <g fill='#047857' font-family='Arial,Helvetica,sans-serif' font-size='18' text-anchor='middle'>
      <text x='100' y='70' font-weight='700'>FOTO PRODUK</text>
      <text x='100' y='95' font-size='12'>upload / url</text>
    </g>
  </svg>`
)}`;

/* Starter katalog */
const STARTER_PRODUCTS = [
  { id: "bayam", name: "Bayam Fresh", desc: "Dipetik pagi, siap masak bening.", stock: 50 },
  { id: "kangkung", name: "Kangkung", desc: "Crispy untuk cah bawang.", stock: 60 },
  { id: "wortel", name: "Wortel", desc: "Manis & renyah, cocok sop.", stock: 80 },
  { id: "kol", name: "Kol", desc: "Segar untuk capcay.", stock: 40 },
  { id: "tomat", name: "Tomat", desc: "Merah ranum, sambal mantap.", stock: 70 },
  { id: "buncis", name: "Buncis", desc: "Muda & empuk.", stock: 55 },
];

/* Helpers */
function computeShippingFee(subtotal, freeMin, fee) { return subtotal === 0 || subtotal >= freeMin ? 0 : fee; }
function todayKey(d = new Date()) { return d.toISOString().slice(0, 10); }
const priceOf = (p, basePrice) => (typeof p?.price === "number" && p.price > 0 ? p.price : basePrice);

/* Parser CSV sederhana: id,name,desc,stock,image|url,price|harga (header opsional) */
function parseCSV(text) {
  const rows = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rows.length === 0) return [];
  const first = rows[0].toLowerCase();
  const hasHeader = /id|name|nama|desc|stok|stock|image|gambar|foto|photo|url|price|harga/.test(first);
  const start = hasHeader ? 1 : 0;

  const splitLine = (line) => {
    const res = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { res.push(cur); cur = ""; } else { cur += ch; }
    }
    res.push(cur);
    return res.map((s) => s.trim());
  };

  const header = hasHeader ? splitLine(rows[0]).map((h) => h.toLowerCase())
                           : ["id","name","desc","stock","image","price"];

  const out = [];
  for (let i = start; i < rows.length; i++) {
    const cols = splitLine(rows[i]); const rec = {}; header.forEach((h, idx) => rec[h] = cols[idx]);
    const id = (rec.id || rec["kode"] || rec["sku"] || (rec.name || rec["nama"] || "").toLowerCase().replace(/\s+/g, "-")).toLowerCase();
    const name = rec.name || rec["nama"] || id;
    const desc = rec.desc || rec["deskripsi"] || "";
    const stock = parseInt(rec.stock || rec["stok"] || 0) || 0;
    const image = rec.image || rec["gambar"] || rec["foto"] || rec["photo"] || rec["url"] || "";
    const price = parseInt(rec.price || rec["harga"] || "") || undefined;
    const recOut = { id, name, desc, stock, image };
    if (price) recOut.price = price;
    out.push(recOut);
  }
  return out;
}

export default function SayurSerbaLima({ adminOnly = false }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Route dianggap admin jika prop adminOnly=true ATAU URL diawali /admin
  const isAdminRoute = adminOnly || location.pathname.startsWith("/admin");

  // ===== STATE DASAR =====
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});
  const [openCheckout, setOpenCheckout] = useState(false);

  // ===== PENGATURAN TOKO (+ persist) =====
  const [freeOngkirMin, setFreeOngkirMin] = useState(() => {
    const v = parseInt(localStorage.getItem("sayur5_freeMin") ?? "30000", 10);
    return Number.isFinite(v) ? v : 30000;
  });
  const [ongkir, setOngkir] = useState(() => {
    const v = parseInt(localStorage.getItem("sayur5_ongkir") ?? "10000", 10);
    return Number.isFinite(v) ? v : 10000;
  });
  const [basePrice, setBasePrice] = useState(() => {
    const v = parseInt(localStorage.getItem("sayur5_price") ?? String(DEFAULT_BASE_PRICE), 10);
    return Number.isFinite(v) ? v : DEFAULT_BASE_PRICE;
  });
  const [storePhone, setStorePhone] = useState(() =>
    localStorage.getItem("sayur5_storePhone") || "081233115194"
  );

  useEffect(() => { localStorage.setItem("sayur5_freeMin", String(freeOngkirMin)); }, [freeOngkirMin]);
  useEffect(() => { localStorage.setItem("sayur5_ongkir", String(ongkir)); }, [ongkir]);
  useEffect(() => { localStorage.setItem("sayur5_price", String(basePrice)); }, [basePrice]);
  useEffect(() => { localStorage.setItem("sayur5_storePhone", String(storePhone)); }, [storePhone]);

  // ===== PRODUCTS (aman dari JSON korup) =====
  const [products, setProducts] = useState(() => {
    try {
      const raw = localStorage.getItem("sayur5_products");
      return raw ? JSON.parse(raw) : STARTER_PRODUCTS;
    } catch {
      localStorage.removeItem("sayur5_products");
      return STARTER_PRODUCTS;
    }
  });

  // ===== ORDERS (aman dari JSON korup) =====
  const [orders, setOrders] = useState(() => {
    try {
      const raw = localStorage.getItem("sayur5_orders");
      return raw ? JSON.parse(raw) : [];
    } catch {
      localStorage.removeItem("sayur5_orders");
      return [];
    }
  });

  // ===== PERSIST CATALOG & ORDERS =====
  useEffect(() => { localStorage.setItem("sayur5_products", JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem("sayur5_orders", JSON.stringify(orders)); }, [orders]);

  // ===== ADMIN DIALOG =====
  const [openAdmin, setOpenAdmin] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const showAdminButton = import.meta.env.DEV || ADMIN_ALLOWED_HOSTS.includes(window.location.hostname);
  useEffect(() => { if (isAdminRoute) setOpenAdmin(true); }, [isAdminRoute]);

  // Bersihkan keranjang jika ada id yang tidak ada di katalog
  useEffect(() => {
    setCart((c) => {
      const valid = new Set(products.map((p) => p.id));
      const next = { ...c };
      for (const id of Object.keys(next)) {
        if (!valid.has(id)) delete next[id];
      }
      return next;
    });
  }, [products]);

  // ====== DERIVED ======
  const filtered = useMemo(() => {
    const q = (query || "").toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [query, products]);

  const items = useMemo(() => {
    return Object.entries(cart).map(([id, qty]) => {
      const p = products.find((x) => x.id === id);
      const price = p ? priceOf(p, basePrice) : basePrice;
      return p
        ? { ...p, id, qty, price }
        : { id, name: "(produk tidak tersedia)", qty, price: basePrice };
    });
  }, [cart, products, basePrice]);

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.qty * it.price, 0), [items]);
  const shippingFee = useMemo(() => computeShippingFee(subtotal, freeOngkirMin, ongkir), [subtotal, freeOngkirMin, ongkir]);
  const grandTotal = subtotal + shippingFee;
  const totalQty = useMemo(() => items.reduce((s, it) => s + it.qty, 0), [items]);

  // ====== CART OPS ======
  const add = (id) =>
    setCart((c) => {
      const current = Number.isFinite(parseInt(c[id], 10)) ? parseInt(c[id], 10) : 0;
      const maxStock = Number.isFinite(parseInt(products.find(p => p.id === id)?.stock, 10))
        ? parseInt(products.find(p => p.id === id)?.stock, 10)
        : 99;
      return { ...c, [id]: Math.min(current + 1, maxStock) };
    });

  const sub = (id) =>
    setCart((c) => {
      const current = Number.isFinite(parseInt(c[id], 10)) ? parseInt(c[id], 10) : 0;
      const nextQty = Math.max(current - 1, 0);
      const next = { ...c, [id]: nextQty };
      if (nextQty === 0) delete next[id];
      return next;
    });

  const clearCart = () => setCart({});

  // ====== CHECKOUT HANDLER ======
  const createOrder = (payload) => {
    const { name, phone, address, payment, note } = payload;
    const order = {
      id: `INV-${Date.now()}`,
      date: new Date().toISOString(),
      name, phone, address, payment, note,
      items: items.map(({ id, name, qty, price }) => ({ id, name, qty, price })),
      subtotal, shipping: shippingFee, total: grandTotal, status: "baru"
    };
    const copy = products.map(p => {
      const it = items.find(i => i.id === p.id);
      return it ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p;
    });
    setProducts(copy);
    setOrders(o => [order, ...o]);
    clearCart();
  };

  // ====== RUNTIME TESTS ======
  useEffect(() => {
    try {
      console.group("Sayur5 runtime tests");
      console.assert(/Rp/.test(toIDR(5000)), "toIDR harus menyertakan Rp");
      console.assert(computeShippingFee(30000, 30000, 10000) === 0, "Gratis ongkir saat subtotal = min");
      console.assert(computeShippingFee(0, 30000, 10000) === 0, "Gratis ongkir saat subtotal 0");
      console.assert(computeShippingFee(25000, 30000, 10000) === 10000, "Ongkir di bawah min");
      console.groupEnd();
    } catch (e) {
      console.error("Runtime tests failed:", e);
    }
  }, []);

  // ====== UI ======
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white text-slate-800">
      {/* Topbar */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-emerald-100 text-emerald-700">
              <Leaf className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-lg">Sayur5</div>
              <div className="text-xs text-slate-500 -mt-0.5">
                Serba {toIDR(basePrice)} — Fresh Setiap Hari
              </div>
            </div>
          </div>

          {/* Desktop: search + badges + admin + cart */}
          <div className="hidden md:flex items-center gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari bayam, kangkung, wortel…"
                className="pl-9 rounded-2xl"
              />
            </div>
            <Badge variant="secondary" className="rounded-full hidden lg:inline-flex gap-1">
              <Truck className="w-3 h-3" /> Antar cepat area kota
            </Badge>
            <Badge variant="outline" className="rounded-full hidden lg:inline-flex gap-1">
              <BadgePercent className="w-3 h-3" /> Gratis ongkir min {toIDR(freeOngkirMin)}
            </Badge>

            {/* TOMBOL ADMIN — hanya tampil jika diizinkan */}
            {showAdminButton && (
              <Button
                variant="outline"
                className="rounded-2xl flex items-center gap-2"
                onClick={() => setOpenAdmin(true)}
              >
                <Edit className="w-4 h-4" /> Admin Panel
              </Button>
            )}

            <CartSheet
              items={items}
              totalQty={totalQty}
              subtotal={subtotal}
              shippingFee={shippingFee}
              grandTotal={grandTotal}
              add={add}
              sub={sub}
              clearCart={clearCart}
              setOpenCheckout={setOpenCheckout}
              freeOngkirMin={freeOngkirMin}
              ongkir={ongkir}
            />
          </div>

          {/* Mobile: search + cart */}
          <div className="md:hidden flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-2xl">
                  <Search className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top">
                <div className="mt-4">
                  <Input
                    autoFocus
                    placeholder="Cari sayur…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <CartSheet
              items={items}
              totalQty={totalQty}
              subtotal={subtotal}
              shippingFee={shippingFee}
              grandTotal={grandTotal}
              add={add}
              sub={sub}
              clearCart={clearCart}
              setOpenCheckout={setOpenCheckout}
              freeOngkirMin={freeOngkirMin}
              ongkir={ongkir}
            />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.5}}>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
              Sayur Fresh Serba {toIDR(basePrice)}<br/>Gaya Startup, Harga Merakyat.
            </h1>
            <p className="mt-3 text-slate-600 md:text-lg">
              Belanja sayur cepat, murah, dan anti ribet. Checkout dalam hitungan detik, diantar hari ini juga.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge className="rounded-full">Panen Pagi</Badge>
              <Badge variant="outline" className="rounded-full">Kurasi Harian</Badge>
              <Badge variant="secondary" className="rounded-full">Tanpa Minimum per Item</Badge>
            </div>
          </motion.div>
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.6}} className="md:justify-self-end">
            <div className="relative">
              <div className="absolute -inset-4 bg-emerald-200/40 blur-2xl rounded-[2rem]"></div>
              <div className="relative grid grid-cols-3 gap-3">
                {products.slice(0,6).map((p)=> (
                  <motion.div key={p.id} whileHover={{scale:1.04}} className="p-4 rounded-2xl bg-white shadow-sm border flex flex-col items-center">
                    <img src={p.image || DEFAULT_IMG} alt={p.name} className="h-14 w-14 object-cover rounded-xl" />
                    <div className="text-xs mt-2 text-center font-medium">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{toIDR(priceOf(p, basePrice))}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Catalog */}
      <section className="mx-auto max-w-6xl px-4 mt-10 mb-20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl md:text-2xl font-bold">Katalog Hari Ini</h2>
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
            <Truck className="w-4 h-4"/> Estimasi kirim: 1-3 jam setelah pembayaran
          </div>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
          {filtered.map((p) => (
              <motion.div key={p.id} layout initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}}>
                <Card className="rounded-2xl overflow-hidden group">
                  <CardHeader className="p-0">
                    <div className="h-28 bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                      <img src={p.image || DEFAULT_IMG} alt={p.name} className="h-20 w-20 object-cover rounded-xl border" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <CardTitle className="text-base font-semibold leading-tight">{p.name}</CardTitle>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">{p.desc}</div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="font-extrabold">{toIDR(priceOf(p, basePrice))}</div>
                      <div className="text-xs text-slate-500">Stok: {p.stock}</div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button className="rounded-xl flex-1" onClick={()=>add(p.id)}>Tambah</Button>
                      {cart[p.id] ? (
                        <div className="flex items-center border rounded-xl overflow-hidden">
                          <Button size="icon" variant="ghost" onClick={()=>sub(p.id)}><Minus className="w-4 h-4"/></Button>
                          <div className="px-2 w-8 text-center font-semibold">{cart[p.id]}</div>
                          <Button size="icon" variant="ghost" onClick={()=>add(p.id)}><Plus className="w-4 h-4"/></Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="rounded-xl" onClick={()=>add(p.id)} size="icon">
                          <Plus className="w-4 h-4"/>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-8 grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="font-bold mb-1">Sayur5</div>
            <div className="text-slate-500">Platform belanja sayur serba {toIDR(basePrice)}. Cepat, segar, hemat.</div>
          </div>
          <div>
            <div className="font-semibold mb-2">Kontak</div>
            <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5"/> {storePhone}</div>
            <div className="flex items-center gap-2 mt-1"><MapPin className="w-3.5 h-3.5"/> Area layanan: Dalam kota</div>
          </div>
          <div>
            <div className="font-semibold mb-2">Promo</div>
            <div className="flex items-center gap-2"><BadgePercent className="w-3.5 h-3.5"/> Gratis ongkir min {toIDR(freeOngkirMin)}</div>
          </div>
        </div>
      </footer>

      {/* Checkout Dialog */}
      <Dialog open={openCheckout} onOpenChange={setOpenCheckout}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>Checkout</DialogTitle></DialogHeader>
          {items.length === 0 ? (
            <div className="text-sm text-slate-500">Keranjang kosong.</div>
          ) : (
            <CheckoutForm
              items={items}
              subtotal={subtotal}
              shippingFee={shippingFee}
              grandTotal={grandTotal}
              onSubmit={(payload)=>{ createOrder(payload); alert("Pesanan dicatat! Admin akan menghubungi via WhatsApp."); setOpenCheckout(false); }}
              storePhone={storePhone}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Admin Panel: hanya mount saat /admin ===== */}
      {isAdminRoute && (
        <Dialog
          open={openAdmin}
          onOpenChange={(v) => {
            setOpenAdmin(v);
            if (!v) {
              setAdminAuthed(false);
              navigate("/"); // tutup dialog → kembali ke beranda
            }
          }}
        >
          <DialogContent className="sm:max-w-4xl rounded-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" /> Admin Panel
              </DialogTitle>
            </DialogHeader>

            {!adminAuthed ? (
              /* ====== AUTH PIN ====== */
              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Lock className="w-4 h-4" /> Masukkan PIN untuk melanjutkan
                </div>
                <div className="flex gap-2">
                  <Input type="password" placeholder="PIN" id="sayur5_pin" className="max-w-xs" />
                  <Button
                    onClick={() => {
                      const v = document.getElementById("sayur5_pin").value;
                      if (v === ADMIN_PIN) setAdminAuthed(true);
                      else alert("PIN salah");
                    }}
                  >
                    Masuk
                  </Button>
                </div>
              </div>
            ) : (
              /* ====== ISI ADMIN ====== */
              <div className="space-y-8">
                {/* Pengaturan Toko */}
                <section className="border rounded-2xl p-4">
                  <h3 className="font-semibold mb-3">Pengaturan Toko</h3>
                  <div className="grid md:grid-cols-4 gap-3">
                    <label className="grid gap-1 text-sm">
                      <span>Harga Dasar (IDR)</span>
                      <Input type="number" value={basePrice} onChange={(e)=>setBasePrice(Math.max(0, parseInt(e.target.value||"0",10)))} />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span>Min. Gratis Ongkir</span>
                      <Input type="number" value={freeOngkirMin} onChange={(e)=>setFreeOngkirMin(Math.max(0, parseInt(e.target.value||"0",10)))} />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span>Biaya Ongkir</span>
                      <Input type="number" value={ongkir} onChange={(e)=>setOngkir(Math.max(0, parseInt(e.target.value||"0",10)))} />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span>No. WA Toko</span>
                      <Input value={storePhone} onChange={(e)=>setStorePhone(e.target.value)} placeholder="08xxxxxxxxxx" />
                    </label>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">Semua pengaturan otomatis tersimpan (localStorage).</div>
                </section>

                {/* Tambah Produk */}
                <section className="border rounded-2xl p-4">
                  <h3 className="font-semibold mb-3">Tambah Produk Baru</h3>
                  <AddProductForm products={products} setProducts={setProducts} basePrice={basePrice} />
                </section>

                {/* Daftar & Edit Produk */}
                <section className="border rounded-2xl p-4">
                  <h3 className="font-semibold mb-3">Daftar Produk (Edit / Hapus)</h3>
                  <ProductsManager products={products} setProducts={setProducts} />
                </section>

                {/* Import CSV */}
                <section className="border rounded-2xl p-4">
                  <h3 className="font-semibold mb-3">Import Katalog (CSV)</h3>
                  <ImportCSV products={products} setProducts={setProducts} />
                </section>

                {/* Unduh CSV Pesanan */}
                {orders.length > 0 && (
                  <div className="mt-3">
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
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/** Form Tambah Produk */
function AddProductForm({ products, setProducts, basePrice }){
  const [form, setForm] = useState({ id:"", name:"", image:"", desc:"", stock:20, price: basePrice || DEFAULT_BASE_PRICE });
  const exists = (id)=> products.some(p=>p.id===id);
  const canAdd = form.id.trim() && form.name.trim() && !exists(form.id);
  const fileId = "file_"+Math.random().toString(36).slice(2);

  return (
    <div className="grid md:grid-cols-5 gap-2 items-end">
      <label className="grid gap-1 text-sm md:col-span-1">
        <span>ID</span>
        <Input placeholder="contoh: bayam-merah" value={form.id} onChange={(e)=>setForm({...form, id:e.target.value.trim().toLowerCase()})}/>
      </label>
      <label className="grid gap-1 text-sm md:col-span-2">
        <span>Nama</span>
        <Input placeholder="Nama produk" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})}/>
      </label>
      <label className="grid gap-1 text-sm md:col-span-1">
        <span>Harga (IDR)</span>
        <Input type="number" value={form.price} onChange={(e)=>{ const v=parseInt(e.target.value,10); setForm({...form, price: Number.isFinite(v)&&v>=0?v:0}); }}/>
      </label>
      <label className="grid gap-1 text-sm md:col-span-1">
        <span>Stok</span>
        <Input type="number" value={form.stock} onChange={(e)=>{ const v=parseInt(e.target.value,10); setForm({...form, stock: Number.isFinite(v)&&v>=0?v:0}); }}/>
      </label>

      <div className="md:col-span-5 grid md:grid-cols-3 gap-2 items-end">
        <div className="flex items-center gap-3">
          <img src={form.image || DEFAULT_IMG} alt="preview" className="w-16 h-16 object-cover rounded-lg border"/>
          <div className="grid gap-1 text-sm flex-1">
            <span>URL Gambar</span>
            <Input placeholder="https://" value={form.image} onChange={(e)=>setForm({...form, image:e.target.value})}/>
          </div>
        </div>
        <div>
          <input
            id={fileId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=> setForm({...form, image: String(r.result)}); r.readAsDataURL(f); }}
          />
          <Button type="button" onClick={()=>document.getElementById(fileId).click()} className="rounded-xl inline-flex items-center gap-2">
            <ImagePlus className="w-4 h-4"/> Upload Foto
          </Button>
        </div>
      </div>

      <label className="grid gap-1 text-sm md:col-span-5">
        <span>Deskripsi (opsional)</span>
        <Input placeholder="contoh: panen pagi, segar untuk sop" value={form.desc} onChange={(e)=>setForm({...form, desc:e.target.value})}/>
      </label>
      <div className="md:col-span-5">
        <Button
          disabled={!canAdd}
          onClick={()=>{
            if(exists(form.id)) return alert("ID sudah dipakai, gunakan ID lain.");
            setProducts([{...form}, ...products]);
            setForm({ id:"", name:"", image:"", desc:"", stock:20, price: basePrice || DEFAULT_BASE_PRICE });
          }}
        >
          Tambah Produk
        </Button>
        {!canAdd && <span className="text-xs text-slate-500 ml-2">Isi ID & Nama (ID unik).</span>}
      </div>
    </div>
  );
}

/** Kelola Produk (edit inline / hapus) */
function ProductsManager({ products, setProducts }) {
  const update = (id, patch) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };
  const remove = (id) => {
    if (!confirm("Hapus produk ini?")) return;
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  if (!products.length) return <div className="text-sm text-slate-500">Belum ada produk.</div>;

  return (
    <div className="grid gap-2">
      {products.map((p) => (
        <Card key={p.id} className="rounded-2xl">
          <CardContent className="p-3 grid md:grid-cols-12 gap-2 items-center">
            <div className="md:col-span-1">
              <img src={p.image || DEFAULT_IMG} alt={p.name} className="w-14 h-14 rounded-lg object-cover border" />
            </div>
            <div className="md:col-span-2">
              <div className="text-[11px] text-slate-500">ID</div>
              <div className="text-xs font-mono">{p.id}</div>
            </div>
            <div className="md:col-span-3">
              <div className="text-[11px] text-slate-500">Nama</div>
              <Input value={p.name} onChange={(e)=>update(p.id, { name: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <div className="text-[11px] text-slate-500">Harga</div>
              <Input type="number" value={p.price ?? ""} placeholder="(pakai harga dasar)"
                     onChange={(e)=>update(p.id, { price: e.target.value === "" ? undefined : Math.max(0, parseInt(e.target.value||"0",10)) })} />
            </div>
            <div className="md:col-span-2">
              <div className="text-[11px] text-slate-500">Stok</div>
              <Input type="number" value={p.stock} onChange={(e)=>update(p.id, { stock: Math.max(0, parseInt(e.target.value||"0",10)) })} />
            </div>
            <div className="md:col-span-1">
              <Button variant="ghost" size="icon" onClick={()=>remove(p.id)} className="rounded-xl">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="md:col-span-12">
              <div className="text-[11px] text-slate-500 mb-1">URL Gambar</div>
              <Input value={p.image || ""} onChange={(e)=>update(p.id, { image: e.target.value })} placeholder="https://..." />
              <div className="text-[11px] text-slate-500 mt-1">Deskripsi</div>
              <Input value={p.desc || ""} onChange={(e)=>update(p.id, { desc: e.target.value })} placeholder="deskripsi singkat" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Import CSV */
function ImportCSV({ products, setProducts }){
  const [status, setStatus] = useState("");
  const inputId = "csv_input_"+Math.random().toString(36).slice(2);

  const onFile = (file)=>{
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const text = String(reader.result);
        const recs = parseCSV(text);
        if(!recs.length){ setStatus("CSV kosong atau tidak terbaca."); return; }

        // merge: update kalau ada, tambah kalau baru
        setProducts(prev => {
          const next = [...prev];
          for (const r of recs) {
            const idx = next.findIndex(p => p.id === r.id);
            if (idx >= 0) {
              const old = next[idx];
              next[idx] = {
                ...old,
                ...r,
                image: r.image || old.image || "",
                stock: Number.isFinite(r.stock) ? r.stock : old.stock,
                price: Number.isFinite(r.price) ? r.price : old.price
              };
            } else {
              next.unshift({ ...r, image: r.image || "" });
            }
          }
          return next;
        });

        setStatus(`Berhasil memproses ${recs.length} baris.`);
      }catch(e){ setStatus("Gagal memproses CSV: "+e.message); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid gap-2 text-sm">
      <div className="flex items-center gap-2">
        <input id={inputId} type="file" accept=".csv" className="hidden" onChange={(e)=> e.target.files && onFile(e.target.files[0]) }/>
        <Button onClick={()=>document.getElementById(inputId).click()}>Import CSV</Button>
        <Button
          variant="outline"
          onClick={()=>{
            const sample = [
              "id,name,desc,stock,image,price",
              "bayam-merah,Bayam Merah,Panen pagi 250g,30,https://images.unsplash.com/photo-1543339308-43f2a5a7c8e8,5000",
              "pakcoy,Pakcoy Hijau,Segar untuk tumisan,40,,6000",
              "paprika-merah,Paprika Merah,Manis & renyah,25,https://images.unsplash.com/photo-1546471180-3ad1c6925f59,7000"
            ].join("\n");
            const blob = new Blob([sample], {type:"text/csv"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "template_sayur5.csv"; a.click(); URL.revokeObjectURL(url);
          }}
        >
          Unduh Template
        </Button>
        <Button
          variant="secondary"
          onClick={()=>{
            setProducts(products.map(p => ({
              ...p,
              image: p.image && String(p.image).trim() ? p.image : DEFAULT_IMG
            })));
            setStatus("Foto default diisi untuk produk tanpa gambar.");
          }}
        >
          Isi Foto Default
        </Button>
      </div>
      {status && <div className="text-slate-600">{status}</div>}
      <div className="text-xs text-slate-500">
        Format: <code>id,name,desc,stock,image,price</code>. Kolom <code>image</code> boleh kosong (akan pakai foto default) dan <code>price</code> opsional.
      </div>
    </div>
  );
}

/** CSV Export */
function downloadCSV(orders){
  const header = ["id","tanggal","nama","telepon","alamat","payment","subtotal","ongkir","total","status","items"];
  const rows = orders.map(o=>[
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
    o.items.map(it=>`${it.name} x${it.qty}`).join("; ")
  ]);
  const csv = [header.join(","), ...rows.map(r=>r.join(","))].join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `sayur5_orders_${todayKey()}.csv`; a.click(); URL.revokeObjectURL(url);
}

/** CartSheet */
function CartSheet({
  items,
  totalQty,
  subtotal,
  shippingFee,
  grandTotal,
  add,
  sub,
  clearCart,
  setOpenCheckout,
  freeOngkirMin,
  ongkir,
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="rounded-2xl" variant="default">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Keranjang
          {totalQty > 0 && (
            <span className="ml-2 text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
              {totalQty}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Keranjang Belanja</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {items.length === 0 && (
            <div className="text-sm text-slate-500">
              Keranjang kosong. Yuk pilih sayur dulu.
            </div>
          )}

          {items.map((it) => (
            <Card key={it.id} className="rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">
                  🥬
                </div>

                <div className="flex-1">
                  <div className="font-medium leading-tight">{it.name}</div>
                  <div className="text-xs text-slate-500">
                    {toIDR(it.price)} / pack
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" className="rounded-full" onClick={() => sub(it.id)}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <div className="w-8 text-center font-semibold">{it.qty}</div>
                  <Button size="icon" className="rounded-full" onClick={() => add(it.id)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="w-20 text-right font-semibold">
                  {toIDR(it.price * it.qty)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 border-t pt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{toIDR(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ongkir</span>
            <span>{shippingFee === 0 ? "Gratis" : toIDR(shippingFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span>{toIDR(grandTotal)}</span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button className="flex-1 rounded-2xl" disabled={items.length === 0} onClick={() => setOpenCheckout(true)}>
            <CreditCard className="w-4 h-4 mr-2" />
            Checkout
          </Button>
          <Button variant="ghost" className="rounded-2xl" onClick={clearCart} disabled={items.length === 0}>
            <X className="w-4 h-4 mr-2" />
            Kosongkan
          </Button>
        </div>

        <div className="mt-8 p-3 rounded-xl bg-slate-50 text-xs">
          <div className="font-semibold mb-2">Ongkir Ditentukan Admin</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between">
              <span>Min Gratis Ongkir</span>
              <span className="font-medium">{toIDR(freeOngkirMin)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Biaya Ongkir</span>
              <span className="font-medium">{toIDR(ongkir)}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Checkout form */
function CheckoutForm({ items, subtotal, shippingFee, grandTotal, onSubmit, storePhone }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    payment: "transfer",
    note: "",
  });

  const validPhone = isValidIndoPhone(form.phone);
  const canSubmit = form.name && validPhone && form.address && items.length > 0;

  const orderText = useMemo(() => {
    const lines = [
      `Pesanan Sayur5`,
      `Nama: ${form.name}`,
      `Telp: ${form.phone}`,
      `Alamat: ${form.address}`,
      `Metode Bayar: ${form.payment}`,
      `Rincian:`,
      ...items.map((it) => `- ${it.name} x${it.qty} @${toIDR(it.price)} = ${toIDR(it.price * it.qty)}`),
      `Subtotal: ${toIDR(subtotal)}`,
      `Ongkir: ${shippingFee === 0 ? "Gratis" : toIDR(shippingFee)}`,
      `Total: ${toIDR(grandTotal)}`,
      form.note ? `Catatan: ${form.note}` : "",
    ].filter(Boolean);
    return lines.join("%0A");
  }, [form, items, subtotal, shippingFee, grandTotal]);

  const waLink = `https://wa.me/${toWA(storePhone)}?text=${orderText}`;

  return (
    <div className="grid gap-3">
      <div className="grid md:grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          <span>Nama Penerima</span>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama lengkap"
            className="rounded-xl"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>No. HP</span>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="08xxxxxxxxxx"
            className={`rounded-xl ${form.phone && !validPhone ? "border-red-500" : ""}`}
          />
          {form.phone && !validPhone && (
            <div className="text-xs text-red-600 mt-1">Nomor HP tidak valid. Contoh: 0812xxxxxxx</div>
          )}
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span>Alamat Lengkap</span>
        <Textarea
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Jalan, RT/RW, Kel/Desa, Kecamatan, Kota"
          className="rounded-xl"
        />
      </label>

      <div className="grid md:grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          <span>Metode Pembayaran</span>
          <select
            className="border rounded-xl h-10 px-3"
            value={form.payment}
            onChange={(e) => setForm({ ...form, payment: e.target.value })}
          >
            <option value="transfer">Transfer Bank</option>
            <option value="ewallet">E-Wallet (Dana/OVO/GoPay)</option>
            <option value="cod">COD (Cash on Delivery)</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span>Catatan</span>
          <Input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Contoh: tanpa cabe, kirim siang"
            className="rounded-xl"
          />
        </label>
      </div>

      <div className="mt-2 border rounded-2xl p-3 bg-slate-50">
        <div className="font-semibold mb-2">Ringkasan</div>
        <div className="space-y-1 text-sm">
          {items.map((it) => (
            <div key={it.id} className="flex justify-between">
              <span>{it.name} x{it.qty}</span>
              <span>{toIDR(it.price * it.qty)}</span>
            </div>
          ))}
          <div className="flex justify-between mt-2">
            <span>Subtotal</span>
            <span>{toIDR(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ongkir</span>
            <span>{shippingFee === 0 ? "Gratis" : toIDR(shippingFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span>{toIDR(grandTotal)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-1">
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center justify-center rounded-2xl h-11 px-4 font-medium bg-emerald-600 text-white ${
            !canSubmit ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          Pesan via WhatsApp
        </a>
        <Button
          variant="outline"
          className="rounded-2xl h-11"
          disabled={!canSubmit}
          onClick={() => onSubmit(form)}
        >
          Simpan Pesanan
        </Button>
      </div>

      <div className="text-xs text-slate-500">
        *Tombol WhatsApp akan membuka chat dengan format pesanan otomatis.
      </div>
    </div>
  );
}
