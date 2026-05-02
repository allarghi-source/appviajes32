import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatsResult, Trip } from './statsEngine';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  xp: number;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
}

// ─── CATÁLOGO COMPLETO ────────────────────────────────────────────────────────

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // PROGRESO GENERAL
  { id: 'primer_paso',      nombre: 'Primer Paso',         descripcion: 'Cargaste tu primer viaje',               categoria: 'Progreso',       xp: 30 },
  { id: 'gran_turista',     nombre: 'Gran Turista',        descripcion: 'Visitaste 3 países',                     categoria: 'Progreso',       xp: 30 },
  { id: 'ciudadano_mundo',  nombre: 'Ciudadano del Mundo', descripcion: 'Visitaste 10 países',                    categoria: 'Progreso',       xp: 30 },
  { id: 'colonizador',      nombre: 'Colonizador',         descripcion: 'Visitaste 25 países',                    categoria: 'Progreso',       xp: 30 },
  { id: 'conquistador',     nombre: 'Conquistador',        descripcion: 'Visitaste 50 países',                    categoria: 'Progreso',       xp: 30 },
  // CONTINENTES
  { id: 'intercontinental', nombre: 'Intercontinental',    descripcion: 'Visitaste 2 continentes',                categoria: 'Continentes',    xp: 30 },
  { id: 'globalizado',      nombre: 'Globalizado',         descripcion: 'Visitaste 3 continentes',                categoria: 'Continentes',    xp: 30 },
  { id: 'dominio_mundial',  nombre: 'Dominio Mundial',     descripcion: 'Visitaste 5 continentes',                categoria: 'Continentes',    xp: 30 },
  // COMPORTAMIENTO
  { id: 'repetidor_cronico',nombre: 'Repetidor Crónico',  descripcion: 'Visitaste 10 veces el mismo destino',    categoria: 'Comportamiento', xp: 30 },
  { id: 'deja_vu',          nombre: 'Deja Vu',             descripcion: 'Volviste al mismo país 3 veces',         categoria: 'Comportamiento', xp: 30 },
  // PLANIFICACIÓN
  { id: 'visualizando',     nombre: 'Visualizando',        descripcion: 'Cargaste tu primer destino por hacer',   categoria: 'Planificación',  xp: 30 },
  { id: 'sonador',          nombre: 'Soñador',             descripcion: 'Cargaste 5 destinos por hacer',          categoria: 'Planificación',  xp: 30 },
  { id: 'rey_estratega',    nombre: 'Rey Estratega',       descripcion: 'Cargaste 10 destinos por hacer',         categoria: 'Planificación',  xp: 30 },
  // CUMPLIMIENTO
  { id: 'cumpliendo_metas', nombre: 'Cumpliendo Metas',   descripcion: 'Realizaste 1 viaje planificado',         categoria: 'Cumplimiento',   xp: 30 },
  { id: 'cazador_suenos',   nombre: 'Cazador de Sueños',  descripcion: 'Realizaste 5 viajes planificados',       categoria: 'Cumplimiento',   xp: 30 },
  { id: 'imparable',        nombre: 'Imparable',           descripcion: 'Realizaste 10 viajes planificados',      categoria: 'Cumplimiento',   xp: 30 },
  // EXPERIENCIA
  { id: 'neil_armstrong',   nombre: 'Neil Armstrong',      descripcion: 'Recorriste más km que la distancia Tierra-Luna ida y vuelta', categoria: 'Experiencia', xp: 30 },
  { id: 'superman',         nombre: 'Superman',            descripcion: 'Superaste 500 horas de vuelo',           categoria: 'Experiencia',    xp: 30 },
  // ACTIVIDAD
  { id: 'sin_desarmar',     nombre: 'Sin desarmar la valija', descripcion: 'Cargaste 3 viajes en menos de 30 días', categoria: 'Actividad',   xp: 30 },
  { id: 'constante',        nombre: 'Constante',           descripcion: 'Cargaste viajes en distintos años',      categoria: 'Actividad',      xp: 30 },
  // ESPECIALES
  { id: 'marco_polo',       nombre: 'Marco Polo',          descripcion: 'Viajaste entre Europa y Asia',           categoria: 'Especiales',     xp: 30 },
  { id: 'colon',            nombre: 'Colón',               descripcion: 'Conectaste América y Europa',            categoria: 'Especiales',     xp: 30 },
  { id: 'julio_verne',      nombre: 'Julio Verne',         descripcion: 'Alcanzaste 80 días de vuelo acumulados', categoria: 'Especiales',     xp: 30 },
];

