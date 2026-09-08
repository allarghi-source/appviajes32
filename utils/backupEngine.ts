import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEY_BADGE as ACHIEVEMENTS_BADGE_KEY, KEY_UNLOCKED as ACHIEVEMENTS_UNLOCKED_KEY } from './achievementsEngine';
import { LANGUAGE_STORAGE_KEY } from '../i18n/languageStorage';

// Lógica compartida de validación y restauración de backup.
// Usada por Settings (Guardar/Cargar backup), por el onboarding (Restaurar backup)
// y por "Borrar todo". Única fuente de verdad de qué claves de AsyncStorage
// representan datos del usuario: ninguna pantalla debe mantener su propia lista.
// No incluye ningún estado de UI: eso queda en cada pantalla.

export const BACKUP_KEY = 'backup_myworldxp';

// Versión explícita del formato de backup. Las migraciones futuras deben
// ramificar sobre este número, nunca inferirlo por presencia/ausencia de campos.
// Los backups guardados antes de que existiera este campo se tratan como
// versión 0 (formato legado: solo userData + trips).
export const CURRENT_SCHEMA_VERSION = 1;
const LEGACY_SCHEMA_VERSION = 0;

// Claves de AsyncStorage que representan datos propios del usuario: forman
// parte del backup y son exactamente lo que borra "Borrar todo". No incluye
// cachés ni nada regenerable sin pérdida (ver NOTAS al final del archivo).
export const STORAGE_KEYS = {
  userData: 'userData',
  trips: 'trips',
  learnedCities: 'learned_cities',
  pinVisualOverrides: 'pin_visual_overrides',
  achievementsUnlocked: ACHIEVEMENTS_UNLOCKED_KEY,
  achievementsNewCount: ACHIEVEMENTS_BADGE_KEY,
  appLanguage: LANGUAGE_STORAGE_KEY,
} as const;

const ALL_USER_DATA_KEYS: string[] = Object.values(STORAGE_KEYS);

export interface BackupUserData {
  nombre?: string;
  apellido?: string;
  nacionalidad?: string;
  // Formato anterior (texto libre, sin coordenadas confirmadas). Se mantiene como
  // opcional únicamente para no romper backups viejos: profile.tsx los detecta y
  // exige revalidación antes de usarlos, nunca los da por válidos automáticamente.
  ciudad?: string;
  pais?: string;
  // Formato actual: ubicación de residencia validada contra Nominatim.
  residencia?: {
    ciudad: string;
    pais: string;
    countryCode: string;
    lat: number;
    lng: number;
  };
  foto?: string;
}

export interface BackupPayload {
  schemaVersion: number;
  userData: BackupUserData | null;
  trips: unknown[];
  // Los siguientes campos no existen en backups legado (schemaVersion 0).
  learnedCities?: unknown[];
  achievementsUnlocked?: unknown[];
  achievementsNewCount?: number;
  pinVisualOverrides?: Record<string, unknown> | null;
  appLanguage?: string | null;
  savedAt?: string;
}

// ¿Ya hay datos de usuario o viajes cargados en este dispositivo?
export async function hasCurrentData(): Promise<boolean> {
  const [rawUser, rawTrips] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.userData),
    AsyncStorage.getItem(STORAGE_KEYS.trips),
  ]);
  const userHasData = !!rawUser && Object.keys(JSON.parse(rawUser)).length > 0;
  const tripsHasData = !!rawTrips && (JSON.parse(rawTrips) as unknown[]).length > 0;
  return userHasData || tripsHasData;
}

export function formatBackupDate(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Estructura mínima utilizable. Sin schemaVersion se asume backup legado
// (solo userData + trips). Desde schemaVersion 1, si los campos nuevos están
// presentes deben tener el tipo esperado; no se exige cada campo porque un
// backup parcial (p.ej. sin logros todavía) sigue siendo utilizable.
export function isValidBackup(parsed: unknown): parsed is BackupPayload {
  if (!parsed || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.trips)) return false;
  if (obj.userData !== null && obj.userData !== undefined && typeof obj.userData !== 'object') return false;

  if (obj.schemaVersion === undefined) return true; // legado

  if (typeof obj.schemaVersion !== 'number') return false;
  if (obj.schemaVersion < LEGACY_SCHEMA_VERSION) return false;

  if (obj.learnedCities !== undefined && !Array.isArray(obj.learnedCities)) return false;
  if (obj.achievementsUnlocked !== undefined && !Array.isArray(obj.achievementsUnlocked)) return false;
  if (obj.achievementsNewCount !== undefined && typeof obj.achievementsNewCount !== 'number') return false;
  if (
    obj.pinVisualOverrides !== null &&
    obj.pinVisualOverrides !== undefined &&
    typeof obj.pinVisualOverrides !== 'object'
  ) {
    return false;
  }
  if (obj.appLanguage !== null && obj.appLanguage !== undefined && typeof obj.appLanguage !== 'string') return false;

  return true;
}

export async function getRawBackup(): Promise<string | null> {
  return AsyncStorage.getItem(BACKUP_KEY);
}

