// src/components/MapPicker.jsx
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import { LocateFixed, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Perbaiki icon Leaflet (Vite)
import iconUrl from "leaflet/dist/images/marker-icon.png";
import icon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl: icon2xUrl, shadowUrl });

// ===== TITIK TOKO + RADIUS LAYANAN (SESUAI PUNYAMU) =====
const STORE = { lat: -7.259527, lng: 110.403026 };
const SERVICE_RADIUS_M = 7000; // 7 km (ubah kalau mau)

// Klik peta → update posisi
function ClickCatcher({ onPick }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onPick({ lat, lng }); // kirim plain object
    },
  });
  return null;
}

// Recenter tanpa remount
function CenterOnChange({ center, zoom = 16 }) {
  const map = useMap();
  useEffect(() => {
    if (center?.lat != null && center?.lng != null) {
      map.setView([center.lat, center.lng], zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapPicker({ initial, onCancel, onConfirm }) {
  // Guard initial
  const safeInit =
    initial && Number.isFinite(+initial.lat) && Number.isFinite(+initial.lng)
      ? { lat: +initial.lat, lng: +initial.lng }
      : STORE; // fallback ke toko biar gak blank

  const [pos, setPos] = useState(safeInit);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState(null);

  // Sinkron saat modal dibuka ulang
  useEffect(() => {
    setPos(safeInit);
    setAccuracy(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeInit.lat, safeInit.lng]);

  async function locateMe() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        setPos({ lat, lng });
        setAccuracy(typeof p.coords.accuracy === "number" ? p.coords.accuracy : null);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="p-3 border-b font-semibold">Pilih titik di peta</div>

        <div className="relative h-[60vh]">
          {/* Tombol koordinat saya */}
          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
            className="absolute right-3 top-3 z-[1000] inline-flex items-center gap-1 h-9 px-3 rounded-xl border bg-white/90 backdrop-blur hover:bg-white disabled:opacity-60"
            title="Koordinat saya"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
            <span className="text-sm">Koordinat saya</span>
          </button>

          <MapContainer
            center={[pos.lat, pos.lng]}    // ⬅️ [lat, lng] (bukan lng,lat)
            zoom={16}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            {/* marker toko + radius layanan */}
            <Marker position={[STORE.lat, STORE.lng]} />
            <Circle center={[STORE.lat, STORE.lng]} radius={SERVICE_RADIUS_M} pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.05 }} />

            <CenterOnChange center={pos} />

            <ClickCatcher onPick={(ll) => { setPos(ll); setAccuracy(null); }} />

            {/* Marker draggable untuk posisi user */}
            <Marker
              position={[pos.lat, pos.lng]} // ⬅️ [lat, lng]
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng();
                  setPos({ lat: ll.lat, lng: ll.lng }); // simpan plain object
                  setAccuracy(null);
                },
              }}
            />
            {/* Akurasi GPS (opsional) */}
            {typeof accuracy === "number" && accuracy > 5 && accuracy < 300 && (
              <Circle center={[pos.lat, pos.lng]} radius={accuracy} pathOptions={{ color: "#10b981", weight: 1, fillOpacity: 0.15 }} />
            )}
          </MapContainer>
        </div>

        <div className="p-3 flex items-center justify-between gap-3 text-sm">
          <div className="text-xs text-slate-600">
            Koordinat: <b>{pos.lat.toFixed(6)}</b>, <b>{pos.lng.toFixed(6)}</b>
            {typeof accuracy === "number" && <span> • Akurasi ≈ {Math.round(accuracy)} m</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="h-9 px-3 rounded-xl border">Batal</button>
            <button
              onClick={() => onConfirm?.({ lat: pos.lat, lng: pos.lng })} // ⬅️ kirim plain object
              className="h-9 px-3 rounded-xl text-white bg-emerald-600"
            >
              Pakai titik ini
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
