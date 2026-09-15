import * as FileSystem from 'expo-file-system/legacy';

// Subdirectorio persistente para la foto de perfil, dentro de documentDirectory.
export const PERFIL_DIR = 'perfil/';

// Nombres de subcarpeta que usa TODA la app para fotos persistidas (viajes y
// perfil). resolveFotoUri los usa como marca para reconocer una ruta propia
// dentro de un string, sin depender de "/Documents/" (nombre específico de
// iOS) ni del UUID del sandbox -- ver resolveFotoUri más abajo.
const KNOWN_SUBDIRS = ['fotos/', PERFIL_DIR];

function genFileId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Copia una foto a un subdirectorio persistente dentro de documentDirectory y
// devuelve la ruta RELATIVA a ese subdirectorio (ej. 'perfil/xxxx.jpg').
// Nunca se devuelve/persiste el prefijo absoluto de documentDirectory: ese
// prefijo incluye el UUID del sandbox actual, que puede no ser el mismo en
// una futura sesión/actualización de la app (ver resolveFotoUri, que
// reconstruye el absoluto vigente a partir de esta ruta relativa).
export async function copiarFotoPersistente(uri: string, subdir: string): Promise<string> {
  if (!uri) throw new Error('URI de foto vacía');
  if (!FileSystem.documentDirectory) throw new Error('FileSystem.documentDirectory no disponible');

  // Ya es una ruta absoluta bajo el documentDirectory actual → no hace falta
  // copiar de nuevo, pero igual se devuelve solo la parte relativa.
  if (uri.startsWith(FileSystem.documentDirectory)) {
    return uri.slice(FileSystem.documentDirectory.length);
  }

  const dir = `${FileSystem.documentDirectory}${subdir}`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const cleanUri = uri.split('?')[0];
  const rawExt = cleanUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(rawExt) ? rawExt : 'jpg';
  const relative = `${subdir}${genFileId()}.${safeExt}`;

  await FileSystem.copyAsync({ from: uri, to: `${FileSystem.documentDirectory}${relative}` });
  return relative;
}

// Convierte una ruta guardada (AsyncStorage / Trip / userData) en una URI
// absoluta válida para <Image>, usando el documentDirectory de ESTA sesión.
// Soporta:
// - formato nuevo, ya relativo ('fotos/xxx.jpg', 'perfil/xxx.jpg') → se
//   antepone el documentDirectory actual;
// - formato absoluto vigente (ya empieza con el documentDirectory actual)
//   → se devuelve tal cual;
// - formato absoluto viejo (de una sesión/actualización anterior, con otro
//   documentDirectory/UUID) → se busca la subcarpeta propia conocida
//   ('fotos/' o 'perfil/') dentro del string y se reconstruye desde ahí
//   contra el documentDirectory actual. No depende de "/Documents/" (no
//   existe ese nombre en Android) ni de conocer el UUID viejo.
// Nunca hace I/O: es una función pura de string, segura de llamar en cada
// render.
export function resolveFotoUri(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!FileSystem.documentDirectory) return stored;

  // Absoluta vigente: mismo documentDirectory de esta sesión.
  if (stored.startsWith(FileSystem.documentDirectory)) return stored;

  // Ya es una ruta relativa (formato nuevo) -- no contiene esquema de URI.
  if (!stored.includes('://')) {
    return `${FileSystem.documentDirectory}${stored}`;
  }

  // Absoluta de otro documentDirectory (actualización previa cambió el
  // sandbox): extraer desde nuestra propia subcarpeta conocida en adelante.
  for (const sub of KNOWN_SUBDIRS) {
    const idx = stored.indexOf(sub);
    if (idx !== -1) {
      return `${FileSystem.documentDirectory}${stored.slice(idx)}`;
    }
  }

  // Forma desconocida: se devuelve tal cual, mismo comportamiento que antes
  // de este cambio (best-effort, puede no resolver si de verdad es inválida).
  return stored;
}
