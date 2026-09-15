import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './backupEngine';
import { calcularStats, type Trip } from './statsEngine';
import { supabase } from './supabase';

// ─── FECHA ────────────────────────────────────────────────────────────────────
// Local: "DD/MM/AAAA" o "DD-MM-AAAA" (mismo formato que parsea
// utils/statsEngine.ts). shared_trips.fecha_inicio es `date` en Postgres:
// espera 'YYYY-MM-DD'. Un formato local inesperado devuelve null (el trip se
// excluye del snapshot en buildTripsPayload, nunca rompe la foto entera).
function toIsoDate(fechaLocal: string | null): string | null {
  if (!fechaLocal) return null;
  const parts = fechaLocal.split(/[\/\-]/);
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!/^\d{1,2}$/.test(dd) || !/^\d{1,2}$/.test(mm) || !/^\d{4}$/.test(yyyy)) return null;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

// ─── SNAPSHOT DE VIAJES ────────────────────────────────────────────────────────
// Solo los campos que espera sync_shared_world -- nunca fotos, nota,
// tipsViaje, distancia (km) ni origenCoords (residencia).

interface SharedTripPayload {
  trip_id: string;
  tipo: 'real' | 'wishlist';
  ciudad: string;
  pais: string;
  fecha_inicio: string | null;
  lat: number;
  lng: number;
  chain_id: string | null;
}

// MyWorldXP no permite guardar un viaje sin coordenadas válidas (invariante
// de producto ya cerrada) -- no se diseña ninguna excepción social para eso.
// El filtro de acá es solo defensivo: sync_shared_world valida el array de
// trips como un todo, así que un único registro legado sin coords o sin
// fecha válida (si alguna vez existiera) tiraría abajo la sincronización
// completa de TODOS los demás trips en vez de solo el suyo. Excluirlo acá
// evita ese efecto en cascada sin introducir ninguna regla de producto nueva.
function buildTripsPayload(trips: Trip[]): SharedTripPayload[] {
  const payload: SharedTripPayload[] = [];

  for (const t of trips) {
    if (t.coords == null) continue;

    if (t.tipo === 'real') {
      const fecha_inicio = toIsoDate(t.fechaInicio);
      if (!fecha_inicio) continue;
      payload.push({
        trip_id: t.id,
        tipo: 'real',
        ciudad: t.ciudad,
        pais: t.pais,
        fecha_inicio,
        lat: t.coords.lat,
        lng: t.coords.lng,
        chain_id: t.chainId,
      });
    } else {
      // wishlist nunca tiene fecha (regla de producto ya cerrada).
      payload.push({
        trip_id: t.id,
        tipo: 'wishlist',
        ciudad: t.ciudad,
        pais: t.pais,
        fecha_inicio: null,
        lat: t.coords.lat,
        lng: t.coords.lng,
        chain_id: t.chainId,
      });
    }
  }

  return payload;
}

// ─── SOCIAL_REVISION ──────────────────────────────────────────────────────────
// bigint creciente, sin leer nada de Supabase antes de cada sync (pedido
// explícito). Date.now() (ms desde epoch) ya es creciente entre reinicios de
// la app en uso normal -- no hace falta persistir nada localmente para que la
// siguiente sesión siga siendo mayor a la última revisión aceptada por el
// servidor. `lastRevision` en memoria solo evita que dos llamadas dentro del
// mismo proceso caigan en el mismo milisegundo (ej: dos triggers muy
// seguidos) manden la misma revisión dos veces.
//
// Límite conocido y aceptado de este enfoque simple (no se resuelve acá por
// pedido explícito de no complicar el cliente leyendo el server primero): si
// el reloj del dispositivo se atrasa manualmente por debajo de la última
// revisión ya aceptada, sync_shared_world empezaría a devolver 'stale' hasta
// que el reloj alcance ese punto de nuevo. Es un caso de borde aceptado, no
// un bug de esta implementación.
let lastRevision = 0;
function nextRevision(): number {
  const now = Date.now();
  lastRevision = now > lastRevision ? now : lastRevision + 1;
  return lastRevision;
}

// ─── LECTURA LOCAL ────────────────────────────────────────────────────────────
// Misma clave y mismo patrón (getItem + JSON.parse sin validar forma) que ya
// usan app/cargar.tsx, app/detalle.tsx, app/mapa.tsx, etc. -- no se introduce
// una fuente de verdad nueva, se lee la misma que ya existe.
async function readLocalTrips(): Promise<Trip[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.trips);
  return raw ? (JSON.parse(raw) as Trip[]) : [];
}

// ─── EJECUCIÓN BEST-EFFORT ─────────────────────────────────────────────────────
// Un solo sync en curso + una marca "dirty" para repetir una vez más al
// terminar si llegaron pedidos nuevos mientras corría -- nada más sofisticado
// (sin cola, sin reintentos con backoff, sin persistencia).
let syncInFlight = false;
let syncDirty = false;

async function runSync(): Promise<void> {
  if (syncInFlight) {
    syncDirty = true;
    return;
  }
  syncInFlight = true;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (!session || !session.user.email_confirmed_at) {
      if (__DEV__) console.log('[socialSync] skip: sin sesión o email sin confirmar');
      return;
    }

    let trips: Trip[];
    try {
      trips = await readLocalTrips();
    } catch (err) {
      if (__DEV__) console.warn('[socialSync] no se pudieron leer los trips locales, aborta', err);
      return;
    }

    const stats = calcularStats(trips);
    const viajesRealizados = trips.filter((t) => t.tipo === 'real').length;
    const tripsPayload = buildTripsPayload(trips);

    const { data, error } = await supabase.rpc('sync_shared_world', {
      p_revision: nextRevision(),
      p_xp_total: stats.xpTotal,
      p_rango_actual: stats.rangoActual,
      p_continentes_visitados: stats.continentesVisitados,
      p_paises_visitados: stats.paisesVisitados,
      p_ciudades_visitadas: stats.ciudadesVisitadas,
      p_viajes_realizados: viajesRealizados,
      p_trips: tripsPayload,
    });

    if (error) {
      // Best-effort: nunca se propaga, nunca rompe nada local. Se reintentará
      // en el próximo disparador natural (otra edición, otra entrada a
      // CompartirXP, otro arranque de la app).
      if (__DEV__) console.warn('[socialSync] sync_shared_world error', error.code, error.message);
      return;
    }

    // data: 'applied' | 'stale' -- 'stale' no es un error, solo significa que
    // esta foto llegó después de una más nueva y el servidor la ignoró.
    if (__DEV__) console.log('[socialSync] sync_shared_world ->', data);
  } catch (err) {
    if (__DEV__) console.warn('[socialSync] fallo inesperado, ignorado (best-effort)', err);
  } finally {
    syncInFlight = false;
    if (syncDirty) {
      syncDirty = false;
      void runSync();
    }
  }
}

// Debounce simple: varias mutaciones seguidas (ej: guardar una cadena de
// varios destinos, varias ediciones rápidas) se coalescen en una sola foto
// real en vez de una llamada por cada una.
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 1500;

// Punto de entrada único y seguro desde cualquier parte de la app. No lanza,
// no devuelve nada que el llamador deba manejar, y nunca debe awaitearse de
// forma que bloquee un flujo local -- se llama y se sigue.
export function requestSharedWorldSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runSync();
  }, DEBOUNCE_MS);
}
