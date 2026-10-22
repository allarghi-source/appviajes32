import i18n from '../i18n';
import { normalizeCityName } from './cityCatalog';

export interface GeoOpcion {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  addresstype?: string;
  importance?: number | string;
  osm_type?: string;
  osm_id?: number | string;
  // [sur, norte, oeste, este]
  boundingbox?: string[];
  // Presente porque pedimos addressdetails=1. country_code puebla
  // Trip.countryCode en viajes nuevos -- ver utils/paises.ts para la
  // resolución local equivalente en viajes históricos sin este dato.
  address?: { country_code?: string; 'ISO3166-2-lvl4'?: string };
  // Presente porque pedimos extratags=1 (misma consulta, sin llamadas extra).
  extratags?: { wikidata?: string; capital?: string; population?: string };
}

// Única consulta al proveedor para ciudades fuera del catálogo (Cargar y
// residencia del perfil). countryCode (ISO 3166-1 alpha-2) restringe la
// búsqueda al país elegido vía countrycodes.
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
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=${limit}&addressdetails=1&extratags=1${cc}`,
    { headers: { 'User-Agent': 'MyWorldXP/1.0', 'Accept-Language': lang } }
  );
  return res.json();
}

// ─── LOCALIDADES DISTINTAS ENTRE LOS RESULTADOS DEL PROVEEDOR ─────────────────
// Para una ciudad fuera del catálogo, el proveedor puede devolver varias
// REPRESENTACIONES de la misma localidad (la ciudad, su municipio, su comuna,
// un distrito con el mismo nombre…) y, además, localidades homónimas reales.
// Solo estas últimas justifican preguntar. Devuelve un representante por
// localidad distinta, la más probable primero:
//   · 0 → sin resultados (comportamiento actual de cada pantalla)
//   · 1 → se resuelve sola
//   · 2+ → hay que elegir

// Entidades más amplias que una localidad: provincia, región, país,
// departamento. Se descartan SOLO si entre los resultados hay alguna
// localidad; si no, se conservan como antes.
const BROAD_TYPES = new Set(['state', 'region', 'province', 'country', 'state_district', 'county']);

// Tipos que representan una localidad (incluidas sus partes administrativas),
// en orden de prioridad para elegir el representante.
const TYPE_PRIORITY = ['city', 'town', 'municipality', 'village', 'hamlet', 'suburb', 'borough', 'city_district', 'quarter', 'neighbourhood'];
const LOCALITY_TYPES = new Set(TYPE_PRIORITY);

// Prefijos administrativos que no cambian qué localidad es
// ("Municipio de Londres" representa a Londres).
const ADMIN_PREFIXES = [
  'municipio de ', 'municipalidad de ', 'distrito ciudad de ', 'distrito de ', 'ciudad de ',
  'ciudad del ', 'partido de ', 'comuna de ', 'departamento de ', 'gran ', 'greater ',
  'city of ', 'municipality of ', 'town of ',
];

function coreName(name: string): string {
  let n = normalizeCityName(name);
  for (const p of ADMIN_PREFIXES) {
    const np = normalizeCityName(p) + ' ';
    if (n.startsWith(np)) n = n.slice(np.length);
  }
  return n;
}

// ¿Este resultado representa la localidad que escribió el usuario? Mismo
// nombre, o un nombre que lo contiene al principio o al final ("Santa Rosa de
// Calchines", "Libertador General San Martín"), una vez quitados los
// prefijos administrativos.
function representsTyped(o: GeoOpcion, typed: string): boolean {
  const c = coreName(o.name ?? o.display_name.split(',')[0] ?? '');
  return c === typed || c.startsWith(typed + ' ') || c.endsWith(' ' + typed);
}

function inBox(o: GeoOpcion, box?: string[]): boolean {
  if (!box || box.length !== 4) return false;
  const [s, n, w, e] = box.map(Number);
  const lat = Number(o.lat);
  const lon = Number(o.lon);
  return lat >= s && lat <= n && lon >= w && lon <= e;
}

// Misma localidad: mismo id de Wikidata, o (mismo nombre buscado, misma
// provincia y uno dentro del área del otro). La falta de id de Wikidata NO
// prueba que sean distintas.
function sameLocality(a: GeoOpcion, b: GeoOpcion, typed: string): boolean {
  const qa = a.extratags?.wikidata;
  const qb = b.extratags?.wikidata;
  if (qa && qb && qa === qb) return true;
  const pa = a.address?.['ISO3166-2-lvl4'];
  const pb = b.address?.['ISO3166-2-lvl4'];
  if (!pa || !pb || pa !== pb) return false;
  if (!representsTyped(a, typed) || !representsTyped(b, typed)) return false;
  return inBox(a, b.boundingbox) || inBox(b, a.boundingbox);
}

function typeRank(o: GeoOpcion): number {
  const i = TYPE_PRIORITY.indexOf(o.addresstype ?? '');
  return i === -1 ? TYPE_PRIORITY.length : i;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Representante determinista para una misma respuesta del proveedor.
function compareRepresentative(a: GeoOpcion, b: GeoOpcion): number {
  return typeRank(a) - typeRank(b)
    || num(b.importance) - num(a.importance)
    || String(a.osm_id ?? '').localeCompare(String(b.osm_id ?? ''));
}

// Orden de las opciones cuando hay que preguntar: capitales, más población,
// más relevancia.
function compareLikelihood(a: GeoOpcion, b: GeoOpcion): number {
  const cap = (o: GeoOpcion) => (o.extratags?.capital ? 1 : 0);
  return cap(b) - cap(a)
    || num(b.extratags?.population) - num(a.extratags?.population)
    || num(b.importance) - num(a.importance);
}

export function resolveCityCandidates(data: GeoOpcion[], cityText: string): GeoOpcion[] {
  const typed = coreName(cityText);
  const valid = (Array.isArray(data) ? data : []).filter(
    (o) => Number.isFinite(Number(o.lat)) && Number.isFinite(Number(o.lon)),
  );

  // Si hay localidades, solo ellas son alternativas: ni la provincia que las
  // contiene ni una calle con ese nombre. Si no hay ninguna, se conserva lo
  // que haya (sin entidades amplias, si quedan otras), como antes.
  const isBroad = (o: GeoOpcion) => BROAD_TYPES.has(o.addresstype ?? '');
  const localities = valid.filter((o) => LOCALITY_TYPES.has(o.addresstype ?? ''));
  const notBroad = valid.filter((o) => !isBroad(o));
  const pool = localities.length > 0 ? localities : notBroad.length > 0 ? notBroad : valid;

  // Si alguno representa lo escrito, los que no lo representan (otra cosa
  // que contiene la palabra) no son alternativas.
  const matching = pool.filter((o) => representsTyped(o, typed));
  const considered = matching.length > 0 ? matching : pool;

  const groups: GeoOpcion[][] = [];
  for (const o of considered) {
    const g = groups.find((grp) => grp.some((x) => sameLocality(x, o, typed)));
    if (g) g.push(o);
    else groups.push([o]);
  }

  return groups
    .map((g) => [...g].sort(compareRepresentative)[0])
    .sort(compareLikelihood);
}
