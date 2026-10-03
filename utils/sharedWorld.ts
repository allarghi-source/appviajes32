import { futureTripLabel, groupTripsByPlace } from './mapGrouping';
import { supabase } from './supabase';

// ─── OTHERXP: LECTURA DE MUNDOS COMPARTIDOS ───────────────────────────────────
// Solo SELECT sobre share_relationships / profiles / shared_trips. RLS es la
// única autoridad de permisos y de scope: share_relationships_select_policy
// deja ver mis relaciones como viewer, profiles_select_policy el perfil del
// owner que me comparte, y shared_trips_select_policy devuelve solo los
// viajes del scope de esa relación (real, wishlist o both). Acá NO se
// reconstruye ni se filtra ningún permiso: se muestra lo que RLS devuelve.
//
// Nunca se piden columnas fuera del snapshot social mínimo (nada de fotos,
// notas, tips, km, horas ni residencia: ni siquiera existen en shared_trips).

export interface SharedOwner {
  id: string;
  username: string;
}

export interface SharedWorldStats {
  xpTotal: number;
  continentes: number;
  paises: number;
  ciudades: number;
}

export interface SharedTrip {
  tripId: string;
  tipo: 'real' | 'wishlist';
  ciudad: string;
  pais: string;
  // 'YYYY-MM-DD' (columna date de Postgres) para 'real'; null para 'wishlist'.
  fechaInicio: string | null;
  coords: { lat: number; lng: number };
}

export interface SharedWorld {
  username: string;
  stats: SharedWorldStats;
  trips: SharedTrip[];
}

