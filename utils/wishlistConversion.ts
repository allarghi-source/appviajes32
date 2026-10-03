import { placeKey } from './mapGrouping';

// ─── "¡LO LOGRÉ!" ─────────────────────────────────────────────────────────────
// Decide qué viaje real queda marcado con `desdeWishlist: true` (ver
// Trip.desdeWishlist en statsEngine.ts) al convertir un viaje futuro
// (wishlist o "a repetir") desde app/cargar.tsx. Funciones puras: reciben los
// trips tal como están guardados ANTES de guardar el viaje nuevo.

interface StoredTrip {
  id: string;
  tipo: 'real' | 'wishlist';
  coords: { lat: number; lng: number } | null;
}

// Solo es conversión si se guarda un viaje 'real' y el viaje futuro que lo
// originó sigue existiendo. Evita marcar un segundo viaje cargado en la misma
// pantalla, cuando `wishlistId` sigue en los params pero ya fue convertido.
export function esConversionDeWishlist(
  tripsAntes: StoredTrip[],
  wishlistId: string,
  tipoGuardado: 'real' | 'wishlist',
): boolean {
  if (!wishlistId || tipoGuardado !== 'real') return false;
  return tripsAntes.some((t) => t.id === wishlistId && t.tipo === 'wishlist');
}

// Un "¡Lo logré!" cumple UN viaje planificado aunque la cadena tenga varios
// destinos: se marca el destino que cae en el mismo lugar (misma clave de
// pin) que el viaje futuro convertido, o el primero si ninguno coincide.
export function destinoConvertidoIndex(
  tripsAntes: StoredTrip[],
  wishlistId: string,
  destinos: { coords: { lat: number; lng: number } | null }[],
): number {
  const wish = tripsAntes.find((t) => t.id === wishlistId);
  if (!wish?.coords) return 0;
  const wishKey = placeKey(wish.coords.lat, wish.coords.lng);
  const idx = destinos.findIndex((d) => d.coords != null && placeKey(d.coords.lat, d.coords.lng) === wishKey);
  return idx >= 0 ? idx : 0;
}
