import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// perbaiki icon marker di Vite
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

function ClickCatcher({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng); } });
  return null;
}

export default function MapPicker({ initial, onCancel, onConfirm }) {
  const [pos, setPos] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="p-3 border-b font-semibold">Pilih titik di peta</div>
        <div className="h-[60vh]">
          <MapContainer center={pos ?? initial} zoom={16} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            />
            <ClickCatcher onPick={(ll) => setPos(ll)} />
            {pos && (
              <Marker
                position={pos}
                draggable
                eventHandlers={{ dragend: (e) => setPos(e.target.getLatLng()) }}
              />
            )}
          </MapContainer>
        </div>
        <div className="p-3 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            {pos ? `Koordinat: ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}` : "Klik peta untuk memilih titik"}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="h-9 px-3 rounded-xl border">Batal</button>
            <button
              onClick={() => pos && onConfirm(pos)}
              disabled={!pos}
              className={`h-9 px-3 rounded-xl text-white ${pos ? "bg-emerald-600" : "bg-emerald-600/50 cursor-not-allowed"}`}
            >
              Pakai titik ini
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
