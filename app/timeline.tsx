import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import NavBar from '../components/NavBar';
import { playSound } from '../utils/soundEngine';

const BG = '#01050d';
const GOLD = '#d4af37';
const BORDER = '#1a2d46';
const TEXT = '#e8e0d0';
const MUTED = '#4a5a6a';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Layout constants — responsive
const CARD_H = Math.min(260, Math.max(185, Math.round(SCREEN_H * 0.25)));
const CAPTION_H = 66;
const ITEM_MB = 40;
const ITEM_H = CARD_H + CAPTION_H + ITEM_MB;
// Extra right padding on wide screens so cards don't stretch wall-to-wall on tablets
const LIST_PR = Math.max(20, 20 + Math.round(Math.max(0, SCREEN_W - 420) * 0.4));
const AXIS_X = 36;      // left edge of the golden line (2px wide, center at 37)
const CARD_START = 68;  // paddingLeft of the list → where cards begin
const DOT_R = 7;        // radius of axis dot
const BADGE_R = 16;     // radius of the chain sequence badge
const HEADER_H = 130;   // approximate header height
const LIST_PT = 24;
// Precomputed connector geometry (relative to card-left = CARD_START)
const AXIS_CENTER_X = AXIS_X + 1;                    // 37 (screen)
const DOT_LEFT = AXIS_CENTER_X - DOT_R - CARD_START; // -34 (rel. to card)
const BAR_LEFT = DOT_LEFT + DOT_R * 2;               // -20
const BAR_W = -BAR_LEFT;                             // 20

interface Trip {
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
}

// Formato guardado: "DD/MM/AAAA" (con barras)
function parseDate(s: string | null): Date {
  if (!s) return new Date(0);
  const parts = s.split(/[\/\-]/);
  if (parts.length !== 3) return new Date(0);
  const date = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  return isNaN(date.getTime()) ? new Date(0) : date;
}

