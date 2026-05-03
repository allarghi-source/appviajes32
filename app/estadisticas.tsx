import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
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

const { width: SCREEN_W } = Dimensions.get('window');
// On tablets (>640px) increase side padding so cards don't stretch wall-to-wall
const SIDE_PAD = Math.max(20, Math.round((SCREEN_W - 640) / 2));
// On tablets show 3 continent columns, phones keep 2
const CONT_CARD_W = SCREEN_W >= 600 ? '30%' : '47%';

const CONTINENT_ICON: Record<string, number> = {
  'América del Norte': require('../assets/continents/north_america.png'),
  'América del Sur':  require('../assets/continents/south_america.png'),
  'Europa':           require('../assets/continents/europe.png'),
  'África':           require('../assets/continents/africa.png'),
  'Asia':             require('../assets/continents/asia.png'),
  'Oceanía':          require('../assets/continents/oceania.png'),
};

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
              {CONTINENT_ICON[cont] && (
                <Image
                  source={CONTINENT_ICON[cont]}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    right: -20,
                    resizeMode: 'cover',
                    opacity: 0.48,
                  }}
                />
              )}
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
    textAlign: 'center',
  },

  scrollContent: {
    paddingHorizontal: SIDE_PAD,
    paddingVertical: 20,
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
    width: CONT_CARD_W,
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
