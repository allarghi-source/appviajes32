import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import NavBar from '../components/NavBar';
import {
  ALL_CONTINENTS,
  StatsResult,
  Trip,
  calcularStats,
  getContinent,
} from '../utils/statsEngine';

const BG = '#01050d';
const GOLD = '#d4af37';
const SURFACE = '#0b1525';
const BORDER = '#1a2d46';
const TEXT = '#e8e0d0';
const MUTED = '#4a5a6a';

const TIER_COLOR: Record<string, string> = {
  bronce: '#cd7f32',
  plata: '#c0c0c0',
  oro: '#ffd700',
};

// Países soberanos por continente (denominador para el porcentaje)
const CONTINENT_TOTAL_COUNTRIES: Record<string, number> = {
  'América del Norte': 23,
  'América del Sur': 12,
  'Europa': 44,
  'África': 54,
  'Asia': 48,
  'Oceanía': 14,
};

// Siluetas geográficas por continente — viewBox 0 0 64 64 (todos los puntos dentro del rango)
const CONTINENT_PATHS: Record<string, string[]> = {
  // Ancha arriba (Canadá), se estrecha hacia Centroamérica abajo a la derecha
  'América del Norte': [
    'M4,8 Q18,4 34,4 Q50,4 58,12 Q62,20 58,28 Q60,36 54,42 Q50,48 44,50 Q38,56 32,56 Q24,54 16,48 Q8,40 6,28 Q2,18 4,8 Z',
  ],
  // Pera: ancha al norte con bulge de Brasil al este, estrecha al sur
  'América del Sur': [
    'M16,5 Q28,2 42,6 Q54,14 58,26 Q60,38 54,50 Q46,60 36,62 Q24,62 16,52 Q8,42 8,28 Q8,16 16,5 Z',
  ],
  // Compacta e irregular (Iberia abajo-izquierda, Escandinavia arriba)
  'Europa': [
    'M18,5 Q32,2 44,6 Q54,12 58,22 Q60,30 54,36 Q58,44 48,50 Q36,54 24,52 Q12,48 6,38 Q2,28 6,16 Q10,6 18,5 Z',
  ],
  // Norte plano, bulge oeste (Golfo de Guinea), taper claro hacia el Cabo
  'África': [
    'M14,5 Q28,3 44,6 Q54,12 58,22 Q60,32 56,42 Q52,52 42,58 Q34,62 26,60 Q16,54 10,44 Q4,32 4,20 Q6,10 14,5 Z',
  ],
  // El más grande y ancho: ocupa casi todo el viewBox horizontalmente
  'Asia': [
    'M4,16 Q14,8 30,5 Q46,3 58,8 Q62,14 60,24 Q62,34 58,42 Q60,50 50,56 Q38,62 24,62 Q12,60 6,52 Q2,42 2,30 Q2,22 4,16 Z',
  ],
  // Australia (rectangular con costa norte irregular) + silueta NZ
  'Oceanía': [
    'M6,22 Q20,14 36,14 Q46,12 52,18 Q58,20 60,30 Q62,42 52,52 Q40,60 24,58 Q10,54 4,42 Q2,32 6,22 Z',
    'M55,10 Q57,8 60,12 Q59,16 56,16 Q54,14 55,10 Z',
  ],
};

function ContinentShape({ name, visited }: { name: string; visited: boolean }) {
  const paths = CONTINENT_PATHS[name];
  if (!paths) return null;
  const color = visited ? GOLD : MUTED;
  return (
    <Svg width={58} height={58} viewBox="0 0 64 64">
      {paths.map((d, i) => (
        <Path key={i} d={d} fill={color} />
      ))}
    </Svg>
  );
}

// ─── BARRA DE XP ──────────────────────────────────────────────────────────────

