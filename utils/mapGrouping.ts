import { catalogCityForTrip } from './cityCatalog';

// ─── IDENTIDAD DEL LUGAR EN EL MAPA ───────────────────────────────────────────
// UN LUGAR = UN PIN. Dos niveles de identidad:
//   · Ciudad del catálogo (utils/cityCatalog.ts): clave `city:<id>`. Todos sus
//     viajes, viejos o nuevos y con la coordenada guardada que sea, comparten
//     un pin, dibujado en la coordenada de referencia del catálogo.
//   · Fuera del catálogo: la coordenada guardada redondeada a 3 decimales
//     (~110 m), como siempre.
//
// Coordenada GEOGRÁFICA (la guardada en el viaje: distancias, estadísticas)
// y posición VISUAL del pin (ajuste opcional del usuario, solo para dibujar)
// son datos separados: nada de este archivo modifica la primera.
//
// Es deliberadamente distinta de las normalizaciones por texto que usan
// statsEngine/achievementsEngine: esta solo decide qué viajes comparten pin.

// Clave por coordenada. Es también la clave HISTÓRICA de las posiciones
// visuales guardadas (STORAGE_KEYS.pinVisualOverrides): su formato no cambia.
export function placeKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export interface PlaceGroup<T> {
  key: string;
  // Posición del pin sin ajuste visual: la coordenada del catálogo o, fuera
  // del catálogo, la del primer viaje del lugar.
  lat: number;
  lng: number;
  trips: T[];
  hasReal: boolean;
  // Id de la ciudad del catálogo, o null.
  cityId: string | null;
  // Claves por coordenada de sus viajes (las que podían tener ajustes
  // visuales guardados antes del catálogo), de la más usada a la menos usada.
  legacyKeys: string[];
}

interface GroupableTrip {
  tipo: 'real' | 'wishlist';
  coords: { lat: number; lng: number } | null;
  ciudad?: string;
  pais?: string;
  countryCode?: string;
}

// Identidad de lugar de un viaje (o de un destino que se está cargando).
export function placeIdentityKey(trip: Omit<GroupableTrip, 'tipo'>): string | null {
  const city = catalogCityForTrip(trip);
  if (city) return `city:${city.id}`;
  return trip.coords ? placeKey(trip.coords.lat, trip.coords.lng) : null;
}

// Agrupa por lugar conservando el orden original de los viajes. Un grupo con
// al menos un viaje 'real' es un lugar ya visitado (pin azul); si solo tiene
// 'wishlist', es un lugar al que todavía no se fue (pin dorado).
export function groupTripsByPlace<T extends GroupableTrip>(trips: T[]): PlaceGroup<T>[] {
  const groups = new Map<string, { trips: T[]; city: ReturnType<typeof catalogCityForTrip> }>();
  for (const t of trips) {
    if (!t.coords) continue;
    const city = catalogCityForTrip(t);
    const key = city ? `city:${city.id}` : placeKey(t.coords.lat, t.coords.lng);
    const g = groups.get(key);
    if (g) g.trips.push(t);
    else groups.set(key, { trips: [t], city });
  }

  return [...groups.entries()].map(([key, { trips: tripList, city }]) => ({
    key,
    lat: city ? city.lat : tripList[0].coords!.lat,
    lng: city ? city.lng : tripList[0].coords!.lng,
    trips: tripList,
    hasReal: tripList.some((t) => t.tipo === 'real'),
    cityId: city ? city.id : null,
    legacyKeys: legacyKeysOf(tripList),
  }));
}

function legacyKeysOf(trips: GroupableTrip[]): string[] {
  const counts = new Map<string, number>();
  for (const t of trips) {
    if (!t.coords) continue;
    const k = placeKey(t.coords.lat, t.coords.lng);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k]) => k);
}

// ─── POSICIÓN VISUAL DEL PIN ──────────────────────────────────────────────────
// Ajuste opcional, solo para dibujar. Se guarda por clave de lugar. Hoy los
// ajustes nuevos usan la clave del grupo (`city:<id>` en ciudades del
// catálogo). Los anteriores al catálogo están guardados por coordenada: se
// siguen respetando.
//
// Si varios pines viejos con ajustes distintos se reúnen en una ciudad del
// catálogo: los ajustes no guardan fecha, así que no hay forma fiable de saber
// cuál es el más reciente. Regla determinista: gana el ajuste del pin viejo con
// MÁS viajes y, a igualdad, el de clave menor en orden alfabético (el orden de
// `legacyKeys`).

export type VisualOverrides = Record<string, { lat: number; lng: number }>;

// Clave cuyo ajuste visual se aplica a este grupo, o null si no tiene.
export function visualOverrideKey(
  group: { key: string; legacyKeys: string[] },
  overrides: VisualOverrides,
): string | null {
  if (overrides[group.key]) return group.key;
  return group.legacyKeys.find((k) => overrides[k]) ?? null;
}

// Dónde dibujar el pin: el ajuste visual si existe; si no, la posición del grupo.
export function visualCoordinate(
  group: { key: string; lat: number; lng: number; legacyKeys: string[] },
  overrides: VisualOverrides,
): { latitude: number; longitude: number } {
  const k = visualOverrideKey(group, overrides);
  const o = k ? overrides[k] : null;
  return o ? { latitude: o.lat, longitude: o.lng } : { latitude: group.lat, longitude: group.lng };
}

// Ajustes resultantes al mover el pin: se guarda con la clave del grupo. Los
// viejos quedan donde estaban (la clave del grupo tiene prioridad).
export function withMovedPin(
  overrides: VisualOverrides,
  group: { key: string },
  position: { lat: number; lng: number },
): VisualOverrides {
  return { ...overrides, [group.key]: position };
}

// Ajustes resultantes al restablecer el pin: se quitan su ajuste actual y los
// viejos que le correspondían, para que no vuelva a aparecer uno anterior.
export function withResetPin(
  overrides: VisualOverrides,
  group: { key: string; legacyKeys: string[] },
): VisualOverrides {
  const next = { ...overrides };
  delete next[group.key];
  for (const k of group.legacyKeys) delete next[k];
  return next;
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
