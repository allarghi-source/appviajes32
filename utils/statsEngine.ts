// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface Trip {
  id: string;
  tipo: 'real' | 'wishlist';
  ciudad: string;
  pais: string;
  fechaInicio: string | null;
  fotos: string[];
  portada: string | null;
  nota: string;
  xp: number;
  distancia: number;
  chainId: string | null;
  coords: { lat: number; lng: number } | null;
}

export interface StatsResult {
  xpTotal: number;
  rangoActual: string;
  rangoTier: 'bronce' | 'plata' | 'oro';
  siguienteRango: string | null;
  progresoRango: number; // 0–1

  paisesVisitados: number;
  ciudadesVisitadas: number;
  continentesVisitados: number;
  continentesNombres: string[];

  kmTotales: number;
  horasVuelo: number;

  paisesMasVisitados: Array<{ pais: string; visitas: number }>;
  porcentajeContinentes: number; // 0–1
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const HOME_COORDS = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires (default)

export const ALL_CONTINENTS = [
  'América del Norte',
  'América del Sur',
  'Europa',
  'África',
  'Asia',
  'Oceanía',
] as const;

const RANKS: Array<{ nombre: string; xpMin: number; tier: 'bronce' | 'plata' | 'oro' }> = [
  { nombre: 'Novato',      xpMin: 0,    tier: 'bronce' },
  { nombre: 'Corsario',    xpMin: 500,  tier: 'bronce' },
  { nombre: 'Viajero',     xpMin: 1000, tier: 'plata'  },
  { nombre: 'Trotamundos', xpMin: 2000, tier: 'plata'  },
  { nombre: 'Navegante',   xpMin: 3000, tier: 'oro'    },
  { nombre: 'Astronauta',  xpMin: 4000, tier: 'oro'    },
];

// ─── MAPEO PAÍS → CONTINENTE ──────────────────────────────────────────────────
// Claves normalizadas (minúsculas, sin tildes)

const CONTINENT_MAP: Record<string, string> = {
  // América del Norte
  'estados unidos': 'América del Norte',
  'canada': 'América del Norte',
  'mexico': 'América del Norte',
  'cuba': 'América del Norte',
  'jamaica': 'América del Norte',
  'haiti': 'América del Norte',
  'republica dominicana': 'América del Norte',
  'costa rica': 'América del Norte',
  'panama': 'América del Norte',
  'guatemala': 'América del Norte',
  'honduras': 'América del Norte',
  'el salvador': 'América del Norte',
  'nicaragua': 'América del Norte',
  'belice': 'América del Norte',
  'puerto rico': 'América del Norte',
  'trinidad y tobago': 'América del Norte',
  'barbados': 'América del Norte',
  'bahamas': 'América del Norte',

  // América del Sur
  'argentina': 'América del Sur',
  'brasil': 'América del Sur',
  'brazil': 'América del Sur',
  'chile': 'América del Sur',
  'uruguay': 'América del Sur',
  'paraguay': 'América del Sur',
  'bolivia': 'América del Sur',
  'peru': 'América del Sur',
  'colombia': 'América del Sur',
  'venezuela': 'América del Sur',
  'ecuador': 'América del Sur',
  'guyana': 'América del Sur',
  'surinam': 'América del Sur',
  'guyana francesa': 'América del Sur',

  // Europa
  'espana': 'Europa',
  'france': 'Europa',
  'francia': 'Europa',
  'italia': 'Europa',
  'alemania': 'Europa',
  'germany': 'Europa',
  'reino unido': 'Europa',
  'uk': 'Europa',
  'portugal': 'Europa',
  'paises bajos': 'Europa',
  'holanda': 'Europa',
  'belgica': 'Europa',
  'suiza': 'Europa',
  'austria': 'Europa',
  'grecia': 'Europa',
  'suecia': 'Europa',
  'noruega': 'Europa',
  'dinamarca': 'Europa',
  'finlandia': 'Europa',
  'polonia': 'Europa',
  'rusia': 'Europa',
  'ucrania': 'Europa',
  'turquia': 'Europa',
  'hungria': 'Europa',
  'republica checa': 'Europa',
  'croacia': 'Europa',
  'rumania': 'Europa',
  'serbia': 'Europa',
  'eslovaquia': 'Europa',
  'eslovenia': 'Europa',
  'irlanda': 'Europa',
  'luxemburgo': 'Europa',
  'islandia': 'Europa',
  'malta': 'Europa',
  'chipre': 'Europa',
  'albania': 'Europa',
  'bulgaria': 'Europa',
  'estonia': 'Europa',
  'letonia': 'Europa',
  'lituania': 'Europa',
  'moldavia': 'Europa',
  'bielorrusia': 'Europa',
  'armenia': 'Europa',
  'georgia': 'Europa',
  'monaco': 'Europa',
  'andorra': 'Europa',
  'san marino': 'Europa',
  'liechtenstein': 'Europa',

  // África
  'marruecos': 'África',
  'egipto': 'África',
  'sudafrica': 'África',
  'etiopia': 'África',
  'nigeria': 'África',
  'kenia': 'África',
  'kenya': 'África',
  'tanzania': 'África',
  'ghana': 'África',
  'senegal': 'África',
  'tunez': 'África',
  'argelia': 'África',
  'libia': 'África',
  'mozambique': 'África',
  'angola': 'África',
  'zimbabue': 'África',
  'zimbabwe': 'África',
  'zambia': 'África',
  'ruanda': 'África',
  'camerun': 'África',
  'costa de marfil': 'África',
  'mali': 'África',
  'madagascar': 'África',
  'namibia': 'África',
  'botswana': 'África',
  'uganda': 'África',

  // Asia
  'china': 'Asia',
  'japon': 'Asia',
  'india': 'Asia',
  'corea del sur': 'Asia',
  'corea del norte': 'Asia',
  'tailandia': 'Asia',
  'vietnam': 'Asia',
  'indonesia': 'Asia',
  'malasia': 'Asia',
  'filipinas': 'Asia',
  'singapur': 'Asia',
  'hong kong': 'Asia',
  'taiwan': 'Asia',
  'myanmar': 'Asia',
  'camboya': 'Asia',
  'laos': 'Asia',
  'nepal': 'Asia',
  'bangladesh': 'Asia',
  'pakistan': 'Asia',
  'sri lanka': 'Asia',
  'maldivas': 'Asia',
  'israel': 'Asia',
  'jordania': 'Asia',
  'libano': 'Asia',
  'siria': 'Asia',
  'irak': 'Asia',
  'iran': 'Asia',
  'arabia saudita': 'Asia',
  'emiratos arabes unidos': 'Asia',
  'qatar': 'Asia',
  'kuwait': 'Asia',
  'bahrain': 'Asia',
  'uzbekistan': 'Asia',
  'kazajistan': 'Asia',
  'mongolia': 'Asia',
  'afganistan': 'Asia',
  'birmania': 'Asia',

  // Oceanía
  'australia': 'Oceanía',
  'nueva zelanda': 'Oceanía',
  'nueva zelandia': 'Oceanía',
  'fiyi': 'Oceanía',
  'fiji': 'Oceanía',
  'papua nueva guinea': 'Oceanía',
  'tonga': 'Oceanía',
  'samoa': 'Oceanía',
  'vanuatu': 'Oceanía',
  'polinesia francesa': 'Oceanía',
  'nueva caledonia': 'Oceanía',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function getContinent(pais: string): string | null {
  return CONTINENT_MAP[normalize(pais)] ?? null;
}

function parseDate(s: string | null): number {
  if (!s) return 0;
  const p = s.split(/[\/\-]/);
  if (p.length !== 3) return 0;
  const d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function getRango(xp: number) {
  let current = RANKS[0];
  let next: (typeof RANKS)[0] | null = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].xpMin) {
      current = RANKS[i];
      next = RANKS[i + 1] ?? null;
    }
  }
  const progreso = next
    ? Math.min((xp - current.xpMin) / (next.xpMin - current.xpMin), 1)
    : 1;
  return { current, next, progreso };
}