function XpSection({ stats }: { stats: StatsResult }) {
  const tierColor = TIER_COLOR[stats.rangoTier];
  const xpProgress = Math.max(1, Math.round(stats.progresoRango * 100));

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>RANGO ACTUAL</Text>

      <View style={styles.rankRow}>
        <View style={[styles.rankBadge, { borderColor: tierColor }]}>
          <Text style={[styles.rankBadgeText, { color: tierColor }]}>
            {stats.rangoActual.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.xpNumber}>{stats.xpTotal} XP</Text>
      </View>

      <View style={styles.progressWrap}>
        <View style={[styles.progressFill, { width: `${xpProgress}%`, backgroundColor: tierColor }]} />
      </View>

      <View style={styles.progressLabels}>
        <Text style={[styles.progressLabel, { color: tierColor }]}>
          {stats.rangoActual}
        </Text>
        {stats.siguienteRango ? (
          <Text style={styles.progressLabelRight}>
            {stats.siguienteRango} →
          </Text>
        ) : (
          <Text style={[styles.progressLabelRight, { color: tierColor }]}>
            MÁXIMO ★
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── CONTINENTES (GRID) ───────────────────────────────────────────────────────

function ContinentesSection({
  stats,
  continentCounts,
  continentUniqueCountries,
}: {
  stats: StatsResult;
  continentCounts: Record<string, number>;
  continentUniqueCountries: Record<string, number>;
}) {
  const pct = Math.round(stats.porcentajeContinentes * 100);
  const visited = new Set(stats.continentesNombres);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardLabel}>CONTINENTES</Text>
        <Text style={styles.cardBadge}>
          {stats.continentesVisitados} / {ALL_CONTINENTS.length}
        </Text>
      </View>

      <View style={styles.progressWrap}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: GOLD }]} />
      </View>
      <Text style={styles.pctText}>{pct}% del mundo explorado</Text>

      <View style={styles.continentGrid}>
        {ALL_CONTINENTS.map((cont) => {
          const done = visited.has(cont);
          const trips = continentCounts[cont] ?? 0;
          const uniqueVisited = continentUniqueCountries[cont] ?? 0;
          const totalInContinent = CONTINENT_TOTAL_COUNTRIES[cont] ?? 1;
          const contPct = done ? Math.round((uniqueVisited / totalInContinent) * 100) : 0;

          return (
            <View key={cont} style={[styles.continentCard, !done && styles.continentCardOff]}>
              <View pointerEvents="none" style={styles.continentShapeWrap}>
                <ContinentShape name={cont} visited={done} />
              </View>
              <Text style={[styles.continentPct, !done && styles.continentPctOff]}>
                {done ? `${contPct}%` : '—'}
              </Text>
              <Text style={[styles.continentCardName, !done && styles.continentCardNameOff]}>
                {cont}
              </Text>
              <Text style={[styles.continentCardTrips, !done && styles.continentCardTripsOff]}>
                {trips > 0
                  ? `${trips} ${trips === 1 ? 'viaje' : 'viajes'}`
                  : 'Sin visitar'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── TOP PAÍSES ───────────────────────────────────────────────────────────────

function TopPaisesSection({ stats }: { stats: StatsResult }) {
  if (stats.paisesMasVisitados.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>TOP PAÍSES</Text>
        <Text style={styles.emptyText}>Todavía no hay viajes cargados</Text>
      </View>
    );
  }

  const maxVisitas = stats.paisesMasVisitados[0].visitas;

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>TOP PAÍSES MÁS VISITADOS</Text>
      <View style={styles.paisList}>
        {stats.paisesMasVisitados.map(({ pais, visitas }, i) => {
          const barW = Math.max(4, Math.round((visitas / maxVisitas) * 100));
          return (
            <View key={pais} style={styles.paisRow}>
              <Text style={styles.paisRank}>#{i + 1}</Text>
              <View style={styles.paisInfo}>
                <View style={styles.paisNameRow}>
                  <Text style={styles.paisName}>{pais}</Text>
                  <Text style={styles.paisCount}>
                    {visitas} {visitas === 1 ? 'vez' : 'veces'}
                  </Text>
                </View>
                <View style={styles.paisBarBg}>
                  <View style={[styles.paisBarFill, { width: `${barW}%` }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── TOP CIUDADES ─────────────────────────────────────────────────────────────

function TopCiudadesSection({
  topCiudades,
}: {
  topCiudades: Array<{ ciudad: string; visitas: number }>;
}) {
  if (topCiudades.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>TOP CIUDADES MÁS VISITADAS</Text>
      <View style={styles.cityList}>
        {topCiudades.map(({ ciudad, visitas }, i) => (
          <View key={ciudad} style={styles.cityRow}>
            <Text style={styles.paisRank}>#{i + 1}</Text>
            <Text style={styles.cityName}>{ciudad}</Text>
            <Text style={styles.cityCount}>
              {visitas} {visitas === 1 ? 'viaje' : 'viajes'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function Estadisticas() {
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [continentCounts, setContinentCounts] = useState<Record<string, number>>({});
  const [continentUniqueCountries, setContinentUniqueCountries] = useState<Record<string, number>>({});
  const [topCiudades, setTopCiudades] = useState<Array<{ ciudad: string; visitas: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('trips');
        const allTrips: Trip[] = raw ? JSON.parse(raw) : [];
        setStats(calcularStats(allTrips));

        const realTrips = allTrips.filter((t) => t.tipo === 'real');

        // Misma normalización que statsEngine usa internamente
        const normPais = (s: string) =>
          s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

        const contMap: Record<string, number> = {};
        const contCountrySets: Record<string, Set<string>> = {};

        for (const trip of realTrips) {
          const cont = getContinent(trip.pais);
          if (cont) {
            contMap[cont] = (contMap[cont] ?? 0) + 1;
            if (!contCountrySets[cont]) contCountrySets[cont] = new Set();
            contCountrySets[cont].add(normPais(trip.pais));
          }
        }

        const uniqueByContinent: Record<string, number> = {};
        for (const [cont, set] of Object.entries(contCountrySets)) {
          uniqueByContinent[cont] = set.size;
        }

        setContinentCounts(contMap);
        setContinentUniqueCountries(uniqueByContinent);

        const cityMap: Record<string, number> = {};
        for (const trip of realTrips) {
          if (trip.ciudad) {
            cityMap[trip.ciudad] = (cityMap[trip.ciudad] ?? 0) + 1;
          }
        }
        const sorted = Object.entries(cityMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([ciudad, visitas]) => ({ ciudad, visitas }));
        setTopCiudades(sorted);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Estadísticas</Text>
        <Text style={styles.subtitle}>Tu resumen de viajero</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>Cargando...</Text>
        </View>
      ) : !stats || stats.paisesVisitados === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>◎</Text>
          <Text style={styles.emptyTitle}>Sin estadísticas aún</Text>
          <Text style={styles.emptyHint}>
            Cargá tus viajes reales para ver tus stats aquí
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <XpSection stats={stats} />
          <ContinentesSection
            stats={stats}
            continentCounts={continentCounts}
            continentUniqueCountries={continentUniqueCountries}
          />
          <TopPaisesSection stats={stats} />
          <TopCiudadesSection topCiudades={topCiudades} />
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      <NavBar />
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  mutedText: { color: MUTED, fontSize: 14 },

  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  title: {
   fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: MUTED,
    letterSpacing: 0.3,
  },

  scrollContent: {
    padding: 20,
    gap: 14,
  },

  // Card base
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
  },

  // XP section
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  rankBadge: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  xpNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: 0.5,
  },
  progressWrap: {
    height: 6,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressLabelRight: {
    fontSize: 11,
    color: MUTED,
    letterSpacing: 0.5,
  },

  // Continentes – barra general
  pctText: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 16,
    marginTop: 4,
  },

  // Continentes – grid de tarjetas
  continentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  continentCard: {
    width: '47%',
    backgroundColor: 'rgba(212,175,55,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  continentCardOff: {
    backgroundColor: 'rgba(26,45,70,0.25)',
    borderColor: BORDER,
  },
  continentShapeWrap: {
    position: 'absolute',
    right: -8,
    top: -4,
    opacity: 0.13,
  },
  continentPct: {
    fontSize: 26,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: -0.5,
    marginBottom: 3,
  },
  continentPctOff: {
    fontSize: 22,
    color: MUTED,
  },
  continentCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT,
    marginBottom: 4,
    lineHeight: 16,
  },
  continentCardNameOff: {
    color: MUTED,
  },
  continentCardTrips: {
    fontSize: 11,
    color: GOLD,
    opacity: 0.7,
  },
  continentCardTripsOff: {
    color: MUTED,
    opacity: 1,
  },

  // Top países
  paisList: {
    gap: 14,
  },
  paisRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  paisRank: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '700',
    width: 24,
    marginTop: 2,
  },
  paisInfo: {
    flex: 1,
    gap: 6,
  },
  paisNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paisName: {
    fontSize: 14,
    color: TEXT,
    fontWeight: '600',
  },
  paisCount: {
    fontSize: 12,
    color: MUTED,
  },
  paisBarBg: {
    height: 4,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  paisBarFill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 2,
    opacity: 0.7,
  },

  // Top ciudades
  cityList: {
    gap: 12,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cityName: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    fontWeight: '600',
  },
  cityCount: {
    fontSize: 12,
    color: MUTED,
  },

  // Empty state
  emptyIcon: {
    fontSize: 40,
    marginBottom: 14,
    opacity: 0.2,
    color: TEXT,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginTop: 8,
  },

  bottomSpacer: { height: 12 },
});