// Parsea y valida la estructura. Lanza si el JSON está corrupto o la forma no es utilizable.
export function parseBackup(raw: string): BackupPayload {
  const parsed = JSON.parse(raw);
  if (!isValidBackup(parsed)) {
    throw new Error('Estructura de backup inválida');
  }
  return parsed;
}

// Intenta leer un backup válido sin lanzar; null si no existe o está dañado/es inválido.
export async function tryReadValidBackup(): Promise<BackupPayload | null> {
  try {
    const raw = await getRawBackup();
    if (!raw) return null;
    return parseBackup(raw);
  } catch {
    return null;
  }
}

// Lee de AsyncStorage todo lo que forma parte oficial de los datos del usuario
// y arma el payload de backup. Única responsable de decidir qué se incluye.
export async function createBackupPayload(): Promise<BackupPayload> {
  const pairs = await AsyncStorage.multiGet([
    STORAGE_KEYS.userData,
    STORAGE_KEYS.trips,
    STORAGE_KEYS.learnedCities,
    STORAGE_KEYS.achievementsUnlocked,
    STORAGE_KEYS.achievementsNewCount,
    STORAGE_KEYS.pinVisualOverrides,
    STORAGE_KEYS.appLanguage,
  ]);
  const raw = Object.fromEntries(pairs);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    userData: raw[STORAGE_KEYS.userData] ? JSON.parse(raw[STORAGE_KEYS.userData]!) : null,
    trips: raw[STORAGE_KEYS.trips] ? JSON.parse(raw[STORAGE_KEYS.trips]!) : [],
    learnedCities: raw[STORAGE_KEYS.learnedCities] ? JSON.parse(raw[STORAGE_KEYS.learnedCities]!) : [],
    achievementsUnlocked: raw[STORAGE_KEYS.achievementsUnlocked]
      ? JSON.parse(raw[STORAGE_KEYS.achievementsUnlocked]!)
      : [],
    achievementsNewCount: raw[STORAGE_KEYS.achievementsNewCount]
      ? parseInt(raw[STORAGE_KEYS.achievementsNewCount]!, 10)
      : 0,
    pinVisualOverrides: raw[STORAGE_KEYS.pinVisualOverrides] ? JSON.parse(raw[STORAGE_KEYS.pinVisualOverrides]!) : null,
    appLanguage: raw[STORAGE_KEYS.appLanguage] ?? null,
    savedAt: new Date().toISOString(),
  };
}

// Arma el payload actual y lo persiste como el backup oficial del dispositivo.
export async function writeBackup(): Promise<void> {
  const payload = await createBackupPayload();
  await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(payload));
}

// Escribe en AsyncStorage los datos incluidos en el payload. Campos ausentes
// (backups legado no los tienen) se dejan intactos, no se pisan con vacío.
export async function applyBackup(payload: BackupPayload): Promise<void> {
  const ops: [string, string][] = [];

  if (payload.userData) ops.push([STORAGE_KEYS.userData, JSON.stringify(payload.userData)]);
  if (payload.trips) ops.push([STORAGE_KEYS.trips, JSON.stringify(payload.trips)]);
  if (Array.isArray(payload.learnedCities)) {
    ops.push([STORAGE_KEYS.learnedCities, JSON.stringify(payload.learnedCities)]);
  }
  if (Array.isArray(payload.achievementsUnlocked)) {
    ops.push([STORAGE_KEYS.achievementsUnlocked, JSON.stringify(payload.achievementsUnlocked)]);
  }
  if (typeof payload.achievementsNewCount === 'number') {
    ops.push([STORAGE_KEYS.achievementsNewCount, String(payload.achievementsNewCount)]);
  }
  if (payload.pinVisualOverrides) {
    ops.push([STORAGE_KEYS.pinVisualOverrides, JSON.stringify(payload.pinVisualOverrides)]);
  }
  if (payload.appLanguage) ops.push([STORAGE_KEYS.appLanguage, payload.appLanguage]);

  if (ops.length > 0) await AsyncStorage.multiSet(ops);
}

// Borra exactamente los datos propios del usuario (misma lista que el backup).
// No toca assets ni ningún otro dato del sistema.
export async function clearAllUserData(): Promise<void> {
  await AsyncStorage.multiRemove(ALL_USER_DATA_KEYS);
}

// Mensaje de confirmación reutilizado por todas las pantallas que ofrecen restaurar.
export function buildRestoreConfirmMessage(hasExistingData: boolean, fecha: string | null): string {
  if (hasExistingData) {
    return fecha
      ? `Se encontró un backup guardado el:\n${fecha}\n\nSi continuás, todos los datos actuales serán reemplazados por el contenido de ese backup.\n\n¿Querés continuar?`
      : 'Se encontró un backup guardado en este dispositivo.\n\nSi continuás, todos los datos actuales serán reemplazados por el contenido de ese backup.\n\n¿Querés continuar?';
  }
  return fecha
    ? `Se encontró un backup guardado el:\n${fecha}\n\n¿Querés restaurarlo?`
    : 'Se encontró un backup guardado en este dispositivo.\n\n¿Querés restaurarlo?';
}
