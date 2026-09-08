import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, MarkerDragStartEndEvent, Region } from 'react-native-maps';
import Svg, { Circle, Path } from 'react-native-svg';
import NavBar from '../components/NavBar';
import { STORAGE_KEYS } from '../utils/backupEngine';
import { playSound, preloadSounds } from '../utils/soundEngine';

const GOLD = '#d4af37';
const GREEN = '#1a3a6e';
const BG = '#01050d';

// Posiciones visuales personalizadas de los pines (solo estéticas).
// Se guardan por separado de los datos del viaje: nunca tocan `coords`,
// que sigue siendo la fuente de verdad para stats, timeline, XP y logros.
const PIN_VISUAL_KEY = STORAGE_KEYS.pinVisualOverrides;

type VisualOverrides = Record<string, { lat: number; lng: number }>;

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

interface TripGroup {
  key: string;
  lat: number;
  lng: number;
  trips: Trip[];
  hasReal: boolean;
}

const WORLD: Region = {
  latitude: 20,
  longitude: 10,
  latitudeDelta: 130,
  longitudeDelta: 130,
};

// ─── PINES TIPO ALFILER ───────────────────────────────────────────────────────

function PinReal() {
  return (
    <Svg width={22} height={30} viewBox="0 0 22 30">
      <Path
        d="M11 1C5.5 1 1 5.5 1 11C1 18.5 11 29 11 29C11 29 21 18.5 21 11C21 5.5 16.5 1 11 1Z"
        fill={GREEN}
        stroke="#0d2550"
        strokeWidth={1}
      />
      <Circle cx={11} cy={11} r={3.5} fill="rgba(255,255,255,0.9)" />
    </Svg>
  );
}

