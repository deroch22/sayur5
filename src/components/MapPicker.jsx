// src/components/MapPicker.jsx
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import { LocateFixed, Loader2 } from "lucide-react";

// Perbaiki path icon Leaflet ketika dibundel Vite
import iconUrl from "leaflet/dist/images/marker-icon.png";
import icon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl: icon2xUrl, shadowUrl });

// Komponen kecil untuk klik peta
function ClickCatcher({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng); } });
  return null;
}

// Recenter map saat center berubah (tanpa remount)
function CenterOnChange({ center, zoom = 16 }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom, { animate: true }); }, [center, zoom, map]);
  return null;
}

export default function MapPicker({ initial, onCancel, onConfirm }) {
  const [pos, setPos] = useState(initial);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState(null);

  // Sinkronkan saat modal dibuka ulang / initial berubah
  useEffect(() => { setPos(initial); setAccuracy(null); }, [initial]);

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

        {/* Map area */}
        <div className="relative h-[60vh]">
          {/* Tombol 'Koordinat saya' di dalam peta */}
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
            center={pos}
            zoom={16}
            className="h-full w-full"
            scrollWheelZoom
            // alternatif lain: pakai `key` agar remount kalau pos berubah banyak
            // key={`${pos.lat.toFixed(4)},${pos.lng.toFixed(4)}`}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            <CenterOnChange center={pos} />

            <ClickCatcher onPick={(ll) => { setPos(ll); setAccuracy(null); }} />

            {/* Marker draggable */}
            <Marker
              position={pos}
              draggable
              eventHandlers={{ dragend: (e) => {
                const ll = e.target.getLatLng();
                setPos({ lat: ll.lat, lng: ll.lng });
                setAccuracy(null);
              }}}
            />

            {/* Lingkar akurasi jika ada (optional) */}
            {typeof accuracy === "number" && accuracy > 5 && accuracy < 300 && (
              <Circle center={pos} radius={accuracy} pathOptions={{ color: "#10b981", weight: 1, fillOpacity: 0.15 }} />
            )}
          </MapContainer>
        </div>

        {/* Footer modal */}
        <div className="p-3 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Koordinat: {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
            {typeof accuracy === "number" && <span> • Akurasi ≈ {Math.round(accuracy)} m</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="h-9 px-3 rounded-xl border">Batal</button>
            <button onClick={() => onConfirm(pos)} className="h-9 px-3 rounded-xl text-white bg-emerald-600">
              Pakai titik ini
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
