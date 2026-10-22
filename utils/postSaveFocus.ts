import { visualCoordinate, VisualOverrides } from './mapGrouping';

// ─── ENFOQUE DESPUÉS DE GUARDAR ───────────────────────────────────────────────
// Al terminar de guardar en app/cargar.tsx (animación + avisos de logros/nivel
// ya cerrados) la app abre Timeline (viaje realizado) o el Mapa (deseo) con el
// parámetro `foco`: los ids de los viajes recién guardados, separados por
// coma. Funciones puras: deciden QUÉ enfocar; las pantallas solo lo aplican.

export type PostSaveScreen = 'timeline' | 'mapa';

// Timeline solo muestra viajes realizados; un deseo se ve en el mapa.
export function postSaveScreen(tipo: 'real' | 'wishlist'): PostSaveScreen {
  return tipo === 'real' ? 'timeline' : 'mapa';
}

export function encodeFoco(ids: string[]): string {
  return ids.join(',');
}

export function decodeFoco(foco: string | string[] | undefined): string[] {
  const raw = Array.isArray(foco) ? foco[0] : foco;
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

// Índice de Timeline a centrar: el primer viaje guardado que aparezca en la
// lista y, si es multidestino, el PRIMER destino de su bloque (Timeline ya
// ordena cada bloque por fecha). -1 si no se encuentra: Timeline abre normal.
export function timelineFocusIndex(
  items: { trip: { id: string; chainId: string | null } }[],
  ids: string[],
): number {
  const idx = items.findIndex((it) => ids.includes(it.trip.id));
  if (idx < 0) return -1;
  const chainId = items[idx].trip.chainId;
  if (!chainId) return idx;
  return items.findIndex((it) => it.trip.chainId === chainId);
}

// Coordenadas del mapa a enfocar: la posición VISUAL del pin de cada lugar
// que contiene alguno de los viajes guardados (respeta los pines movidos a
// mano). Un pin por lugar: si el deseo cayó en un lugar ya visitado ("a
// repetir"), es el pin azul existente. Lista vacía si no se encuentra nada.
export function mapFocusCoordinates(
  groups: { key: string; lat: number; lng: number; legacyKeys: string[]; trips: { id: string }[] }[],
  overrides: VisualOverrides,
  ids: string[],
): { latitude: number; longitude: number }[] {
  const coords: { latitude: number; longitude: number }[] = [];
  for (const g of groups) {
    if (!g.trips.some((t) => ids.includes(t.id))) continue;
    coords.push(visualCoordinate(g, overrides));
  }
  return coords;
}
