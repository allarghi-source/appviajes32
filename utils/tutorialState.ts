import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── TUTORIAL VISTO ───────────────────────────────────────────────────────────
// Bandera local: el tutorial inicial se completó o se salteó. Mientras no
// exista, el inicio de un usuario nuevo vuelve a mostrar el tutorial (también
// si cerró la app a mitad del recorrido).
//
// Deliberadamente NO forma parte de STORAGE_KEYS (utils/backupEngine.ts): no
// viaja en los backups. "Borrar todos los datos" la quita aparte
// (app/settings.tsx) para que un nuevo comienzo vuelva a mostrar el tutorial.

const TUTORIAL_DONE_KEY = 'tutorial_done';

// Parámetro `origen` de /tutorial cuando se abre desde CONFIG: al terminar
// vuelve a CONFIG y no toca la bandera.
export const TUTORIAL_FROM_CONFIG = 'config';

// Ante un error de lectura se considera visto: un fallo nunca debe bloquear la
// entrada a la app.
export async function isTutorialDone(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TUTORIAL_DONE_KEY)) === '1';
  } catch {
    return true;
  }
}

export async function markTutorialDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_DONE_KEY, '1');
  } catch {
    // Best-effort: en el peor caso el tutorial se ofrece de nuevo.
  }
}

export async function resetTutorial(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TUTORIAL_DONE_KEY);
  } catch {
    // Best-effort.
  }
}
