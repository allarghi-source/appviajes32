import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import {
  ALL_CONTINENT_IDS,
  ContinentId,
  StatsResult,
  Trip,
  calcularStats,
  getXpRestantes,
  resolveTripGeography,
} from '../utils/statsEngine';

// Conecta el ID estable de continente (utils/statsEngine.ts) con la clave que
// usa i18n/locales/{es,en}/ranks.json para el nombre visible -- las dos
// convenciones de nombres no coinciden 1 a 1 (north_america vs americaDelNorte).
const CONTINENT_NAME_KEY: Record<
  ContinentId,
  'americaDelNorte' | 'americaDelSur' | 'europa' | 'africa' | 'asia' | 'oceania'
> = {
  north_america: 'americaDelNorte',
  south_america: 'americaDelSur',
  europe: 'europa',
  africa: 'africa',
  asia: 'asia',
  oceania: 'oceania',
};

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

const CONTINENT_ICON: Record<ContinentId, number> = {
  north_america: require('../assets/continents/north_america.png'),
  south_america: require('../assets/continents/south_america.png'),
  europe:        require('../assets/continents/europe.png'),
  africa:        require('../assets/continents/africa.png'),
  asia:          require('../assets/continents/asia.png'),
  oceania:       require('../assets/continents/oceania.png'),
};

const TIER_COLOR: Record<string, string> = {
  bronce: '#cd7f32',
  plata: '#c0c0c0',
  oro: '#ffd700',
};

// Países soberanos por continente (denominador para el porcentaje)
const CONTINENT_TOTAL_COUNTRIES: Record<ContinentId, number> = {
  north_america: 23,
  south_america: 12,
  europe: 44,
  africa: 54,
  asia: 48,
  oceania: 14,
};


// ─── BARRA DE XP ──────────────────────────────────────────────────────────────

