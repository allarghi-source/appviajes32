import i18n from '../i18n';

export interface GeoOpcion {
  display_name: string;
  lat: string;
  lon: string;
  // Presente solo porque pedimos addressdetails=1. Usado para poblar
  // Trip.countryCode en viajes nuevos -- ver utils/paises.ts para la
  // resolución local equivalente en viajes históricos sin este dato.
  address?: { country_code?: string };
}

// Misma URL, mismos headers y mismo manejo de resultados que el geocodeNominatim
// estable de app/cargar.tsx. Se agrega un countryCode opcional (ISO 3166-1 alpha-2)
// que restringe la búsqueda al país correcto vía el parámetro countrycodes de Nominatim.
export async function geocodeNominatim(
  query: string,
  limit: number,
  countryCode?: string
): Promise<GeoOpcion[]> {
  const q = encodeURIComponent(query);
  const cc = countryCode ? `&countrycodes=${countryCode.toLowerCase()}` : '';
  // Idioma activo de la app, no el del dispositivo -- decisión de producto ya
  // cerrada (el buscador sigue a MyWorldXP, no al idioma del teléfono).
  const lang = i18n.language === 'en' ? 'en' : 'es';
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=${limit}&addressdetails=1${cc}`,
    { headers: { 'User-Agent': 'MyWorldXP/1.0', 'Accept-Language': lang } }
  );
  return res.json();
}