export function getXpRestantes(xpTotal: number): number | null {
  let next: (typeof RANKS)[0] | null = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (xpTotal >= RANKS[i].xpMin) next = RANKS[i + 1] ?? null;
  }
  return next ? next.xpMin - xpTotal : null;
}

export function formatKm(km: number): string {
  const n = Math.round(km);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n.toString();
}

export function formatHoras(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}min`;
  return `${Math.round(h)}h`;
}

// ─── MOTOR PRINCIPAL ──────────────────────────────────────────────────────────

export function calcularStats(
  trips: Trip[],
  homeCoords: { lat: number; lng: number } = HOME_COORDS
): StatsResult {
  const realTrips = trips
    .filter((t) => t.tipo === 'real')
    .sort((a, b) => parseDate(a.fechaInicio) - parseDate(b.fechaInicio));

  // ── Contadores ─────────────────────────────────────────────────────────────
  const visitedCities = new Map<string, number>();
  const visitedCountries = new Map<string, { displayName: string; count: number }>();
  const visitedContinents = new Set<string>();
  const chainLastCountry = new Map<string, string>();

  let xp = 0;

  // ── XP por viaje ───────────────────────────────────────────────────────────
  for (const trip of realTrips) {
    const cityKey = normalize(trip.ciudad);
    const countryKey = normalize(trip.pais);
    const continent = getContinent(trip.pais);

    const isNewCity = !visitedCities.has(cityKey);
    const isNewCountry = !visitedCountries.has(countryKey);
    const isNewContinent = !!continent && !visitedContinents.has(continent);

    // Continente nuevo
    if (isNewContinent && continent) {
      xp += 100;
      visitedContinents.add(continent);
    }

    // País nuevo
    if (isNewCountry) {
      xp += 25;
    }

    // Ciudad: lógica de cadena vs standalone
    if (trip.chainId) {
      const prevCountry = chainLastCountry.get(trip.chainId);
      if (prevCountry !== undefined && prevCountry === countryKey) {
        // Destino encadenado, mismo país
        xp += 5;
      } else {
        // Primer destino de la cadena, o país distinto al anterior en la cadena
        if (isNewCity) xp += 10;
      }
      chainLastCountry.set(trip.chainId, countryKey);
    } else {
      if (isNewCity) xp += 10;
    }

    // Actualizar contadores
    visitedCities.set(cityKey, (visitedCities.get(cityKey) ?? 0) + 1);
    const prev = visitedCountries.get(countryKey);
    visitedCountries.set(countryKey, {
      displayName: prev?.displayName ?? trip.pais,
      count: (prev?.count ?? 0) + 1,
    });
  }

  // ── Hitos ──────────────────────────────────────────────────────────────────
  // Ciudad visitada 10 veces
  for (const [, count] of visitedCities) {
    if (count >= 10) xp += 50;
  }
  // País visitado 10 veces
  for (const [, { count }] of visitedCountries) {
    if (count >= 10) xp += 75;
  }
  // Hitos de continentes
  const numCont = visitedContinents.size;
  if (numCont >= 3) xp += 150;
  if (numCont >= 4) xp += 200;
  if (numCont >= 5) xp += 300;
  if (numCont >= 6) xp += 500;
  // Hitos de países
  const numPaises = visitedCountries.size;
  if (numPaises >= 10) xp += 100;
  if (numPaises >= 25) xp += 150;
  if (numPaises >= 50) xp += 200;

  // ── Distancias ─────────────────────────────────────────────────────────────
  const chainGroups = new Map<string, Trip[]>();
  const standaloneTrips: Trip[] = [];

  for (const trip of realTrips) {
    if (trip.chainId) {
      const arr = chainGroups.get(trip.chainId) ?? [];
      arr.push(trip);
      chainGroups.set(trip.chainId, arr);
    } else {
      standaloneTrips.push(trip);
    }
  }

  let kmTotales = 0;

  // Viajes normales: casa → destino → casa (ida + vuelta)
  for (const trip of standaloneTrips) {
    if (trip.coords) {
      kmTotales += haversineKm(homeCoords, trip.coords) * 2;
    }
  }

  // Viajes encadenados: casa → d1 → d2 → ... → dn → casa
  for (const [, chain] of chainGroups) {
    const withCoords = [...chain]
      .sort((a, b) => parseDate(a.fechaInicio) - parseDate(b.fechaInicio))
      .filter((t) => t.coords != null);
    if (withCoords.length === 0) continue;

    kmTotales += haversineKm(homeCoords, withCoords[0].coords!);
    for (let i = 0; i < withCoords.length - 1; i++) {
      kmTotales += haversineKm(withCoords[i].coords!, withCoords[i + 1].coords!);
    }
    kmTotales += haversineKm(withCoords[withCoords.length - 1].coords!, homeCoords);
  }

  const horasVuelo = kmTotales / 800;

  // ── Rango ──────────────────────────────────────────────────────────────────
  const { current, next, progreso } = getRango(xp);

  // ── Países más visitados ───────────────────────────────────────────────────
  const paisesMasVisitados = [...visitedCountries.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(({ displayName, count }) => ({ pais: displayName, visitas: count }));

  return {
    xpTotal: xp,
    rangoActual: current.nombre,
    rangoTier: current.tier,
    siguienteRango: next?.nombre ?? null,
    progresoRango: progreso,

    paisesVisitados: visitedCountries.size,
    ciudadesVisitadas: visitedCities.size,
    continentesVisitados: visitedContinents.size,
    continentesNombres: [...visitedContinents],

    kmTotales: Math.round(kmTotales),
    horasVuelo: Math.round(horasVuelo * 10) / 10,

    paisesMasVisitados,
    porcentajeContinentes: visitedContinents.size / ALL_CONTINENTS.length,
  };
}
