import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, Region } from 'react-native-maps';
import NavBar from '../components/NavBar';

const GOLD = '#d4af37';
const GREEN = '#3ecf72';
const BG = '#01050d';

interface Trip {
  id: string;
  tipo: 'real' | 'wishlist';
  ciudad: string;
  pais: string;
  fechaInicio: string | null;
  fotos: string[];
  portada: string | null;
  coords: { lat: number; lng: number } | null;
}

const WORLD: Region = {
  latitude: 20,
  longitude: 10,
  latitudeDelta: 130,
  longitudeDelta: 130,
};

// ─── PINES CUSTOM ─────────────────────────────────────────────────────────────

function PinReal() {
  return (
    <View style={pin.wrap}>
      <View style={[pin.circle, { backgroundColor: GREEN, borderColor: '#25a35a' }]}>
        <Text style={pin.icon}>✈</Text>
      </View>
      <View style={[pin.tail, { borderTopColor: GREEN }]} />
    </View>
  );
}

function PinWishlist() {
  return (
    <View style={pin.wrap}>
      <View style={[pin.circle, { backgroundColor: GOLD, borderColor: '#a88620' }]}>
        <Text style={pin.icon}>★</Text>
      </View>
      <View style={[pin.tail, { borderTopColor: GOLD }]} />
    </View>
  );
}

const pin = StyleSheet.create({
  wrap: { alignItems: 'center' },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  icon: { fontSize: 15, color: '#fff' },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function Mapa() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function load() {
      const raw = await AsyncStorage.getItem('trips');
      const all: Trip[] = raw ? JSON.parse(raw) : [];
      setTrips(all.filter((t) => t.coords?.lat != null && t.coords?.lng != null));
    }
    load();
    Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  const realCount = trips.filter((t) => t.tipo === 'real').length;
  const wishCount = trips.filter((t) => t.tipo === 'wishlist').length;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.mapWrap, { opacity }]}>
        <MapView
          style={styles.map}
          initialRegion={WORLD}
          mapType="standard"
          showsUserLocation={false}
          showsCompass={false}
          showsScale={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        >
          {trips.map((trip) => {
            if (!trip.coords) return null;
            const isReal = trip.tipo === 'real';
            const cover = trip.portada ?? trip.fotos[0] ?? null;

            return (
              <Marker
                key={trip.id}
                coordinate={{ latitude: trip.coords.lat, longitude: trip.coords.lng }}
                tracksViewChanges={false}
                onCalloutPress={!isReal ? () => router.push('/cargar') : undefined}
              >
                {isReal ? <PinReal /> : <PinWishlist />}

                <Callout tooltip>
                  {isReal ? (
                    <View style={styles.callout}>
                      {cover ? (
                        <Image source={{ uri: cover }} style={styles.calloutImg} />
                      ) : (
                        <View style={styles.calloutImgEmpty}>
                          <Text style={styles.calloutImgEmptyIcon}>✈</Text>
                        </View>
                      )}
                      <View style={styles.calloutBody}>
                        <Text style={styles.calloutCity}>{trip.ciudad}</Text>
                        <Text style={styles.calloutCountry}>{trip.pais}</Text>
                        {trip.fechaInicio ? (
                          <Text style={styles.calloutDate}>◆ {trip.fechaInicio}</Text>
                        ) : null}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.callout}>
                      <View style={styles.calloutBody}>
                        <View style={styles.wishBadge}>
                          <Text style={styles.wishBadgeText}>DESTINO FUTURO</Text>
                        </View>
                        <Text style={styles.calloutCity}>{trip.ciudad}</Text>
                        <Text style={styles.calloutCountry}>{trip.pais}</Text>
                        <View style={styles.calloutBtn}>
                          <Text style={styles.calloutBtnText}>Cargar viaje →</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        {/* Leyenda */}
        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: GREEN }]} />
            <Text style={styles.legendText}>
              {realCount} {realCount === 1 ? 'realizado' : 'realizados'}
            </Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: GOLD }]} />
            <Text style={styles.legendText}>
              {wishCount} {wishCount === 1 ? 'futuro' : 'futuros'}
            </Text>
          </View>
        </View>
      </Animated.View>

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
  mapWrap: {
    flex: 1,
  },
  map: {
    flex: 1,
  },

  // Leyenda
  legend: {
    position: 'absolute',
    top: 52,
    right: 14,
    backgroundColor: 'rgba(1,5,13,0.85)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#e8e0d0',
    fontWeight: '500',
  },

  // Callout base
  callout: {
    backgroundColor: '#0d1a2e',
    borderRadius: 14,
    overflow: 'hidden',
    minWidth: 190,
    maxWidth: 230,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  calloutImg: {
    width: '100%',
    height: 100,
  },
  calloutImgEmpty: {
    width: '100%',
    height: 70,
    backgroundColor: '#0b1525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutImgEmptyIcon: {
    fontSize: 28,
    opacity: 0.25,
  },
  calloutBody: {
    padding: 13,
    gap: 3,
  },
  calloutCity: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e8e0d0',
  },
  calloutCountry: {
    fontSize: 12,
    color: '#4a5a6a',
    marginTop: 1,
  },
  calloutDate: {
    marginTop: 6,
    fontSize: 11,
    color: GOLD,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Wishlist callout extras
  wishBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 5,
    paddingVertical: 3,
    paddingHorizontal: 7,
    marginBottom: 6,
  },
  wishBadgeText: {
    fontSize: 9,
    color: GOLD,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  calloutBtn: {
    marginTop: 10,
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  calloutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#01050d',
    letterSpacing: 0.3,
  },
});
