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
import { isInsideAmbarawa, reverseGeocode } from "@/utils/geofence-ambarawa.js";




/* ===== Helpers ===== */
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
function CartButton({ totalQty, onOpen }) {
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>
          <div className="text-sm text-slate-500">Item: {totalQty}</div>
        </div>

        <h3 className="text-lg font-semibold mb-3">Keranjang Belanja</h3>

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

        <div className="mt-6 border-t pt-4 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{toIDR(subtotal)}</span></div>
          <div className="flex justify-between"><span>Ongkir</span><span>{shippingFee === 0 ? "Gratis" : toIDR(shippingFee)}</span></div>
          <div className="flex justify-between font-bold text-base"><span>Total</span><span>{toIDR(grandTotal)}</span></div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button className="flex-1 rounded-2xl" disabled={list.length === 0}
            onClick={() => { onClose(); onOpenCheckout(); }}>
            <CreditCard className="w-4 h-4 mr-2" /> Checkout
          </Button>
          <Button variant="ghost" className="rounded-2xl" onClick={clearCart} disabled={list.length === 0}>
            <X className="w-4 h-4 mr-2" /> Kosongkan
          </Button>
        </div>

        <div className="mt-8 p-3 rounded-xl bg-slate-50 text-xs">
          <div className="font-semibold mb-2">Ongkir Ditentukan Admin</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between"><span>Min Gratis Ongkir</span><span className="font-medium">{toIDR(freeOngkirMin)}</span></div>
            <div className="flex items-center justify-between"><span>Biaya Ongkir</span><span className="font-medium">{toIDR(ongkir)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}


function CheckoutForm({ items, subtotal, shippingFee, grandTotal, onSubmit, storePhone }) {
  // === state lama ===
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    payment: "cod",     // kamu tadinya "transfer", tapi di UI pilihan yg aktif "cod"
    note: "",
  });
  const validPhone = isValidIndoPhone(form.phone);

  // === state baru (share loc + batas layanan) ===
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [addrMeta, setAddrMeta] = useState(null); // { lat, lng, allowed, geocode?, ... }

  const mapsUrl = useMemo(() => {
  const fmt = (n) => Number(n).toFixed(6); // 6 desimal cukup (~10 cm)
  if (addrMeta?.lat && addrMeta?.lng) {
    const { lat, lng } = addrMeta;
    // 'loc:lat,lng' memaksa Google Maps menganggap ini titik koordinat, bukan teks
    return `https://www.google.com/maps/search/?api=1&query=loc:${fmt(lat)},${fmt(lng)}`;
    // Alternatif yang juga oke:
    // return `https://maps.google.com/?q=${fmt(lat)},${fmt(lng)}`;
  }
  const q = addrMeta?.geocode?.display_name || form.address || "";
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
}, [addrMeta, form.address]);


  // util kecil di dalam CheckoutForm.jsx