function PinWishlist() {
  return (
    <Svg width={22} height={30} viewBox="0 0 22 30">
      <Path
        d="M11 1C5.5 1 1 5.5 1 11C1 18.5 11 29 11 29C11 29 21 18.5 21 11C21 5.5 16.5 1 11 1Z"
        fill={GOLD}
        stroke="#a88620"
        strokeWidth={1}
      />
      <Circle cx={11} cy={11} r={3.5} fill="rgba(255,255,255,0.9)" />
    </Svg>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function Mapa() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<TripGroup | null>(null);
  const [visualOverrides, setVisualOverrides] = useState<VisualOverrides>({});
  const [markerVersion, setMarkerVersion] = useState<Record<string, number>>({});
  const opacity = useRef(new Animated.Value(0)).current;

  // Recarga pins cada vez que la pantalla vuelve al foco (ej: después de guardar un viaje)
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('trips').then((raw) => {
        const all: Trip[] = raw ? JSON.parse(raw) : [];
        setTrips(all.filter((t) => t.coords?.lat != null && t.coords?.lng != null));
      });
      AsyncStorage.getItem(PIN_VISUAL_KEY).then((raw) => {
        setVisualOverrides(raw ? JSON.parse(raw) : {});
      });
    }, [])
  );

  // Posición visual efectiva de un pin: la corrección manual si existe, si no, la original.
  function getVisualCoordinate(group: TripGroup) {
    const override = visualOverrides[group.key];
    return override
      ? { latitude: override.lat, longitude: override.lng }
      : { latitude: group.lat, longitude: group.lng };
  }

  async function persistOverrides(next: VisualOverrides) {
    setVisualOverrides(next);
    try {
      await AsyncStorage.setItem(PIN_VISUAL_KEY, JSON.stringify(next));
    } catch {
      // best-effort — no bloquea el flujo principal
    }
  }

  function bumpMarkerVersion(groupKey: string) {
    setMarkerVersion((v) => ({ ...v, [groupKey]: (v[groupKey] ?? 0) + 1 }));
  }

  async function resetVisualPosition(groupKey: string) {
    if (!visualOverrides[groupKey]) return;
    const next = { ...visualOverrides };
    delete next[groupKey];
    await persistOverrides(next);
    bumpMarkerVersion(groupKey);
  }

  function handleDragEnd(group: TripGroup, event: MarkerDragStartEndEvent) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    Alert.alert(
      'Confirmar posición',
      '¿Guardar esta nueva posición del pin?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => bumpMarkerVersion(group.key),
        },
        {
          text: 'Guardar',
          onPress: () => {
            persistOverrides({ ...visualOverrides, [group.key]: { lat: latitude, lng: longitude } });
          },
        },
      ]
    );
  }

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    preloadSounds();
  }, []);

  // Group trips by rounded coordinate so overlapping pins merge
  const groups = useMemo<TripGroup[]>(() => {
    const map: Record<string, Trip[]> = {};
    for (const t of trips) {
      if (!t.coords) continue;
      const key = `${t.coords.lat.toFixed(3)},${t.coords.lng.toFixed(3)}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return Object.entries(map).map(([key, tripList]) => ({
      key,
      lat: tripList[0].coords!.lat,
      lng: tripList[0].coords!.lng,
      trips: tripList,
      hasReal: tripList.some((t) => t.tipo === 'real'),
    }));
  }, [trips]);

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
          {groups.map((group) => (
            <Marker
              key={`${group.key}-${markerVersion[group.key] ?? 0}`}
              coordinate={getVisualCoordinate(group)}
              tracksViewChanges={false}
              draggable
              onDragEnd={(e) => handleDragEnd(group, e)}
              onPress={() => { playSound('ding'); setSelectedGroup(group); }}
            >
              {group.hasReal ? <PinReal /> : <PinWishlist />}
            </Marker>
          ))}
        </MapView>

        {/* Overlay card — aparece al tocar un pin */}
        {selectedGroup && (
          <View style={styles.overlayWrap}>
            <TouchableOpacity
              style={styles.overlayBackdrop}
              activeOpacity={1}
              onPress={() => setSelectedGroup(null)}
            />
            <View style={styles.overlayCard}>
              <View style={styles.overlayHandle} />
              <View style={styles.overlayHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.overlayCity}>{selectedGroup.trips[0].ciudad}</Text>
                  <Text style={styles.overlayCountry}>{selectedGroup.trips[0].pais}</Text>
                  {visualOverrides[selectedGroup.key] && (
                    <TouchableOpacity
                      onPress={() => resetVisualPosition(selectedGroup.key)}
                      activeOpacity={0.7}
                      style={styles.resetPinBtn}
                    >
                      <Text style={styles.resetPinText}>↺  Restablecer posición original del pin</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.overlayCloseBtn}
                  onPress={() => setSelectedGroup(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.overlayCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.overlayScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {selectedGroup.trips.map((trip) => {
                  const cover = trip.portada ?? trip.fotos[0] ?? null;
                  const isReal = trip.tipo === 'real';
                  return (
                    <TouchableOpacity
                      key={trip.id}
                      style={styles.tripRow}
                      activeOpacity={isReal ? 1 : 0.7}
                      onPress={
                        !isReal
                          ? () => {
                              setSelectedGroup(null);
                              router.push({
                                pathname: '/cargar',
                                params: {
                                  ciudad: trip.ciudad,
                                  pais: trip.pais,
                                  lat: String(trip.coords?.lat ?? ''),
                                  lng: String(trip.coords?.lng ?? ''),
                                  wishlistId: trip.id,
                                },
                              });
                            }
                          : undefined
                      }
                    >
                      {cover ? (
                        <Image source={{ uri: cover }} style={styles.tripRowImg} />
                      ) : (
                        <View style={[
                          styles.tripRowImgEmpty,
                          { borderColor: isReal ? GREEN : GOLD },
                        ]}>
                          <View style={[
                            styles.tripRowImgDot,
                            { backgroundColor: isReal ? GREEN : GOLD },
                          ]} />
                        </View>
                      )}
                      <View style={styles.tripRowInfo}>
                        <Text style={styles.tripRowCity}>{trip.ciudad}</Text>
                        <Text style={styles.tripRowCountry}>{trip.pais}</Text>
                        {isReal && trip.fechaInicio ? (
                          <Text style={styles.tripRowDate}>◆ {trip.fechaInicio}</Text>
                        ) : !isReal ? (
                          <View style={styles.tripRowBadge}>
                            <Text style={styles.tripRowBadgeText}>PENDIENTE</Text>
                          </View>
                        ) : null}
                      </View>
                      {!isReal && (
                        <View style={styles.logroAction}>
                          <Text style={styles.logroText}>¡Lo logré!</Text>
                          <Text style={styles.logroCheck}>✔</Text>
                          <Text style={styles.tripRowArrow}>→</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
                <View style={{ height: 8 }} />
              </ScrollView>
            </View>
          </View>
        )}
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

  // Overlay backdrop + card
  overlayWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  overlayBackdrop: {
    flex: 1,
  },
  overlayCard: {
    backgroundColor: '#0d1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.22)',
    maxHeight: '55%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 16,
  },
  overlayHandle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(212,175,55,0.12)',
  },
  overlayCity: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e8e0d0',
    letterSpacing: 0.3,
  },
  overlayCountry: {
    fontSize: 12,
    color: '#4a5a6a',
    marginTop: 2,
  },
  resetPinBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  resetPinText: {
    fontSize: 11,
    color: GOLD,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  overlayCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  overlayCloseText: {
    fontSize: 12,
    color: '#6b7a8d',
    fontWeight: '700',
  },
  overlayScroll: {
    paddingTop: 4,
  },

  // Trip rows inside overlay
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  tripRowImg: {
    width: 52,
    height: 52,
    borderRadius: 8,
    flexShrink: 0,
  },
  tripRowImgEmpty: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
    backgroundColor: '#0b1525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripRowImgDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.5,
  },
  tripRowInfo: {
    flex: 1,
    gap: 2,
  },
  tripRowCity: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e8e0d0',
  },
  tripRowCountry: {
    fontSize: 12,
    color: '#4a5a6a',
  },
  tripRowDate: {
    fontSize: 11,
    color: GOLD,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 3,
  },
  tripRowBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginTop: 4,
  },
  tripRowBadgeText: {
    fontSize: 9,
    color: GOLD,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tripRowArrow: {
    fontSize: 16,
    color: GOLD,
    opacity: 0.6,
    flexShrink: 0,
  },

  logroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  logroText: {
    fontSize: 12,
    color: GOLD,
    fontWeight: '700',
  },
  logroCheck: {
    fontSize: 12,
    color: GOLD,
    fontWeight: '700',
  },
});
