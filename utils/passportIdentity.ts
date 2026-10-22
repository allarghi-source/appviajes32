import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// ─── IDENTIDAD DEL PASAPORTE ──────────────────────────────────────────────────
// UUID v4 aleatorio (expo-crypto, fuente criptográfica) que identifica a ESTE
// MyWorldXP ante CompartirXP. Se genera una sola vez y se guarda en el
// teléfono. No se muestra nunca en la interfaz ni se registra en logs.
//
// Es independiente de la sesión: cerrar sesión o actualizar la app no lo
// toca. Deliberadamente NO forma parte de STORAGE_KEYS (utils/backupEngine.ts),
// así que no viaja en el backup ni lo borra "Borrar todo" (decisión de esta
// etapa: no se modifican esos flujos).
//
// El vínculo pasaporte ↔ cuenta lo valida el servidor (public.passport_links).
// Este id NO es una prueba de propiedad por sí solo.

const PASSPORT_ID_KEY = 'myworldxp_passport_id';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Una sola resolución en curso por proceso: dos llamadas simultáneas nunca
// generan dos ids distintos.
let pending: Promise<string> | null = null;

// Devuelve el id del pasaporte, creándolo solo si de verdad no existe.
// - Si la LECTURA falla, lanza: nunca se regenera por un error temporal.
// - Si hay un valor guardado que no es un UUID válido, lanza: no se pisa
//   una identidad existente.
export function getPassportId(): Promise<string> {
  if (!pending) {
    pending = resolvePassportId().finally(() => {
      pending = null;
    });
  }
  return pending;
}

async function resolvePassportId(): Promise<string> {
  const stored = await AsyncStorage.getItem(PASSPORT_ID_KEY);

  if (stored !== null) {
    if (UUID_REGEX.test(stored)) return stored;
    throw new Error('PASSPORT_ID_INVALID');
  }

  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(PASSPORT_ID_KEY, id);
  return id;
}
