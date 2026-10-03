// ─── IDENTIDAD DEL LUGAR EN EL MAPA ───────────────────────────────────────────
// UN LUGAR = UN PIN. La identidad visual de un lugar es su coordenada
// redondeada a 3 decimales (~110 m). Esta clave también indexa las posiciones
// visuales de pin guardadas (STORAGE_KEYS.pinVisualOverrides), así que su
// formato no debe cambiar nunca.
//
// Es deliberadamente distinta de las normalizaciones por texto que usan
// statsEngine/achievementsEngine: esta solo decide qué viajes comparten pin.
export function placeKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export interface PlaceGroup<T> {
  key: string;
  lat: number;
  lng: number;
  trips: T[];
  hasReal: boolean;
}

interface GroupableTrip {
  tipo: 'real' | 'wishlist';
  coords: { lat: number; lng: number } | null;
}

// Agrupa por lugar conservando el orden original de los viajes. Un grupo con
// al menos un viaje 'real' es un lugar ya visitado (pin azul); si solo tiene
// 'wishlist', es un lugar al que todavía no se fue (pin dorado).
export function groupTripsByPlace<T extends GroupableTrip>(trips: T[]): PlaceGroup<T>[] {
  const map: Record<string, T[]> = {};
  for (const t of trips) {
    if (!t.coords) continue;
    const key = placeKey(t.coords.lat, t.coords.lng);
    if (!map[key]) map[key] = [];
    map[key].push(t);
  }
  return Object.entries(map).map(([key, tripList]) => ({
    key,
    lat: tripList[0].coords!.lat,
    lng: tripList[0].coords!.lng,
    trips: tripList,
    hasReal: tripList.some((t) => t.tipo === 'real'),
  }));
}

// ─── WISHLIST vs A REPETIR ────────────────────────────────────────────────────
// No es un tipo guardado: un viaje futuro sigue siendo `tipo: 'wishlist'`.
// "A repetir" se DERIVA de que en el mismo lugar ya exista al menos un viaje
// realizado -- así los datos viejos con realizado + wishlist en un mismo lugar
// se interpretan solos, sin migración, y socialSync/Supabase no cambian.
export type FutureTripLabel = 'pending' | 'repeat';

export function futureTripLabel(group: { hasReal: boolean }): FutureTripLabel {
  return group.hasReal ? 'repeat' : 'pending';
}