function getPrecisePosition({ timeoutMs = 8000, targetAcc = 40 } = {}) {
  return new Promise((resolve, reject) => {
    let done = false;
    const options = { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs };

    // fallback jika watchPosition tidak tersedia
    if (!navigator.geolocation?.watchPosition) {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
      return;
    }

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        options
      );
      navigator.geolocation.clearWatch(watchId);
    }, timeoutMs);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // ambil begitu akurasinya sudah cukup baik
        if (done) return;
        const acc = pos.coords.accuracy || 9999;
        if (acc <= targetAcc) {
          done = true;
          clearTimeout(timer);
          navigator.geolocation.clearWatch(watchId);
          resolve(pos);
        }
      },
      (err) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        navigator.geolocation.clearWatch(watchId);
        reject(err);
      },
      options
    );
  });
}

  // === Share Location ===
  async function useMyLocation() {
    setLocError("");
    setLocating(true);
    try {
       const posRaw = await getPrecisePosition({ timeoutMs: 8000, targetAcc: 40 });
       const pos = {
         lat: posRaw.coords.latitude,
         lng: posRaw.coords.longitude,
         accuracy: posRaw.coords.accuracy,
         heading: posRaw.coords.heading,
         speed: posRaw.coords.speed,
       }; 
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });

      const allowed = isInsideAmbarawa(pos.lat, pos.lng);
      let addressText = "";
      const meta = { ...pos, allowed, source: "geolocation" };

      try {
        const g = await reverseGeocode(pos.lat, pos.lng);
        addressText = g.display_name || "";
        meta.geocode = g;
      } catch {
        // optional: biarkan kosong jika gagal reverse geocode
      }

      // cache 15 menit
      writeJSON("sayur5.locCache", { ts: Date.now(), text: addressText, meta });

      setForm(f => ({ ...f, address: addressText || f.address }));
      setAddrMeta(meta);

      if (!allowed) {
        setLocError("Maaf, alamat di luar Kecamatan Ambarawa. Pesanan tidak bisa dikonfirmasi.");
      }
    } catch (e) {
      setLocError("Gagal ambil lokasi. Aktifkan GPS/izin lokasi lalu coba lagi.");
    } finally {
      setLocating(false);
    }
  }

  // === teks pesanan & link WA ===
  const orderText = useMemo(() => {
  const lines = [
    `Pesanan Sayur5`,
    `Nama: ${form.name}`,
    `Telp: ${form.phone}`,
    `Alamat: ${form.address}`,
    mapsUrl ? `Pin Lokasi: ${mapsUrl}` : "",   // ⟵ baris link Maps
    `Metode Bayar: ${form.payment.toUpperCase()}`,
    `Rincian:`,
    ...items.map((it) => `- ${it.name} x${it.qty} @${toIDR(it.price)} = ${toIDR(it.price * it.qty)}`),
    `Subtotal: ${toIDR(subtotal)}`,
    `Ongkir: ${shippingFee === 0 ? "Gratis" : toIDR(shippingFee)}`,
    `Total: ${toIDR(grandTotal)}`,
    form.note ? `Catatan: ${form.note}` : "",
  ].filter(Boolean);

  return encodeURIComponent(lines.join("\n")); // encode sekali di akhir
}, [form, items, subtotal, shippingFee, grandTotal, mapsUrl]);


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

      {/* Alamat + tombol share-loc */}
      <label className="grid gap-1 text-sm">
        <div className="flex items-center justify-between">
          <span>Alamat Lengkap</span>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center gap-1 text-emerald-700 hover:underline disabled:opacity-50"
          >
            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            Gunakan lokasi saya
          </button>
        </div>

        <Textarea
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Jalan, RT/RW, Kel/Desa, Kecamatan, Kota"
          className={`rounded-xl ${form.address && !inServiceArea ? "border-red-500" : ""}`}
        />

        {typeof addrMeta?.accuracy === "number" && (
          <div className="text-[11px] text-slate-500 mt-1">
            Akurasi lokasi ≈ {Math.round(addrMeta.accuracy)} m
          </div>
        )}

        {!!locError && <div className="text-xs text-red-600 mt-1">{locError}</div>}
        {form.address && !inServiceArea && (
          <div className="text-xs text-red-600 mt-1">
            Maaf, saat ini kami hanya melayani pengiriman di <b>Kecamatan Ambarawa</b>.
          </div>
        )}
      </label>

      <div className="grid md:grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          <span>Metode Pembayaran</span>
          <select
            className="border rounded-xl h-10 px-3"
            value={form.payment}
            onChange={(e) => setForm({ ...form, payment: e.target.value })}
          >
            <option value="cod">COD (Cash on Delivery)</option>
            {/* tambahkan opsi lain kalau perlu */}
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
              <span>
                {it.name} x{it.qty}
              </span>
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

      {/* Tombol WA mengikuti validasi layanan */}
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
        *Tombol WhatsApp akan membuka chat dengan format pesanan otomatis. Layanan saat ini khusus Kecamatan Ambarawa.
      </div>
    </div>
  );
}