function formatDate(s: string | null): string {
  if (!s) return '';
  const d = parseDate(s);
  if (d.getTime() === 0) return s;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

// ─── CARD ─────────────────────────────────────────────────────────────────────

function TripCard({
  trip,
  index,
  scrollY,
  onPress,
  chainIndex,
}: {
  trip: Trip;
  index: number;
  scrollY: Animated.Value;
  onPress: () => void;
  chainIndex: number;
}) {
  // Scroll Y value at which this card is centered on screen
  const itemCenterInContent = LIST_PT + index * ITEM_H + CARD_H / 2;
  const optimalScroll = HEADER_H + itemCenterInContent - SCREEN_H / 2;

  const scale = scrollY.interpolate({
    inputRange: [optimalScroll - ITEM_H, optimalScroll, optimalScroll + ITEM_H],
    outputRange: [0.75, 1, 0.75],
    extrapolate: 'clamp',
  });

  const opacity = scrollY.interpolate({
    inputRange: [optimalScroll - ITEM_H, optimalScroll, optimalScroll + ITEM_H],
    outputRange: [0.5, 1, 0.5],
    extrapolate: 'clamp',
  });

  const cover = trip.portada ?? trip.fotos[0] ?? null;

  return (
    <Animated.View style={[styles.itemWrap, { opacity, transform: [{ scale }] }]}>

      {/* Axis dot for normal trips; Roman numeral badge for chained trips */}
      {chainIndex > 0 ? (
        <View style={[styles.chainBadge, { top: CARD_H / 2 - BADGE_R }]}>
          <Text style={styles.chainBadgeText}>{toRoman(chainIndex)}</Text>
        </View>
      ) : (
        <View style={styles.axisDot} />
      )}

      {/* Short horizontal bar from dot to card edge */}
      <View style={styles.axisBar} />

      {/* Main card: image fills the whole rectangle */}
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImageEmpty]}>
            <Text style={styles.noPhotoIcon}>✈</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Caption below the card */}
      <View style={styles.caption}>
        <Text style={styles.captionCity} numberOfLines={1}>{trip.ciudad}</Text>
        <View style={styles.captionRow}>
          <Text style={styles.captionCountry}>{trip.pais}</Text>
          {trip.fechaInicio ? (
            <>
              <Text style={styles.captionSep}>·</Text>
              <Text style={styles.captionDate}>{formatDate(trip.fechaInicio)}</Text>
            </>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function Timeline() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const activeIndexRef = useRef(0);
  const tickQueueRef = useRef(0);
  const lastSoundTimeRef = useRef(0);
  const tickDrainRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (trips.length === 0) return;
    activeIndexRef.current = 0;
    tickQueueRef.current = 0;
    lastSoundTimeRef.current = 0;

    const MIN_TIC_MS = 85;

    function drainTicks() {
      if (tickQueueRef.current <= 0) { tickDrainRef.current = null; return; }
      playSound('tic');
      lastSoundTimeRef.current = Date.now();
      tickQueueRef.current--;
      tickDrainRef.current = tickQueueRef.current > 0 ? setTimeout(drainTicks, MIN_TIC_MS) : null;
    }

    function enqueueTics(count: number) {
      tickQueueRef.current += count;
      if (tickDrainRef.current !== null) return;
      const elapsed = Date.now() - lastSoundTimeRef.current;
      const delay = elapsed >= MIN_TIC_MS ? 0 : MIN_TIC_MS - elapsed;
      tickDrainRef.current = setTimeout(drainTicks, delay);
    }

    const id = scrollY.addListener(({ value }) => {
      let bestIndex = 0;
      let bestDist = Infinity;
      for (let i = 0; i < trips.length; i++) {
        const optimalScroll = HEADER_H + LIST_PT + i * ITEM_H + CARD_H / 2 - SCREEN_H / 2;
        const dist = Math.abs(value - optimalScroll);
        if (dist < bestDist) { bestDist = dist; bestIndex = i; }
      }
      if (bestIndex !== activeIndexRef.current) {
        const delta = Math.abs(bestIndex - activeIndexRef.current);
        activeIndexRef.current = bestIndex;
        enqueueTics(delta);
      }
    });

    return () => {
      scrollY.removeListener(id);
      if (tickDrainRef.current !== null) { clearTimeout(tickDrainRef.current); tickDrainRef.current = null; }
    };
  }, [trips]);

  useEffect(() => {
    async function load() {
      try {
        const raw = await AsyncStorage.getItem('trips');
        const all: Trip[] = raw ? JSON.parse(raw) : [];
        const sorted = all
          .filter((t) => t.tipo === 'real')
          .sort((a, b) => parseDate(a.fechaInicio).getTime() - parseDate(b.fechaInicio).getTime());
        setTrips(sorted);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const subtitle =
    trips.length > 0
      ? `${trips.length} viaje${trips.length !== 1 ? 's' : ''} realizado${trips.length !== 1 ? 's' : ''}`
      : 'Tus viajes realizados';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timeline</Text>
        <Text style={styles.headerSub}>{subtitle}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Cargando...</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>✈</Text>
          <Text style={styles.emptyTitle}>Todavía no hay viajes</Text>
          <Text style={styles.emptyHint}>
            Cargá tu primer viaje desde la sección Cargar
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {/* Fixed golden vertical axis – stays still while cards scroll */}
          <View style={styles.axisLine} pointerEvents="none" />

          <FlatList
            data={trips}
            keyExtractor={(t) => t.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            renderItem={({ item, index }) => {
              let chainIndex = 0;
              if (item.chainId) {
                let start = index;
                while (start > 0 && trips[start - 1].chainId === item.chainId) start--;
                chainIndex = index - start + 1;
              }
              return (
                <TripCard
                  trip={item}
                  index={index}
                  scrollY={scrollY}
                  onPress={() => router.push(`/detalle?id=${item.id}`)}
                  chainIndex={chainIndex}
                />
              );
            }}
          />
        </View>
      )}

      <NavBar />
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 13,
    color: MUTED,
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  listContainer: {
    flex: 1,
    position: 'relative',
  },

  // ── Golden vertical axis (fixed, behind cards) ──
  axisLine: {
    position: 'absolute',
    left: AXIS_X,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: GOLD,
    opacity: 0.6,
  },

  list: {
    paddingLeft: CARD_START,
    paddingRight: LIST_PR,
    paddingTop: LIST_PT,
    paddingBottom: 120,
  },

  itemWrap: {
    marginBottom: ITEM_MB,
    position: 'relative',
    overflow: 'visible',
  },

  // Dot that sits centered on the axis line
  axisDot: {
    position: 'absolute',
    left: DOT_LEFT,
    top: CARD_H / 2 - DOT_R,
    width: DOT_R * 2,
    height: DOT_R * 2,
    borderRadius: DOT_R,
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: BG,
    zIndex: 2,
  },

  // Chain sequence badge — replaces axisDot for trips that belong to a chain
  chainBadge: {
    position: 'absolute',
    left: AXIS_CENTER_X - CARD_START - BADGE_R,  // centered on axis line
    // top is set inline per card: CARD_H / 2 - BADGE_R
    width: BADGE_R * 2,
    height: BADGE_R * 2,
    borderRadius: BADGE_R,
    backgroundColor: BG,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  chainBadgeText: {
    fontFamily: 'Georgia',
    fontSize: 10,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1,
  },

  // Short horizontal bar connecting dot to card left edge
  axisBar: {
    position: 'absolute',
    left: BAR_LEFT,
    top: CARD_H / 2 - 1,
    width: BAR_W,
    height: 2,
    backgroundColor: GOLD,
    opacity: 0.4,
  },

  // ── Card: image fills the full rectangle ──
  card: {
    height: CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageEmpty: {
    backgroundColor: '#0d1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPhotoIcon: {
    fontSize: 40,
    opacity: 0.25,
  },
  // ── Caption below card ──
  caption: {
    marginTop: 10,
    paddingHorizontal: 4,
    gap: 3,
  },
  captionCity: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 0.2,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  captionCountry: {
    fontSize: 12,
    color: MUTED,
    letterSpacing: 0.3,
  },
  captionSep: {
    fontSize: 10,
    color: MUTED,
    opacity: 0.5,
  },
  captionDate: {
    fontSize: 11,
    color: GOLD,
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  // ── Empty / loading states ──
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  muted: { fontSize: 14, color: MUTED },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.25 },
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
});
