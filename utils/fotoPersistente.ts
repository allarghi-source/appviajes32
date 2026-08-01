import * as FileSystem from 'expo-file-system/legacy';

// Subdirectorio persistente para la foto de perfil, dentro de documentDirectory.
export const PERFIL_DIR = 'perfil/';

function genFileId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Copia una foto a un subdirectorio persistente dentro de documentDirectory.
// Misma lógica segura que ya usa la persistencia de fotos de viaje (cargar.tsx/detalle.tsx):
// crea el directorio si falta, no vuelve a copiar si la URI ya es persistente,
// y propaga cualquier error para que el caller nunca reemplace una foto válida
// por una copia fallida o incompleta.
export async function copiarFotoPersistente(uri: string, subdir: string): Promise<string> {
  if (!uri) throw new Error('URI de foto vacía');
  if (!FileSystem.documentDirectory) throw new Error('FileSystem.documentDirectory no disponible');

  // Ya está en almacenamiento persistente → no necesita copiarse de nuevo
  if (uri.startsWith(FileSystem.documentDirectory)) return uri;

  const dir = `${FileSystem.documentDirectory}${subdir}`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const cleanUri = uri.split('?')[0];
  const rawExt = cleanUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(rawExt) ? rawExt : 'jpg';
  const dest = `${dir}${genFileId()}.${safeExt}`;

  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}
