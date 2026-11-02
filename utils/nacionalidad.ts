// ─── NACIONALIDAD ─────────────────────────────────────────────────────────────
// Dato cosmético del pasaporte: no se valida contra ninguna lista. Mismo
// criterio en la creación del perfil (app/(tabs)/profile.tsx) y en CONFIG
// (app/settings.tsx). Los datos ya guardados no se tocan hasta que el usuario
// edita el campo.

export const NACIONALIDAD_MAX = 40;

// Letras de cualquier alfabeto (con sus tildes y marcas combinadas), espacios,
// guiones y apóstrofos (recto y tipográfico, que iOS inserta solo).
const NO_PERMITIDOS = /[^\p{L}\p{M} '’-]/gu;

// Mientras se escribe: descarta en silencio lo no permitido y corta en el
// máximo (por caracteres, sin partir letras de dos unidades UTF-16).
export function filtrarNacionalidad(texto: string): string {
  return Array.from(texto.replace(NO_PERMITIDOS, '')).slice(0, NACIONALIDAD_MAX).join('');
}

// Al guardar: sin espacios al principio ni al final, ni repetidos en el medio.
// No vuelve a filtrar: un valor anterior que nunca se editó se guarda tal cual.
export function limpiarNacionalidad(texto: string): string {
  return texto.replace(/ {2,}/g, ' ').trim();
}
