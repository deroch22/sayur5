import React, { useEffect, useMemo, useState,useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Leaf, Search, Truck, BadgePercent, Phone, MapPin,
  CreditCard, X, Plus, Minus, ArrowLeft, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { imgSrc } from "@/utils/img";
import { readJSON, writeJSON, readStr, writeStr } from "@/utils/safe";
import { CreditCard, ArrowLeft, X, Plus, Minus } from "lucide-react";






/* ===== Helpers ===== */
// === ONGKIR dari titik toko (tanpa GPS & tanpa map) =========================
const STORE = { lat: -7.259527, lng: 110.403026 };   // titik toko kamu
const SERVICE_RADIUS_KM = 7;                          // radius layanan (atur suka2)

// Bias geocode ke area Ambarawa (Nominatim)
const AMBARAWA_BBOX = { left: 110.30, right: 110.50, top: -7.23, bottom: -7.31 };

// Opsi kelurahan (boleh tambah)
const KEL_OPTIONS = ["Lodoyong", "Panjang", "Baran", "Tambakboyo", "Ngampin", "Kupang", "Bejalen"];

// Util math jarak
function toRad(d){ return (d * Math.PI) / 180; }
function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Izinkan input "lat, lng" langsung (opsional)
function parseLatLng(s) {
  const m = String(s).trim().match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = +m[1], lng = +m[2];
  return (Number.isFinite(lat) && Number.isFinite(lng)) ? { lat, lng } : null;
}

// Rapikan alamat agar geocode lebih akurat
function normalizeAddress(raw) {
  let s = String(raw || "");
  s = s.replace(/\b(rt|rw)\s*[\.:]?\s*\d+(?:\s*\/\s*\d+)?/gi, ""); // hapus RT/RW
  s = s.replace(/\bKel\.\b/gi, "Kelurahan ").replace(/\bKec\.\b/gi, "Kecamatan ").replace(/\bKab\.\b/gi, "Kabupaten ");
  return s.replace(/\s{2,}/g, " ").trim();
}

// Geocode alamat → lat/lng (Nominatim; gratis, untuk trafik kecil)
async function geocodeAddressOSM(q) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format","jsonv2");
  url.searchParams.set("limit","1");
  url.searchParams.set("countrycodes","id");
  url.searchParams.set("addressdetails","1");
  url.searchParams.set("accept-language","id");
  url.searchParams.set("bounded","1");
  url.searchParams.set("viewbox", `${AMBARAWA_BBOX.left},${AMBARAWA_BBOX.top},${AMBARAWA_BBOX.right},${AMBARAWA_BBOX.bottom}`);
  url.searchParams.set("q", q);

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const arr = await res.json();
  if (!Array.isArray(arr) || !arr[0]) return null;
  return { lat: +arr[0].lat, lng: +arr[0].lon, display_name: arr[0].display_name };
}

// Aturan ongkir
const SHIPPING_RULES = {
  FREE_MIN: 30000, // gratis ongkir ≥ ini
  BASE: 5000,      // biaya dasar (termasuk jarak awal)
  INCLUDED_KM: 2,  // km awal yang termasuk BASE
  PER_KM: 2000,    // biaya per km setelah INCLUDED_KM
  CAP: 20000,      // plafon ongkir
};

function calcOngkirFromStore(subtotal, lat, lng) {
  if (subtotal >= SHIPPING_RULES.FREE_MIN) return 0;
  if (!(Number.isFinite(lat) && Number.isFinite(lng))) return null;
  let d = haversineKm(STORE.lat, STORE.lng, lat, lng);
  d = Math.ceil(d * 10) / 10;             // bulatkan 0.1 km
  const extra = Math.max(0, d - SHIPPING_RULES.INCLUDED_KM);
  const fee = SHIPPING_RULES.BASE + Math.ceil(extra) * SHIPPING_RULES.PER_KM;
  return Math.min(fee, SHIPPING_RULES.CAP);
}

const to6 = (n) => Number(n).toFixed(6);


const DEFAULT_BASE_PRICE = 5000;

const toIDR = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
    .format(Number.isFinite(n) ? n : 0);

