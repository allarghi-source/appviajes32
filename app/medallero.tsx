import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import NavBar from '../components/NavBar';
import {
  ALL_ACHIEVEMENTS,
  clearBadgeCount,
  loadUnlockedIds,
} from '../utils/achievementsEngine';

const GOLD    = '#d4af37';
const BG      = '#01050d';
const SURFACE = '#0d1a2e';
const BORDER  = '#1e3050';
const TEXT    = '#e8e0d0';
const MUTED   = '#4a5a6a';

const CATEGORY_ORDER = [
  'Progreso',
  'Continentes',
  'Comportamiento',
  'Planificación',
  'Cumplimiento',
  'Experiencia',
  'Actividad',
  'Especiales',
];

export default function Medallero() {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const ids = await loadUnlockedIds();
      setUnlocked(ids);
      await clearBadgeCount();
    })();
  }, []);

  const totalUnlocked = unlocked.size;
  const totalAll = ALL_ACHIEVEMENTS.length;
  const pct = totalAll > 0 ? (totalUnlocked / totalAll) * 100 : 0;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>Medallero</Text>
        <Text style={styles.subtitle}>
          {totalUnlocked} de {totalAll} logros desbloqueados
        </Text>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>

        {/* Categories */}
        {CATEGORY_ORDER.map((cat) => {
          const items = ALL_ACHIEVEMENTS.filter((a) => a.categoria === cat);
          return (
            <View key={cat} style={styles.section}>
              <Text style={styles.catTitle}>{cat.toUpperCase()}</Text>
              <View style={styles.grid}>
                {items.map((a) => {
                  const isUnlocked = unlocked.has(a.id);
                  return (
                    <View
                      key={a.id}
                      style={[styles.cell, isUnlocked && styles.cellOn]}
                    >
                      <Text style={[styles.cellStar, !isUnlocked && styles.cellStarOff]}>
                        {isUnlocked ? '★' : '◆'}
                      </Text>
                      <Text
                        style={[styles.cellName, !isUnlocked && styles.cellNameOff]}
                        numberOfLines={2}
                      >
                        {isUnlocked ? a.nombre : '???'}
                      </Text>
                      {isUnlocked ? (
                        <Text style={styles.cellDesc} numberOfLines={2}>
                          {a.descripcion}
                        </Text>
                      ) : (
                        <Text style={styles.cellLocked}>Bloqueado</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>
      <NavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },

  backRow: { marginBottom: 20 },
  backText: {
    fontSize: 14,
    color: GOLD,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  title: {
    fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 18,
  },

  progressTrack: {
    height: 4,
    backgroundColor: SURFACE,
    borderRadius: 2,
    marginBottom: 30,
    overflow: 'hidden',
    borderWidth: 0,
  },
  progressFill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 2,
  },

  section: { marginBottom: 26 },
  catTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2.5,
    marginBottom: 12,
    opacity: 0.65,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    width: '47.5%',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 5,
  },
  cellOn: {
    borderColor: 'rgba(212,175,55,0.42)',
    backgroundColor: 'rgba(212,175,55,0.055)',
  },

  cellStar: {
    fontSize: 26,
    color: GOLD,
    marginBottom: 2,
  },
  cellStarOff: {
    color: '#1e2a3a',
    fontSize: 20,
  },

  cellName: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
    textAlign: 'center',
    lineHeight: 18,
  },
  cellNameOff: {
    color: '#2a3a4a',
  },

  cellDesc: {
    fontSize: 10,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 1,
  },
  cellLocked: {
    fontSize: 10,
    color: '#1e2a3a',
    letterSpacing: 0.5,
    marginTop: 1,
  },
});
