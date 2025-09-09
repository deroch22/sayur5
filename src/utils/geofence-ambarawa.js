// geofence-ambarawa.js
export const AMBARAWA_CENTER = { lat: -7.255641, lng: 110.404555 }; // BPS kantor kecamatan
export const AMBARAWA_RADIUS_M = 3250; // ≈3.25 km (berdasarkan luas 27.62 km² + buffer)

export const AMBARAWA_BOX = {
  minLat: -7.300000, maxLat: -7.233333,
  minLng: 110.366667, maxLng: 110.433333,
};

// --- distance utils ---
const R = 6371000;
const toRad = d => (d * Math.PI) / 180;
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function isInsideCircle(lat, lng) {
  return haversineMeters(lat, lng, AMBARAWA_CENTER.lat, AMBARAWA_CENTER.lng) <= AMBARAWA_RADIUS_M;
}
export function isInsideBox(lat, lng) {
  return (
    lat >= AMBARAWA_BOX.minLat &&
    lat <= AMBARAWA_BOX.maxLat &&
    lng >= AMBARAWA_BOX.minLng &&
    lng <= AMBARAWA_BOX.maxLng
  );
}

// optional: keduanya true biar makin ketat
export function isInsideAmbarawa(lat, lng) {
  return isInsideCircle(lat, lng) && isInsideBox(lat, lng);
}

// --- kecil-kecil untuk cache JSON ---
export const readJSON = (k, defVal = null) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : defVal; } catch { return defVal; }
};
export const writeJSON = (k, obj) => { try { localStorage.setItem(k, JSON.stringify(obj)); } catch {} };

// --- reverse geocode (Nominatim OSM; bisa ganti ke Google/Mapbox) ---
export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
  const r = await fetch(url, { headers: { "Accept-Language": "id" } });
  if (!r.ok) throw new Error("geocode failed");
  return r.json();
}
