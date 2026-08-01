import AsyncStorage from '@react-native-async-storage/async-storage';

// Lógica compartida de validación y restauración de backup.
// Usada por Settings (Cargar backup) y por el onboarding (Restaurar backup).
// No incluye el guardado de backup ni ningún estado de UI: eso queda en cada pantalla.

export const BACKUP_KEY = 'backup_myworldxp';

export interface BackupUserData {
  nombre?: string;
  apellido?: string;
  nacionalidad?: string;
  ciudad?: string;
  pais?: string;
  foto?: string;
}

export interface BackupPayload {
  userData: BackupUserData | null;
  trips: unknown[];
  savedAt?: string;
}

// ¿Ya hay datos de usuario o viajes cargados en este dispositivo?
export async function hasCurrentData(): Promise<boolean> {
  const [rawUser, rawTrips] = await Promise.all([
    AsyncStorage.getItem('userData'),
    AsyncStorage.getItem('trips'),
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

// Estructura mínima utilizable: un objeto con `trips` como array.
// `userData` puede faltar/ser null (un backup solo-viajes sigue siendo válido).
export function isValidBackup(parsed: unknown): parsed is BackupPayload {
  if (!parsed || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.trips)) return false;
  if (obj.userData !== null && obj.userData !== undefined && typeof obj.userData !== 'object') return false;
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

// Escribe userData/trips del backup en AsyncStorage. No toca ninguna otra clave.
export async function applyBackup(payload: BackupPayload): Promise<void> {
  const { userData, trips } = payload;
  if (userData) await AsyncStorage.setItem('userData', JSON.stringify(userData));
  if (trips) await AsyncStorage.setItem('trips', JSON.stringify(trips));
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
