export interface GeoOpcion {
  display_name: string;
  lat: string;
  lon: string;
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
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=${limit}${cc}`,
    { headers: { 'User-Agent': 'MyWorldXP/1.0', 'Accept-Language': 'es' } }
  );
  return res.json();
}