// ─── LISTA "OTROS" ────────────────────────────────────────────────────────────
// Owners con una relación vigente donde yo soy viewer, ordenados por username.
export async function fetchSharedOwners(myUserId: string): Promise<SharedOwner[]> {
  const { data: rels, error: relError } = await supabase
    .from('share_relationships')
    .select('owner_id')
    .eq('viewer_id', myUserId);

  if (relError) {
    if (__DEV__) console.warn('[sharedWorld] share_relationships error', relError.code, relError.message);
    throw relError;
  }

  const ownerIds = [
    ...new Set(
      (Array.isArray(rels) ? rels : [])
        .map((r) => (r as { owner_id?: unknown }).owner_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
  if (ownerIds.length === 0) return [];

  const { data: profs, error: profError } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', ownerIds);

  if (profError) {
    if (__DEV__) console.warn('[sharedWorld] profiles error', profError.code, profError.message);
    throw profError;
  }

  // Un owner sin fila legible (relación revocada entre las dos consultas) no
  // entra a la lista: RLS ya dejó de autorizarlo.
  const owners: SharedOwner[] = [];
  for (const row of Array.isArray(profs) ? profs : []) {
    const { id, username } = row as { id?: unknown; username?: unknown };
    if (typeof id === 'string' && typeof username === 'string' && username.length > 0) {
      owners.push({ id, username });
    }
  }
  return owners.sort((a, b) => a.username.localeCompare(b.username));
}

// ─── MUNDO DE UN OWNER ────────────────────────────────────────────────────────
// null = la relación ya no existe o RLS dejó de devolver el perfil del owner
// (revocada): el llamador vuelve a la lista sin mostrar datos viejos.
export async function fetchSharedWorld(myUserId: string, ownerId: string): Promise<SharedWorld | null> {
  const { data: rel, error: relError } = await supabase
    .from('share_relationships')
    .select('owner_id')
    .eq('owner_id', ownerId)
    .eq('viewer_id', myUserId)
    .maybeSingle();

  if (relError) {
    if (__DEV__) console.warn('[sharedWorld] relación error', relError.code, relError.message);
    throw relError;
  }
  if (!rel) return null;

  // Estadísticas precomputadas del snapshot social (sync_shared_world). No se
  // recalculan desde shared_trips.
  const { data: prof, error: profError } = await supabase
    .from('profiles')
    .select('username, xp_total, continentes_visitados, paises_visitados, ciudades_visitadas')
    .eq('id', ownerId)
    .maybeSingle();

  if (profError) {
    if (__DEV__) console.warn('[sharedWorld] perfil error', profError.code, profError.message);
    throw profError;
  }
  if (!prof) return null;

  const p = prof as Record<string, unknown>;
  const trips = await fetchSharedTrips(ownerId);

  return {
    username: typeof p.username === 'string' ? p.username : '',
    stats: {
      xpTotal: toCount(p.xp_total),
      continentes: toCount(p.continentes_visitados),
      paises: toCount(p.paises_visitados),
      ciudades: toCount(p.ciudades_visitadas),
    },
    trips,
  };
}

function toCount(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
}

// ─── PAGINACIÓN DE shared_trips ───────────────────────────────────────────────
// PostgREST corta cada respuesta en su `max_rows` (1000 por defecto en
// Supabase, configurable en el proyecto). Se pide de a PAGE_SIZE con orden
// estable y se avanza según las filas REALMENTE recibidas, hasta una página
// vacía: así funciona aunque el servidor devuelva menos que lo pedido. El
// único tope es el techo del contrato (sync_shared_world rechaza snapshots
// de más de 5000 viajes), solo como red contra un loop infinito.
export const SHARED_TRIPS_PAGE_SIZE = 1000;
export const SHARED_TRIPS_CONTRACT_MAX = 5000;

async function fetchSharedTrips(ownerId: string): Promise<SharedTrip[]> {
  const all: SharedTrip[] = [];
  let from = 0;

  while (from < SHARED_TRIPS_CONTRACT_MAX) {
    const { data, error } = await supabase
      .from('shared_trips')
      .select('trip_id, tipo, ciudad, pais, fecha_inicio, lat, lng')
      .eq('owner_id', ownerId)
      .order('trip_id', { ascending: true })
      .range(from, from + SHARED_TRIPS_PAGE_SIZE - 1);

    if (error) {
      if (__DEV__) console.warn('[sharedWorld] shared_trips error', error.code, error.message);
      throw error;
    }

    const rows: unknown[] = Array.isArray(data) ? data : [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const trip = parseSharedTrip(row);
      if (trip) all.push(trip);
    }
    from += rows.length;
  }

  return all;
}

// Filas con forma inesperada se descartan en vez de romper el mapa.
function parseSharedTrip(row: unknown): SharedTrip | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  if (typeof r.trip_id !== 'string') return null;
  if (r.tipo !== 'real' && r.tipo !== 'wishlist') return null;
  if (typeof r.ciudad !== 'string' || typeof r.pais !== 'string') return null;
  if (typeof r.lat !== 'number' || typeof r.lng !== 'number') return null;
  return {
    tripId: r.trip_id,
    tipo: r.tipo,
    ciudad: r.ciudad,
    pais: r.pais,
    fechaInicio: typeof r.fecha_inicio === 'string' ? r.fecha_inicio : null,
    coords: { lat: r.lat, lng: r.lng },
  };
}

// ─── LUGARES (UN LUGAR = UN PIN) ──────────────────────────────────────────────
// Misma identidad y misma regla que el mapa propio (utils/mapGrouping.ts).
// Con scope 'wishlist' RLS no devuelve los realizados del owner, así que un
// lugar visitado + deseado se ve como wishlist (dorado): es intencional, no se
// infiere nada que el owner no compartió.

export interface SharedPlace {
  key: string;
  lat: number;
  lng: number;
  ciudad: string;
  pais: string;
  // Pin azul si hay al menos un realizado visible; dorado si solo wishlist.
  hasReal: boolean;
  // Fechas de los realizados visibles, 'DD/MM/AAAA' (mismo formato que el
  // mapa propio), cronológicas y sin repetir.
  fechas: string[];
  // Wishlist + realizado visibles en el mismo lugar.
  aRepetir: boolean;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isoToFechaLocal(iso: string): string | null {
  const m = ISO_DATE.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

export function buildSharedPlaces(trips: SharedTrip[]): SharedPlace[] {
  return groupTripsByPlace(trips).map((group) => {
    // 'YYYY-MM-DD' ordena cronológicamente como texto.
    const isoDates = [
      ...new Set(
        group.trips
          .filter((t) => t.tipo === 'real' && t.fechaInicio && ISO_DATE.test(t.fechaInicio))
          .map((t) => t.fechaInicio as string),
      ),
    ].sort();

    return {
      key: group.key,
      lat: group.lat,
      lng: group.lng,
      ciudad: group.trips[0].ciudad,
      pais: group.trips[0].pais,
      hasReal: group.hasReal,
      fechas: isoDates.map((d) => isoToFechaLocal(d) as string),
      aRepetir: group.trips.some((t) => t.tipo === 'wishlist') && futureTripLabel(group) === 'repeat',
    };
  });
}