// ─── STORAGE KEYS ─────────────────────────────────────────────────────────────

const KEY_UNLOCKED = 'achievements_unlocked';
const KEY_BADGE    = 'achievements_new_count';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// Agrupa viajes por experiencia (chainId compartido = 1 experiencia; chainId null = experiencia individual).
// Devuelve un Map<paisNorm, cantidadDeExperienciasEnQueAparece>.
function countryVisitsByExperience(real: Trip[]): Map<string, number> {
  const groups = new Map<string, Set<string>>();
  for (const trip of real) {
    const key = trip.chainId ?? trip.id;
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key)!.add(norm(trip.pais));
  }
  const visits = new Map<string, number>();
  for (const countries of groups.values()) {
    for (const country of countries) {
      visits.set(country, (visits.get(country) ?? 0) + 1);
    }
  }
  return visits;
}

function parseDate(s: string | null): number {
  if (!s) return 0;
  const p = s.split(/[\/\-]/);
  if (p.length !== 3) return 0;
  const d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

// ─── EVALUACIÓN DE CONDICIONES ────────────────────────────────────────────────

function evaluate(trips: Trip[], stats: StatsResult): Set<string> {
  const earned = new Set<string>();

  const real     = trips.filter((t) => t.tipo === 'real');
  const wishlist = trips.filter((t) => t.tipo === 'wishlist');

  // City visit counts (for Repetidor Crónico)
  const cityVisits = new Map<string, number>();
  real.forEach((t) => {
    const key = norm(t.ciudad) + '/' + norm(t.pais);
    cityVisits.set(key, (cityVisits.get(key) ?? 0) + 1);
  });
  const maxCity = cityVisits.size > 0 ? Math.max(...cityVisits.values()) : 0;

  // Country visits grouped by experience (for Deja Vu)
  const countryVisits = countryVisitsByExperience(real);
  const maxCountryVisits = countryVisits.size > 0 ? Math.max(...countryVisits.values()) : 0;

  // Fulfilled trips: wishlist destination that also has a real trip
  const wishKeys = new Set(wishlist.map((t) => norm(t.ciudad) + '/' + norm(t.pais)));
  const realKeys = new Set(real.map((t) => norm(t.ciudad) + '/' + norm(t.pais)));
  const fulfilled = [...wishKeys].filter((k) => realKeys.has(k)).length;

  // "Sin desarmar la valija": 3+ real trips within any 30-day window
  const dates = real
    .map((t) => parseDate(t.fechaInicio))
    .filter((d) => d > 0)
    .sort((a, b) => a - b);
  let sinDesarmar = false;
  for (let i = 0; i <= dates.length - 3; i++) {
    if (dates[i + 2] - dates[i] <= 30 * 24 * 60 * 60 * 1000) { sinDesarmar = true; break; }
  }

  // "Constante": real trips in 2+ different calendar years
 const yearsArray = Array.from(
  new Set(
    real
      .map((t) => t.fechaInicio?.split('/')[2])
      .filter((y): y is string => !!y && y.length === 4)
      .map((y) => parseInt(y))
  )
).sort((a, b) => a - b);

// chequea 4 años consecutivos
let consecutiveYears = 1;

for (let i = 1; i < yearsArray.length; i++) {
  if (yearsArray[i] === yearsArray[i - 1] + 1) {
    consecutiveYears++;
    if (consecutiveYears >= 4) {
      // desbloquear "Constante"
      break;
    }
  } else {
    consecutiveYears = 1;
  }
}

  // Continent presence
  const conts   = new Set(stats.continentesNombres);
  const europa  = conts.has('Europa');
  const asia    = conts.has('Asia');
  const america = conts.has('América del Sur') || conts.has('América del Norte');

  // ── Progreso General ──
  if (real.length >= 1)              earned.add('primer_paso');
  if (stats.paisesVisitados >= 3)    earned.add('gran_turista');
  if (stats.paisesVisitados >= 10)   earned.add('ciudadano_mundo');
  if (stats.paisesVisitados >= 25)   earned.add('colonizador');
  if (stats.paisesVisitados >= 50)   earned.add('conquistador');

  // ── Continentes ──
  if (stats.continentesVisitados >= 2) earned.add('intercontinental');
  if (stats.continentesVisitados >= 3) earned.add('globalizado');
  if (stats.continentesVisitados >= 5) earned.add('dominio_mundial');

  // ── Comportamiento ──
  if (maxCity >= 10)                              earned.add('repetidor_cronico');
  if (maxCountryVisits >= 3) earned.add('deja_vu');

  // ── Planificación ──
  if (wishlist.length >= 1)  earned.add('visualizando');
  if (wishlist.length >= 5)  earned.add('sonador');
  if (wishlist.length >= 10) earned.add('rey_estratega');

  // ── Cumplimiento ──
  if (fulfilled >= 1)  earned.add('cumpliendo_metas');
  if (fulfilled >= 5)  earned.add('cazador_suenos');
  if (fulfilled >= 10) earned.add('imparable');

  // ── Experiencia ──
  if (stats.kmTotales >= 768000)  earned.add('neil_armstrong'); // Tierra-Luna ida+vuelta ≈ 768800 km
  if (stats.horasVuelo >= 500)    earned.add('superman');

  // ── Actividad ──
  if (sinDesarmar)       earned.add('sin_desarmar');
  if (consecutiveYears >= 4) {
  earned.add('constante');
}
  // ── Especiales ──
  if (europa && asia)    earned.add('marco_polo');
  if (america && europa) earned.add('colon');
  if (stats.horasVuelo >= 1920) earned.add('julio_verne'); // 80 días × 24 h

  return earned;
}

// ─── API PÚBLICA ──────────────────────────────────────────────────────────────

export async function checkAndSaveAchievements(
  trips: Trip[],
  stats: StatsResult,
): Promise<Achievement[]> {
  const raw = await AsyncStorage.getItem(KEY_UNLOCKED);
  const unlocked: UnlockedAchievement[] = raw ? JSON.parse(raw) : [];
  const unlockedIds = new Set(unlocked.map((u) => u.id));

  const earned = evaluate(trips, stats);
  const newIds = [...earned].filter((id) => !unlockedIds.has(id));
  if (newIds.length === 0) return [];

  const newAchievements = newIds
    .map((id) => ALL_ACHIEVEMENTS.find((a) => a.id === id))
    .filter((a): a is Achievement => !!a);

  const now = Date.now();
  const toSave = [...unlocked, ...newIds.map((id) => ({ id, unlockedAt: now }))];
  await AsyncStorage.setItem(KEY_UNLOCKED, JSON.stringify(toSave));

  const badgeRaw = await AsyncStorage.getItem(KEY_BADGE);
  const badge = badgeRaw ? parseInt(badgeRaw, 10) : 0;
  await AsyncStorage.setItem(KEY_BADGE, String(badge + newAchievements.length));

  return newAchievements;
}

export async function loadUnlockedIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(KEY_UNLOCKED);
  const data: UnlockedAchievement[] = raw ? JSON.parse(raw) : [];
  return new Set(data.map((u) => u.id));
}

export async function loadBadgeCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY_BADGE);
  return raw ? parseInt(raw, 10) : 0;
}

export async function clearBadgeCount(): Promise<void> {
  await AsyncStorage.setItem(KEY_BADGE, '0');
}