const DEFAULT_IMG = "img/default.jpg";
const STARTER_PRODUCTS = [
  { id: "bayam", name: "Bayam Fresh", desc: "Dipetik pagi, siap masak bening.", stock: 50 },
  { id: "kangkung", name: "Kangkung", desc: "Crispy untuk cah bawang.", stock: 60 },
  { id: "wortel", name: "Wortel", desc: "Manis & renyah, cocok sop.", stock: 80 },
  { id: "kol", name: "Kol", desc: "Segar untuk capcay.", stock: 40 },
  { id: "tomat", name: "Tomat", desc: "Merah ranum, sambal mantap.", stock: 70 },
  { id: "buncis", name: "Buncis", desc: "Muda & empuk.", stock: 55 },
];

const computeShippingFee = (subtotal, freeMin, fee) =>
  subtotal === 0 || subtotal >= freeMin ? 0 : fee;

const priceOf = (p, basePrice) => (typeof p?.price === "number" && p.price > 0 ? p.price : basePrice);

const toWA = (msisdn) => {
  let d = String(msisdn || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  else if (d.startsWith("+")) d = d.slice(1);
  return d;
};
const isValidIndoPhone = (s) => {
  const d = String(s || "").replace(/\D/g, "");
  return /^0?8\d{8,12}$/.test(d) || /^62?8\d{8,12}$/.test(d);
};

/* ===== Component ===== */
export default function SayurSerbaLima() {
 // UI state
 const [query, setQuery] = useState("");
 // baca cart aman dari storage (fallback: objek kosong)
  const [cart, setCart] = useState(() => readJSON("sayur5.cart", {}));
  const [searchOpen, setSearchOpen] = useState(false);
  const [openCheckout, setOpenCheckout] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const openCart  = () => setCartOpen(true);
  const closeCart = () => setCartOpen(false);
// handler aman (dibagikan ke child)
const openCheckoutHandler  = () => setOpenCheckout(true);
const closeCheckoutHandler = () => setOpenCheckout(false);
// ==== Search helpers ====
const searchRef = useRef(null);
const focusCatalog = (id) => {
const el = document.getElementById(`prod-${id}`);
const header = document.querySelector("header");
const offset = (header?.getBoundingClientRect().height ?? 72) + 8;

  if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    el.classList.add("ring-2", "ring-emerald-500", "rounded-xl");
    setTimeout(() => el.classList.remove("ring-2", "ring-emerald-500", "rounded-xl"), 1200);
  } else {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  }
};

// submit search: loncat ke hasil pertama
const handleSearchSubmit = (e) => {
  e.preventDefault();
  searchRef.current?.blur();       // tutup keyboard
  const first = filtered[0];
  focusCatalog(first?.id);
};

  // Settings (persist)
  const [freeOngkirMin, setFreeOngkirMin] = useState(() => {
  const v = parseInt(readStr("sayur5_freeMin", "30000"), 10);
  return Number.isFinite(v) ? v : 30000;
  });
  const [ongkir, setOngkir] = useState(() => {
    const v = parseInt(readStr("sayur5_ongkir", "10000"), 10);
    return Number.isFinite(v) ? v : 10000;
  });
  const [basePrice, setBasePrice] = useState(() => {
    const v = parseInt(readStr("sayur5_price", String(DEFAULT_BASE_PRICE)), 10);
    return Number.isFinite(v) ? v : DEFAULT_BASE_PRICE;
  });
  const [storePhone, setStorePhone] = useState(() =>
    readStr("sayur5_storePhone", "081233115194")
  );

  useEffect(() => { writeJSON("sayur5.cart", cart); }, [cart]);
  useEffect(() => { writeStr("sayur5_freeMin", String(freeOngkirMin)); }, [freeOngkirMin]);
  useEffect(() => { writeStr("sayur5_ongkir", String(ongkir)); }, [ongkir]);
  useEffect(() => { writeStr("sayur5_price", String(basePrice)); }, [basePrice]);
  useEffect(() => { writeStr("sayur5_storePhone", storePhone); }, [storePhone]);

  // Data (persist)
 const [products, setProducts] = useState(() =>
  readJSON("sayur5_products", STARTER_PRODUCTS)
);

useEffect(() => {
  const url = import.meta.env.VITE_API_URL || "https://sayur5-bl6.pages.dev/api/products";
  fetch(url, { mode: "cors" })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => {
      if (Array.isArray(data) && data.length) {
        setProducts(data); // timpa data default / localStorage
      }
    })
    .catch(() => {
      // fallback: biarkan pakai localStorage / starter catalog
    });
}, []);
  
 const [orders, setOrders] = useState(() => readJSON("sayur5_orders", []));
  
  // Sanitize cart when products change
  useEffect(() => {
    setCart((c) => {
      const valid = new Set(products.map((p) => p.id));
      const next = { ...c };
      for (const id of Object.keys(next)) if (!valid.has(id)) delete next[id];
      return next;
    });
  }, [products]);

  // Derived
  const filtered = useMemo(() => {
    const q = (query || "").toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    );
  }, [query, products]);

  // daftar item di keranjang (aman)
  const items = useMemo(() => {
    const entries = Object.entries(cart ?? {});
    if (!Array.isArray(products) || entries.length === 0) return [];
  
    return entries
      .map(([id, q]) => {
        const qty = Number.parseInt(q, 10) || 0;
        const p = products.find(x => x.id === id);
        const price = p ? priceOf(p, basePrice) : basePrice;
        return p
          ? { ...p, id, qty, price }
          : { id, name: "(produk tidak tersedia)", qty, price };
      })
      .filter(it => it.qty > 0);
  }, [cart, products, basePrice]);


  const subtotal = useMemo(() => items.reduce((s, it) => s + it.qty * it.price, 0), [items]);
  const shippingFee = useMemo(() => computeShippingFee(subtotal, freeOngkirMin, ongkir), [subtotal, freeOngkirMin, ongkir]);
  const grandTotal = subtotal + shippingFee;
  const totalQty = useMemo(() => items.reduce((s, it) => s + it.qty, 0), [items]);

  // Cart ops
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

  // Checkout handler
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

  // UI
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white text-slate-800">
     <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b">
  <div className="mx-auto max-w-6xl px-4 py-3">
    {/* Mobile: 2 baris • Desktop: 1 baris */}
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 md:justify-between">

      {/* Baris 1 (mobile): Brand + Keranjang; di desktop hanya brand */}
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-2 rounded-2xl bg-emerald-100 text-emerald-700">
            <Leaf className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <div className="font-bold">Sayur5</div>
            <div className="text-xs text-slate-500 -mt-0.5">
              Serba {toIDR(basePrice)} — Fresh Setiap Hari
            </div>
          </div>
        </div>

        {/* Tombol Keranjang: tampil di mobile, disembunyikan di desktop */}
        <div className="md:hidden">
          <CartButton totalQty={totalQty} onOpen={() => setCartOpen(true)} />
        </div>
      </div>

      {/* Baris 2 (mobile): Search full width; di desktop jadi di tengah dan flex-1 */}
      <form onSubmit={handleSearchSubmit} className="w-full md:flex-1">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            ref={searchRef}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari bayam, kangkung, wortel…"
            className="pl-9 rounded-2xl w-full"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchSubmit(e);
              }
            }}
          />
        </div>
      </form>

      {/* Tombol Keranjang versi desktop */}
      <div className="hidden md:block">
        <CartButton totalQty={totalQty} onOpen={() => setCartOpen(true)} />
      </div>
    </div>

    {/* Quick suggestions (opsional, hanya mobile) */}
    {query && (
      <ul className="mt-2 md:hidden divide-y rounded-xl border bg-white overflow-hidden">
        {filtered.slice(0, 6).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="w-full text-left py-2 px-3"
              onClick={() => {
                searchRef.current?.blur();
                focusCatalog(p.id);   // pastikan helper ini ada
              }}
            >
              {p.name}
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-2 px-3 text-sm text-slate-500">Tidak ada hasil.</li>
        )}
      </ul>
    )}
  </div>
