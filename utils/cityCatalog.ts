import { CITY_AUTOCOMPLETE, CITY_CATALOG_DATA } from './cityCatalogData';
import { resolverIso2Local } from './paises';
import { haversineKm } from './statsEngine';

// ─── CATÁLOGO DE CIUDADES DE REFERENCIA ───────────────────────────────────────
// Cada ciudad del catálogo tiene UN identificador estable y UNA coordenada de
// referencia fija (Wikidata P625), igual en todos los teléfonos y versiones.
// Es la coordenada geográfica que se guarda en viajes y residencia y la que
// usan las distancias. La posición visual de un pin es otra cosa (ver
// utils/mapGrouping.ts) y nunca reemplaza a esta.
//
// Datos en utils/cityCatalogData.ts. Los id, wikidata y coordenadas
// publicados no se modifican nunca: solo se agregan ciudades.

export interface CatalogCity {
  id: string;
  iso2: string;
  lat: number;
  lng: number;
  wikidata: string | null;
  // Nombre del catálogo de autocompletar + etiquetas es/en de Wikidata.
  names: readonly string[];
}

// Entradas de autocompletar (nombre y país visibles) del antiguo CIUDADES.
export { CITY_AUTOCOMPLETE };

// Sin tildes, minúsculas, signos como espacios: "Bogotá", "bogota" y
// "BOGOTÁ" son el mismo nombre; "Tel-Aviv" y "Tel Aviv", también.
export function normalizeCityName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const INDEX: Map<string, CatalogCity[]> = (() => {
  const map = new Map<string, CatalogCity[]>();
  for (const city of CITY_CATALOG_DATA) {
    for (const name of city.names) {
      const key = `${city.iso2}|${normalizeCityName(name)}`;
      const list = map.get(key) ?? [];
      if (!list.includes(city)) list.push(city);
      map.set(key, list);
    }
  }
  return map;
})();

const BY_ID: Map<string, CatalogCity> = new Map(CITY_CATALOG_DATA.map((c) => [c.id, c]));

export function getCatalogCityById(id: string): CatalogCity | undefined {
  return BY_ID.get(id);
}

// Ciudad del catálogo para ese nombre DENTRO de ese país, o null. Solo
// devuelve una coincidencia inequívoca: el país manda (Londres + Argentina no
// es London, GB) y, si un nombre correspondiera a dos ciudades del mismo país,
// no se elige ninguna.
export function findCatalogCity(cityText: string, iso2: string | null | undefined): CatalogCity | null {
  if (!iso2) return null;
  const name = normalizeCityName(cityText);
  if (!name) return null;
  const matches = INDEX.get(`${iso2.toUpperCase()}|${name}`) ?? [];
  return matches.length === 1 ? matches[0] : null;
}

// ─── RECONOCIMIENTO DE UN VIAJE YA GUARDADO (solo para mostrar) ───────────────
// Para agrupar en el mapa viajes viejos y nuevos de la misma ciudad sin tocar
// sus datos. País: countryCode guardado o, si falta (viajes históricos,
// OtherXP), el nombre del país resuelto localmente.
//
// Resguardo: si la coordenada guardada está a más de CATALOG_MATCH_MAX_KM de la
// del catálogo, no es esa ciudad (un homónimo en el mismo país): se deja como
// estaba. El margen cubre de sobra las distintas representaciones de una misma
// ciudad que pudo devolver el proveedor (p. ej. París a 2 km).
export const CATALOG_MATCH_MAX_KM = 50;

export function catalogCityForTrip(trip: {
  ciudad?: string;
  pais?: string;
  countryCode?: string;
  coords: { lat: number; lng: number } | null;
}): CatalogCity | null {
  if (!trip.ciudad) return null;
  const iso2 = trip.countryCode || (trip.pais ? resolverIso2Local(trip.pais) : null);
  const city = findCatalogCity(trip.ciudad, iso2);
  if (!city) return null;
  if (trip.coords && haversineKm(trip.coords, { lat: city.lat, lng: city.lng }) > CATALOG_MATCH_MAX_KM) {
    return null;
  }
  return city;
}
