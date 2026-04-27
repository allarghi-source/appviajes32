import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
const SURFACE = '#0b1525';
const BORDER = '#1a2d46';
const TEXT = '#e8e0d0';
const MUTED = '#4a5a6a';

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
  onPress,
}: {
  trip: Trip;
  index: number;
  onPress: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: Math.min(index, 8) * 75,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay: Math.min(index, 8) * 75,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const cover = trip.portada ?? trip.fotos[0] ?? null;

  return (
    <Animated.View style={[styles.cardWrap, { opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverEmpty]}>
            <Text style={styles.coverEmptyIcon}>✈</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.city} numberOfLines={1}>{trip.ciudad}</Text>
          <Text style={styles.country} numberOfLines={1}>{trip.pais}</Text>
          {trip.fechaInicio ? (
            <View style={styles.dateRow}>
              <Text style={styles.dateDot}>◆</Text>
              <Text style={styles.date}>{formatDate(trip.fechaInicio)}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function Timeline() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

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
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <TripCard
              trip={item}
              index={index}
              onPress={() => router.push(`/detalle?id=${item.id}`)}
            />
          )}
        />
      )}

      <NavBar />
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 0.5,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 13,
    color: MUTED,
    letterSpacing: 0.3,
  },

  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },

  cardWrap: {
    marginBottom: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    padding: 12,
    gap: 14,
  },

  cover: {
    width: 72,
    height: 72,
    borderRadius: 10,
    flexShrink: 0,
  },
  coverEmpty: {
    backgroundColor: '#0d1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  coverEmptyIcon: {
    fontSize: 28,
    opacity: 0.35,
  },

  info: {
    flex: 1,
    gap: 3,
  },
  city: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 0.2,
  },
  country: {
    fontSize: 13,
    color: MUTED,
    letterSpacing: 0.3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  dateDot: {
    fontSize: 6,
    color: GOLD,
  },
  date: {
    fontSize: 11,
    color: GOLD,
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  arrow: {
    fontSize: 22,
    color: MUTED,
    marginRight: 2,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  muted: {
    fontSize: 14,
    color: MUTED,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.25,
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
});