function XpSection({ stats }: { stats: StatsResult }) {
  const { t } = useTranslation('stats');
  const { t: tRanks } = useTranslation('ranks');
  const tierColor = TIER_COLOR[stats.rangoTier];
  const xpProgress = Math.max(1, Math.round(stats.progresoRango * 100));
  const xpRestantes = getXpRestantes(stats.xpTotal);
  const rangoActualNombre = tRanks(`names.${stats.rangoActualId}`);
  const siguienteRangoNombre = stats.siguienteRangoId ? tRanks(`names.${stats.siguienteRangoId}`) : null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{t('rank.label')}</Text>

      <View style={styles.rankRow}>
        <View style={[styles.rankBadge, { borderColor: tierColor }]}>
          <Text style={[styles.rankBadgeText, { color: tierColor }]}>
            {rangoActualNombre.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.xpNumber}>{stats.xpTotal}{t('rank.xpSuffix')}</Text>
      </View>

      <View style={styles.progressWrap}>
        <View style={[styles.progressFill, { width: `${xpProgress}%`, backgroundColor: tierColor }]} />
      </View>

      <View style={styles.progressLabels}>
        <Text style={[styles.progressLabel, { color: tierColor }]}>
          {rangoActualNombre}
        </Text>
        {siguienteRangoNombre ? (
          <Text style={styles.progressLabelRight}>
            {siguienteRangoNombre} {t('rank.arrow')}
          </Text>
        ) : (
          <Text style={[styles.progressLabelRight, { color: tierColor }]}>
            {t('rank.maxRank')}
          </Text>
        )}
      </View>
      {siguienteRangoNombre && xpRestantes !== null && (
        <Text style={styles.xpRestantesHint}>
          {t('rank.xpRemaining', { count: xpRestantes, nextRank: siguienteRangoNombre })}
        </Text>
      )}
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
  const { t } = useTranslation('stats');
  const { t: tRanks } = useTranslation('ranks');
  const pct = Math.round(stats.porcentajeContinentes * 100);
  const visited = new Set(stats.continentesIds);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardLabel}>{t('continents.label')}</Text>
        <Text style={styles.cardBadge}>
          {t('continents.counter', { count: stats.continentesVisitados, total: ALL_CONTINENT_IDS.length })}
        </Text>
      </View>

      <View style={styles.progressWrap}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: GOLD }]} />
      </View>
      <Text style={styles.pctText}>{t('continents.percentExplored', { percent: pct })}</Text>

      <View style={styles.continentGrid}>
        {ALL_CONTINENT_IDS.map((cont) => {
          const done = visited.has(cont);
          const trips = continentCounts[cont] ?? 0;
          const uniqueVisited = continentUniqueCountries[cont] ?? 0;
          const totalInContinent = CONTINENT_TOTAL_COUNTRIES[cont] ?? 1;
          const contPct = done ? Math.round((uniqueVisited / totalInContinent) * 100) : 0;
          const nombreContinente = tRanks(`continents.${CONTINENT_NAME_KEY[cont]}`);

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
                {done ? t('continents.percentVisited', { percent: contPct }) : t('continents.dash')}
              </Text>
              <Text style={[styles.continentCardName, !done && styles.continentCardNameOff]}>
                {nombreContinente}
              </Text>
              <Text style={[styles.continentCardTrips, !done && styles.continentCardTripsOff]}>
                {trips > 0
                  ? t('continents.tripCount', { count: trips })
                  : t('continents.notVisited')}
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
  const { t } = useTranslation('stats');

  if (stats.paisesMasVisitados.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('topCountries.label')}</Text>
        <Text style={styles.emptyText}>{t('topCountries.empty')}</Text>
      </View>
    );
  }

  const maxVisitas = stats.paisesMasVisitados[0].visitas;

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{t('topCountries.label')}</Text>
      <View style={styles.paisList}>
        {stats.paisesMasVisitados.map(({ pais, visitas }, i) => {
          const barW = Math.max(4, Math.round((visitas / maxVisitas) * 100));
          return (
            <View key={pais} style={styles.paisRow}>
              <Text style={styles.paisRank}>{t('topCountries.rankPrefix')}{i + 1}</Text>
              <View style={styles.paisInfo}>
                <View style={styles.paisNameRow}>
                  <Text style={styles.paisName}>{pais}</Text>
                  <Text style={styles.paisCount}>
                    {t('topCountries.visitCount', { count: visitas })}
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
  const { t } = useTranslation('stats');

  if (topCiudades.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('topCities.label')}</Text>
        <Text style={styles.emptyText}>{t('topCities.empty')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{t('topCities.label')}</Text>
      <View style={styles.cityList}>
        {topCiudades.map(({ ciudad, visitas }, i) => (
          <View key={ciudad} style={styles.cityRow}>
            <Text style={styles.paisRank}>{t('topCities.rankPrefix')}{i + 1}</Text>
            <Text style={styles.cityName}>{ciudad}</Text>
            <Text style={styles.cityCount}>
              {t('topCities.tripCount', { count: visitas })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function Estadisticas() {
  const { t } = useTranslation('stats');
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

        // Misma identidad geográfica que usa calcularStats (countryCode nativo
        // o resolución ISO2 local para históricos, con el texto como último
        // recurso) -- nunca una segunda lógica propia de esta pantalla, para
        // que el desglose por continente y el agregado nunca puedan diverger.
        const contMap: Record<string, number> = {};
        const contCountrySets: Record<string, Set<string>> = {};

        for (const trip of realTrips) {
          const { continentId: cont, countryKey } = resolveTripGeography(trip);
          if (cont) {
            contMap[cont] = (contMap[cont] ?? 0) + 1;
            if (!contCountrySets[cont]) contCountrySets[cont] = new Set();
            contCountrySets[cont].add(countryKey);
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
        <Text style={styles.title}>{t('title')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>{t('loading')}</Text>
        </View>
      ) : stats ? (
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
      ) : null}

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
  xpRestantesHint: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.3,
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

  emptyText: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginTop: 8,
  },

  bottomSpacer: { height: 12 },
});
