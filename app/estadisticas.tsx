import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import NavBar from '../components/NavBar';
import {
  ALL_CONTINENTS,
  StatsResult,
  Trip,
  calcularStats,
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

// ─── CONTINENTES ──────────────────────────────────────────────────────────────

function ContinentesSection({ stats }: { stats: StatsResult }) {
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

      {/* Barra general */}
      <View style={styles.progressWrap}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: GOLD }]} />
      </View>
      <Text style={styles.pctText}>{pct}% del mundo explorado</Text>

      {/* Lista de continentes */}
      <View style={styles.continentList}>
        {ALL_CONTINENTS.map((cont) => {
          const done = visited.has(cont);
          return (
            <View key={cont} style={styles.continentRow}>
              <View style={[styles.continentDot, done ? styles.continentDotOn : styles.continentDotOff]} />
              <Text style={[styles.continentName, !done && styles.continentNameOff]}>
                {cont}
              </Text>
              {done && <Text style={styles.continentCheck}>✓</Text>}
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

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function Estadisticas() {
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('trips');
        const allTrips: Trip[] = raw ? JSON.parse(raw) : [];
        setStats(calcularStats(allTrips));
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
          <ContinentesSection stats={stats} />
          <TopPaisesSection stats={stats} />
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
    fontSize: 28,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 0.5,
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

  // Continentes
  pctText: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 16,
    marginTop: 4,
  },
  continentList: {
    gap: 10,
  },
  continentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  continentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  continentDotOn: {
    backgroundColor: GOLD,
  },
  continentDotOff: {
    backgroundColor: BORDER,
  },
  continentName: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    fontWeight: '500',
  },
  continentNameOff: {
    color: MUTED,
  },
  continentCheck: {
    fontSize: 12,
    color: GOLD,
    fontWeight: '700',
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
