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

const BG = '#01050d';
const GOLD = '#d4af37';
const BORDER = '#1a2d46';
const TEXT = '#e8e0d0';
const MUTED = '#4a5a6a';

const { height: SCREEN_H } = Dimensions.get('window');

// Layout constants
const CARD_H = 215;
const CAPTION_H = 66;
const ITEM_MB = 40;
const ITEM_H = CARD_H + CAPTION_H + ITEM_MB;
const AXIS_X = 36;      // left edge of the golden line (2px wide, center at 37)
const CARD_START = 68;  // paddingLeft of the list → where cards begin
const DOT_R = 7;        // radius of axis dot
const HEADER_H = 130;   // approximate header height
const LIST_PT = 24;

// Precomputed connector geometry (relative to card-left = CARD_START)
const AXIS_CENTER_X = AXIS_X + 1;                    // 37 (screen)
const DOT_LEFT = AXIS_CENTER_X - DOT_R - CARD_START; // -34 (rel. to card)
const BAR_LEFT = DOT_LEFT + DOT_R * 2;               // -20
const BAR_W = -BAR_LEFT;                             // 20
const CHAIN_WRAP_LEFT = AXIS_CENTER_X - CARD_START - 2; // -29 (centers 4px dot on axis)

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

// ─── CARD ─────────────────────────────────────────────────────────────────────

function TripCard({
  trip,
  index,
  scrollY,
  onPress,
  isChained,
}: {
  trip: Trip;
  index: number;
  scrollY: Animated.Value;
  onPress: () => void;
  isChained: boolean;
}) {
  // Scroll Y value at which this card is centered on screen
  const itemCenterInContent = LIST_PT + index * ITEM_H + CARD_H / 2;
  const optimalScroll = HEADER_H + itemCenterInContent - SCREEN_H / 2;

  const scale = scrollY.interpolate({
    inputRange: [optimalScroll - ITEM_H, optimalScroll, optimalScroll + ITEM_H],
    outputRange: [0.82, 1, 0.82],
    extrapolate: 'clamp',
  });

  const opacity = scrollY.interpolate({
    inputRange: [optimalScroll - ITEM_H, optimalScroll, optimalScroll + ITEM_H],
    outputRange: [0.38, 1, 0.38],
    extrapolate: 'clamp',
  });

  const cover = trip.portada ?? trip.fotos[0] ?? null;

  return (
    <Animated.View style={[styles.itemWrap, { opacity, transform: [{ scale }] }]}>

      {/* Multi-destination connector: 3 dots between this and previous chained card */}
      {isChained && (
        <View style={styles.chainWrap}>
          <View style={styles.chainDot} />
          <View style={styles.chainDot} />
          <View style={styles.chainDot} />
        </View>
      )}

      {/* Axis dot – sits on top of the golden line */}
      <View style={styles.axisDot} />

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
        {/* Dark vignette at bottom for legibility */}
        <View style={styles.cardVignette} />
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
              const prev = index > 0 ? trips[index - 1] : null;
              const isChained = !!(item.chainId && prev?.chainId === item.chainId);
              return (
                <TripCard
                  trip={item}
                  index={index}
                  scrollY={scrollY}
                  onPress={() => router.push(`/detalle?id=${item.id}`)}
                  isChained={isChained}
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
    paddingRight: 20,
    paddingTop: LIST_PT,
    paddingBottom: 120,
  },

  itemWrap: {
    marginBottom: ITEM_MB,
    position: 'relative',
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

  // Three dots between chained (multi-destination) cards
  chainWrap: {
    position: 'absolute',
    left: CHAIN_WRAP_LEFT,
    top: -(ITEM_MB / 2 + 8),
    width: 4,
    alignItems: 'center',
    gap: 5,
  },
  chainDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
    opacity: 0.55,
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
  cardVignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: 'rgba(1,5,13,0.52)',
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