</header>

      
     {/* Topbar */}
  <div className="mx-auto max-w-6xl px-4 py-3">
    <div className="flex items-center justify-between">
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
    </div>   
  </div> 


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
                  <motion.div key={p.id} whileHover={{ scale: 1.04 }} className="p-4 rounded-2xl bg-white shadow-sm border flex flex-col items-center">
                  <img
                      src={imgSrc(p.image)}
                      alt={p.name}
                      className="h-28 w-28 object-cover rounded-xl"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        if (!e.currentTarget.dataset.fallback) {
                          e.currentTarget.dataset.fallback = "1";
                          e.currentTarget.src = imgSrc("");
                         }
                      }}
                    />
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
<section id="catalog" className="mx-auto max-w-6xl px-4 mt-10 mb-20">
  {/* Baris judul katalog */}
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-xl md:text-2xl font-bold">Katalog Hari Ini</h2>
    <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
      <Truck className="w-4 h-4" /> Estimasi kirim: 1–3 jam setelah pembayaran
    </div>
  </div>

  {/* Grid produk */}
  <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    <AnimatePresence>
      {filtered.map((p) => (
        <motion.div
          key={p.id}
          id={`prod-${p.id}`}           // untuk scroll dari search
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <Card className="rounded-2xl overflow-hidden group">
            <CardHeader className="p-0">
              <div className="h-28 bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                {/* pakai img yang sudah ada di kode kamu */}
                <img
                  src={imgSrc(p.image)}
                  alt={p.name}
                  className="h-28 w-28 object-cover rounded-xl"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    if (!e.currentTarget.dataset.fallback) {
                      e.currentTarget.dataset.fallback = "1";
                      e.currentTarget.src = imgSrc("");
                    }
                  }}
                />
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <CardTitle className="text-base font-semibold leading-tight">
                {p.name || p.id}
              </CardTitle>
            
              <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                {p.desc || "—"}
              </div>
            
              <div className="mt-3 flex items-center justify-between">
                <div className="font-extrabold">{toIDR(priceOf(p, basePrice))}</div>
                <div className="text-xs text-slate-500">Stok: {Number.isFinite(+p.stock) ? +p.stock : 20}</div>
              </div>
            
              <div className="mt-3 flex gap-2">
                <Button className="rounded-xl flex-1" onClick={() => add(p.id)}>Tambah</Button>
                {cart[p.id] ? (
                  <div className="flex items-center border rounded-xl overflow-hidden">
                    <Button size="icon" variant="ghost" onClick={() => sub(p.id)}><Minus className="w-4 h-4" /></Button>
                    <div className="px-2 w-8 text-center font-semibold">{cart[p.id]}</div>
                    <Button size="icon" variant="ghost" onClick={() => add(p.id)}><Plus className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <Button variant="outline" className="rounded-xl" onClick={() => add(p.id)} size="icon">
                    <Plus className="w-4 h-4" />
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

          <CartDrawer
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          items={items}
          totalQty={totalQty}
          subtotal={subtotal}
          shippingFee={shippingFee}
          grandTotal={grandTotal}
          add={add}
          sub={sub}
          clearCart={clearCart}
          onOpenCheckout={openCheckoutHandler}
          freeOngkirMin={freeOngkirMin}
          ongkir={ongkir}
        />


      {/* Checkout */}
     <Dialog open={openCheckout} onOpenChange={setOpenCheckout}>
  {/* p-0: biar wrapper scroll-nya full; rounded tetap */}
  <DialogContent className="sm:max-w-lg p-0 rounded-2xl">
    {/* AREA SCROLL */}
    <div className="max-h-[85dvh] overflow-y-auto overscroll-contain">
      {/* Header sticky supaya tombol Kembali selalu terlihat */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <DialogHeader className="flex items-center justify-between p-2">
          <Button variant="ghost" size="sm" onClick={closeCheckoutHandler}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>
      </div>

      {/* Konten form */}
      <div className="p-4">
        {items.length === 0 ? (
          <div className="text-sm text-slate-500">Keranjang kosong.</div>
        ) : (
          <CheckoutForm
            items={items}
            subtotal={subtotal}
            shippingFee={shippingFee}
            grandTotal={grandTotal}
            onSubmit={(payload) => {
              createOrder(payload);
              alert("Pesanan dicatat! Admin akan menghubungi via WhatsApp.");
              closeCheckoutHandler();
            }}
            storePhone={storePhone}
          />
        )}
      </div>
    </div>
  </DialogContent>
</Dialog>
    </div>
  );
}

/* ===== Subcomponents ===== */
function CartDrawer({
  open,
  onClose,
  items,
  totalQty,
  subtotal,
  shippingFee,
  grandTotal,
  add,
  sub,
  clearCart,
  onOpenCheckout,
  freeOngkirMin,
  ongkir,
}) {
  if (!open) return null;
  const list = Array.isArray(items) ? items : [];

  return (
    <div className="fixed inset-0 z-[100]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* panel kanan */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l p-4 overflow-y-auto">
        {/* header */}
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>
          <div className="text-sm text-slate-500">Item: {totalQty}</div>
        </div>

        <h3 className="text-lg font-semibold mb-3">Keranjang Belanja</h3>

        {/* list item */}
        <div className="space-y-4">
          {list.length === 0 && (
            <div className="text-sm text-slate-500">Keranjang kosong. Yuk pilih sayur dulu.</div>
          )}

          {list.map((it) => (
            <Card key={it.id} className="rounded-2xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">🥬</div>
                <div className="flex-1">
                  <div className="font-medium leading-tight">{it.name}</div>
                  <div className="text-xs text-slate-500">{toIDR(it.price)} / pack</div>
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
                <div className="w-20 text-right font-semibold">{toIDR(it.price * it.qty)}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ringkasan */}
        <div className="mt-6 border-t pt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span><span>{toIDR(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ongkir</span><span>{shippingFee === 0 ? "Gratis" : toIDR(shippingFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-base">
            <span>Total</span><span>{toIDR(grandTotal)}</span>
          </div>
        </div>

        {/* aksi */}
        <div className="mt-4 flex gap-2">
          <Button
            className="flex-1 rounded-2xl"
            disabled={list.length === 0}
            onClick={() => { onClose(); onOpenCheckout(); }}
          >
            <CreditCard className="w-4 h-4 mr-2" /> Checkout
          </Button>
          <Button variant="ghost" className="rounded-2xl" onClick={clearCart} disabled={list.length === 0}>
            <X className="w-4 h-4 mr-2" /> Kosongkan
          </Button>
        </div>

        {/* info aturan ongkir */}
        <div className="mt-8 p-3 rounded-xl bg-slate-50 text-xs">
          <div className="font-semibold mb-2">Ongkir Ditentukan Admin</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between">
              <span>Min Gratis Ongkir</span><span className="font-medium">{toIDR(freeOngkirMin)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Biaya Ongkir</span><span className="font-medium">{toIDR(ongkir)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



function CartButton({ totalQty = 0, onOpen }) {
  return (
    <Button className="rounded-2xl" variant="default" onClick={onOpen}>
      <ShoppingCart className="w-4 h-4 mr-2" />
      Keranjang
      {totalQty > 0 && (
        <span className="ml-2 text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
          {totalQty}
        </span>
      )}
    </Button>
  );
}


function CheckoutForm({ items, subtotal, shippingFee, grandTotal, onSubmit, storePhone }) {
  // === state dasar ===
  const [form, setForm] = useState({ name: "", phone: "", address: "", payment: "cod", note: "" });
  const validPhone = isValidIndoPhone(form.phone);

  // Alamat terstruktur
  const [addrDetail, setAddrDetail] = useState("");   // Jalan/gang/nomor rumah (boleh tulis RT/RW)
  const [kelurahan, setKelurahan] = useState("");     // pilih/ketik kelurahan
  const [addrMeta, setAddrMeta] = useState(null);     // { lat, lng, allowed, geocode?, source }
  const [locError, setLocError] = useState("");

  // Susun form.address (gabungan) untuk display & WA
  useEffect(() => {
    const parts = [];
    if (addrDetail) parts.push(addrDetail);
    if (kelurahan) parts.push(`Kel. ${kelurahan}`);
    parts.push("Kecamatan Ambarawa", "Kabupaten Semarang", "Jawa Tengah", "Indonesia");
    setForm(f => ({ ...f, address: parts.join(", ") }));
  }, [addrDetail, kelurahan]);

  // Prefill dari cache (15 menit)
  useEffect(() => {
    const cached = readJSON("sayur5.locCache", null);
    if (cached && Date.now() - cached.ts < 15 * 60 * 1000) {
      setForm(f => ({ ...f, address: cached.text || f.address }));
      setAddrMeta(cached.meta || null);
    }
  }, []);

  // Auto-geocode TANPA GPS (debounce)
  useEffect(() => {
    setLocError("");
    const detail = (addrDetail || "").trim();
    const kel = (kelurahan || "").trim();
    if (!detail && !kel) return;

    // A) Jika user ketik "lat,lng" di detail — langsung pakai
    const manual = parseLatLng(detail);
    if (manual) {
      const d = haversineKm(STORE.lat, STORE.lng, manual.lat, manual.lng);
      const meta = { ...manual, source: "manual-latlng", allowed: d <= SERVICE_RADIUS_KM };
      setAddrMeta(meta);
      writeJSON("sayur5.locCache", { ts: Date.now(), text: form.address, meta });
      return;
    }

    // B) Geocode alamat gabungan (debounce)
    const id = setTimeout(async () => {
      const niceDetail = normalizeAddress(detail);
      const query = [
        niceDetail,
        kel ? `Kelurahan ${kel}` : "",
        "Kecamatan Ambarawa",
        "Kabupaten Semarang",
        "Jawa Tengah",
        "Indonesia",
      ].filter(Boolean).join(", ");

      // Hindari spam geocode kalau terlalu pendek
      if (query.replace(/[, ]/g, "").length < 12) return;

      try {
        const g = await geocodeAddressOSM(query);
        if (!g) return;
        const d = haversineKm(STORE.lat, STORE.lng, g.lat, g.lng);
        const meta = { lat: g.lat, lng: g.lng, source: "geocode", geocode: g, allowed: d <= SERVICE_RADIUS_KM };
        setAddrMeta(meta);
        writeJSON("sayur5.locCache", { ts: Date.now(), text: g.display_name || form.address, meta });
        if (!meta.allowed) setLocError("Maaf, titik alamat di luar area layanan.");
      } catch {
        setLocError("Gagal membaca alamat. Coba perjelas: nama jalan + kelurahan.");
      }
    }, 700);

    return () => clearTimeout(id);
    // pakai addrDetail/kelurahan sebagai trigger; form.address disusun otomatis
  }, [addrDetail, kelurahan]);

  // Derived
  const safeItems = Array.isArray(items) ? items : [];

  const distKm = useMemo(() => {
    if (!addrMeta?.lat || !addrMeta?.lng) return null;
    return haversineKm(STORE.lat, STORE.lng, addrMeta.lat, addrMeta.lng);
  }, [addrMeta]);

  const estShipping = useMemo(() => {
    const v = calcOngkirFromStore(subtotal, addrMeta?.lat, addrMeta?.lng);
    return v == null ? shippingFee : v;   // sementara pakai ongkir lama jika belum ada titik
  }, [subtotal, addrMeta, shippingFee]);

  const localTotal = useMemo(() => subtotal + estShipping, [subtotal, estShipping]);

  const inServiceArea = addrMeta?.allowed === true || /ambarawa/i.test(form.address || "");
  const canSubmit = Boolean(form.name && validPhone && form.address && safeItems.length > 0 && inServiceArea);

  // Link Maps
  const { mapsPinUrl, mapsNavUrl } = useMemo(() => {
    if (addrMeta?.lat && addrMeta?.lng) {
      const lat = to6(addrMeta.lat), lng = to6(addrMeta.lng);
      return {
        mapsPinUrl: `https://maps.google.com/?q=${lat},${lng}`,
        mapsNavUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      };
    }
    return { mapsPinUrl: "", mapsNavUrl: "" };
  }, [addrMeta]);

  // Teks WA
  const orderText = useMemo(() => {
    const lines = [
      `Pesanan Sayur5`,
      `Nama: ${form.name}`,
      `Telp: ${form.phone}`,
      mapsPinUrl ? `Pin Lokasi (klik): ${mapsPinUrl}` : "",
      mapsNavUrl ? `Navigasi: ${mapsNavUrl}` : "",
      `Alamat: ${form.address}`,
      typeof distKm === "number" ? `Jarak ≈ ${distKm.toFixed(1)} km` : "",
      `Metode Bayar: ${form.payment.toUpperCase()}`,
      `Rincian:`,
      ...safeItems.map((it) => `- ${it.name} x${it.qty} @${toIDR(it.price)} = ${toIDR(it.price * it.qty)}`),
      `Subtotal: ${toIDR(subtotal)}`,
      `Ongkir (estimasi): ${estShipping === 0 ? "Gratis" : toIDR(estShipping)}`,
      `Total (estimasi): ${toIDR(localTotal)}`,
      form.note ? `Catatan: ${form.note}` : "",
    ].filter(Boolean);
    return encodeURIComponent(lines.join("\n"));
  }, [form, safeItems, subtotal, estShipping, localTotal, mapsPinUrl, mapsNavUrl, distKm]);

  const waLink = `https://wa.me/${toWA(storePhone)}?text=${orderText}`;

  // === UI ===
  return (
    <div className="grid gap-3">
      <div className="grid md:grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          <span>Nama Penerima</span>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" className="rounded-xl" />
        </label>

        <label className="grid gap-1 text-sm">
          <span>No. HP</span>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="08xxxxxxxxxx"
            className={`rounded-xl ${form.phone && !validPhone ? "border-red-500" : ""}`}
          />
          {form.phone && !validPhone && <div className="text-xs text-red-600 mt-1">Nomor HP tidak valid. Contoh: 0812xxxxxxx</div>}
        </label>
      </div>

      {/* Alamat terstruktur */}
      <label className="grid gap-1 text-sm">
        <span>Detail Alamat</span>
        <Textarea
          value={addrDetail}
          onChange={(e) => setAddrDetail(e.target.value)}
          placeholder="Jalan, gang, nomor rumah (boleh tulis 'lat,lng' dari Google Maps)"
          className="rounded-xl"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="grid gap-1 text-sm">
          <span>Kelurahan</span>
          <input
            list="kel-suggestions"
            className="border rounded-xl h-10 px-3"
            value={kelurahan}
            onChange={(e) => setKelurahan(e.target.value)}
            placeholder="cth: Lodoyong"
          />
          <datalist id="kel-suggestions">
            {KEL_OPTIONS.map(k => <option value={k} key={k} />)}
          </datalist>
        </label>

        <label className="grid gap-1 text-sm">
          <span>Kecamatan</span>
          <Input className="rounded-xl bg-slate-50" value="Ambarawa" readOnly />
        </label>

        <label className="grid gap-1 text-sm">
          <span>Kabupaten</span>
          <Input className="rounded-xl bg-slate-50" value="Semarang" readOnly />
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span>Provinsi</span>
        <Input className="rounded-xl bg-slate-50" value="Jawa Tengah" readOnly />
      </label>

      {/* Info geocode/layanan */}
      {!!locError && <div className="text-xs text-red-600 mt-1">{locError}</div>}
      {addrMeta?.lat && addrMeta?.lng && typeof distKm === "number" && (
        <div className="text-[11px] text-slate-600">Perkiraan jarak dari toko: ≈ {distKm.toFixed(1)} km</div>
      )}
      {form.address && !inServiceArea && (
        <div className="text-xs text-red-600">Maaf, alamat di luar area layanan.</div>
      )}

      {/* Ringkasan */}
      <div className="mt-2 border rounded-2xl p-3 bg-slate-50">
        <div className="font-semibold mb-2">Ringkasan</div>
        <div className="space-y-1 text-sm">
          {safeItems.map((it) => (
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
            <span>Ongkir{typeof distKm === "number" ? ` (≈ ${distKm.toFixed(1)} km)` : ""}</span>
            <span>{estShipping === 0 ? "Gratis" : toIDR(estShipping)}</span>
          </div>
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span>{toIDR(localTotal)}</span>
          </div>
        </div>
      </div>

      {/* Tombol WA */}
      <div className="flex flex-col sm:flex-row gap-2 mt-1">
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!canSubmit}
          className={`inline-flex items-center justify-center rounded-2xl h-11 px-4 font-medium bg-emerald-600 text-white ${!canSubmit ? "opacity-50 pointer-events-none" : ""}`}
          onClick={onSubmit}
        >
          Pesan via WhatsApp
        </a>
      </div>

      <div className="text-xs text-slate-500">
        *Tombol WhatsApp akan membuka chat dengan format pesanan otomatis. Layanan saat ini khusus area Ambarawa.
      </div>
    </div>
  );
}

