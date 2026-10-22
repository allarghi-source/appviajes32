import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, MarkerDragStartEndEvent } from 'react-native-maps';
import CompartirXpTab from '../components/map/CompartirXpTab';
import OtrosXpTab from '../components/map/OtrosXpTab';
import PinSheetHeader from '../components/map/PinSheetHeader';
import { PinReal, PinWishlist, WORLD } from '../components/map/Pins';
import SocialTabs, { MapSection } from '../components/map/SocialTabs';
import NavBar from '../components/NavBar';
import { AUTH_RETURN_TO_OTROS } from '../utils/auth';
import { STORAGE_KEYS } from '../utils/backupEngine';
import { resolveFotoUri } from '../utils/fotoPersistente';
import {
  futureTripLabel,
  groupTripsByPlace,
  PlaceGroup,
  visualCoordinate,
  visualOverrideKey,
  VisualOverrides,
  withMovedPin,
  withResetPin,
} from '../utils/mapGrouping';
import { decodeFoco, mapFocusCoordinates } from '../utils/postSaveFocus';
import { playSound, preloadSounds } from '../utils/soundEngine';

const GOLD = '#d4af37';
const GREEN = '#1a3a6e';
const BG = '#01050d';

// Posiciones visuales personalizadas de los pines (solo estéticas).
// Se guardan por separado de los datos del viaje: nunca tocan `coords`,
// que sigue siendo la fuente de verdad para stats, timeline, XP y logros.
const PIN_VISUAL_KEY = STORAGE_KEYS.pinVisualOverrides;

interface Trip {
  id: string;
  tipo: 'real' | 'wishlist';
  ciudad: string;
  pais: string;
  countryCode?: string;
  fechaInicio: string | null;
  fotos: string[];
  portada: string | null;
  coords: { lat: number; lng: number } | null;
}

type TripGroup = PlaceGroup<Trip>;

// Enfoque al llegar desde Cargar con un deseo recién guardado (ver
// utils/postSaveFocus.ts): acercamiento a un pin, o encuadre de varios.
const FOCUS_DELTA = 3;
const FOCUS_FIT_PADDING = { top: 80, right: 60, bottom: 80, left: 60 };

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function Mapa() {
  const { t } = useTranslation('map');
  const router = useRouter();
  const { foco, seccion } = useLocalSearchParams<{ foco?: string; seccion?: string }>();

  // Llegada después de iniciar sesión desde el acceso a mapas compartidos
  // (app/auth/login.tsx): abre directamente en "Otros XP". Si el parámetro
  // llega con la pantalla ya montada, se aplica al cambiar (patrón de ajustar
  // estado durante el render, sin efecto). Después se limpia, para que volver
  // más tarde a esta pantalla no reabra "Otros XP" sin motivo.
  const [activeSection, setActiveSection] = useState<MapSection>(() =>
    seccion === AUTH_RETURN_TO_OTROS ? 'others' : 'mine'
  );
  const [seccionAplicada, setSeccionAplicada] = useState(seccion);
  if (seccion !== seccionAplicada) {
    setSeccionAplicada(seccion);
    if (seccion === AUTH_RETURN_TO_OTROS) setActiveSection('others');
  }
  useEffect(() => {
    if (seccion) router.setParams({ seccion: '' });
  }, [seccion, router]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<TripGroup | null>(null);
  const [visualOverrides, setVisualOverrides] = useState<VisualOverrides>({});
  const [markerVersion, setMarkerVersion] = useState<Record<string, number>>({});
  const opacity = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tripsLoaded, setTripsLoaded] = useState(false);
  const [overridesLoaded, setOverridesLoaded] = useState(false);

  // Recarga pins cada vez que la pantalla vuelve al foco (ej: después de guardar un viaje)
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('trips').then((raw) => {
        const all: Trip[] = raw ? JSON.parse(raw) : [];
        setTrips(all.filter((t) => t.coords?.lat != null && t.coords?.lng != null));
        setTripsLoaded(true);
      });
      AsyncStorage.getItem(PIN_VISUAL_KEY).then((raw) => {
        setVisualOverrides(raw ? JSON.parse(raw) : {});
        setOverridesLoaded(true);
      });
    }, [])
  );

  // Llegada desde Cargar con `foco` (ids del deseo recién guardado): la
  // cámara va UNA vez a la posición visual de sus pines, recién cuando el
  // mapa está listo y viajes + posiciones manuales ya se cargaron. No abre
  // ninguna tarjeta. Después se limpia el parámetro para que volver al mapa
  // no re-enfoque. Si no se encuentra nada, el mapa queda como siempre.
  const focoHandledRef = useRef(false);
  const groups = useMemo<TripGroup[]>(() => groupTripsByPlace(trips), [trips]);

  useEffect(() => {
    if (focoHandledRef.current || !mapReady || !tripsLoaded || !overridesLoaded) return;
    const ids = decodeFoco(foco);
    if (ids.length === 0) return;
    focoHandledRef.current = true;
    router.setParams({ foco: '' });
    const coords = mapFocusCoordinates(groups, visualOverrides, ids);
    if (coords.length === 1) {
      mapRef.current?.animateToRegion(
        { ...coords[0], latitudeDelta: FOCUS_DELTA, longitudeDelta: FOCUS_DELTA },
        800,
      );
    } else if (coords.length > 1) {
      mapRef.current?.fitToCoordinates(coords, { edgePadding: FOCUS_FIT_PADDING, animated: true });
    }
  }, [mapReady, tripsLoaded, overridesLoaded, foco, groups, visualOverrides, router]);

  // Posición visual efectiva de un pin: el ajuste manual si existe (también los
  // guardados antes del catálogo de ciudades), si no, la posición del lugar.
  // Solo para dibujar: nunca toca las coordenadas de los viajes.
  function getVisualCoordinate(group: TripGroup) {
    return visualCoordinate(group, visualOverrides);
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

  async function resetVisualPosition(group: TripGroup) {
    if (!visualOverrideKey(group, visualOverrides)) return;
    await persistOverrides(withResetPin(visualOverrides, group));
    bumpMarkerVersion(group.key);
  }

  function handleDragEnd(group: TripGroup, event: MarkerDragStartEndEvent) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    Alert.alert(
      t('repositionAlert.title'),
      t('repositionAlert.message'),
      [
        {
          text: t('repositionAlert.cancel'),
          style: 'cancel',
          onPress: () => bumpMarkerVersion(group.key),
        },
        {
          text: t('repositionAlert.save'),
          onPress: () => {
            // Solo la posición visual: las coordenadas de los viajes no cambian.
            persistOverrides(withMovedPin(visualOverrides, group, { lat: latitude, lng: longitude }));
          },
        },
      ]
    );
  }

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    preloadSounds();
  }, []);

  return (
    <View style={styles.root}>
      <SocialTabs active={activeSection} onChange={setActiveSection} />

      <View style={styles.sectionContainer}>
      {activeSection === 'mine' && (
      <Animated.View style={[styles.mapWrap, { opacity }]}>
        <MapView
          ref={mapRef}
          onMapReady={() => setMapReady(true)}
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
              <PinSheetHeader
                city={selectedGroup.trips[0].ciudad}
                country={selectedGroup.trips[0].pais}
                onClose={() => setSelectedGroup(null)}
              >
                {visualOverrideKey(selectedGroup, visualOverrides) && (
                  <TouchableOpacity
                    onPress={() => resetVisualPosition(selectedGroup)}
                    activeOpacity={0.7}
                    style={styles.resetPinBtn}
                  >
                    <Text style={styles.resetPinText}>{t('resetPosition')}</Text>
                  </TouchableOpacity>
                )}
              </PinSheetHeader>

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
                      {/* Portada apaisada: recorte visual (cover), el archivo no cambia.
                          Ciudad y país ya están en el encabezado. */}
                      <View style={styles.tripRowMedia}>
                        {cover ? (
                          <Image
                            source={{ uri: resolveFotoUri(cover) ?? cover }}
                            style={styles.tripRowImg}
                            resizeMode="cover"
                          />
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
                      </View>
                      {/* Columna derecha: fecha (realizado) o "¡Lo logré!" (futuro). */}
                      {isReal && trip.fechaInicio ? (
                        <Text style={styles.tripRowDate}>◆ {trip.fechaInicio}</Text>
                      ) : null}
                      {!isReal && (
                        <View style={styles.tripRowFuture}>
                          <View style={styles.tripRowBadge}>
                            <Text style={styles.tripRowBadgeText}>
                              {futureTripLabel(selectedGroup) === 'repeat' ? t('repeatBadge') : t('wishlistBadge')}
                            </Text>
                          </View>
                          <View style={styles.logroAction}>
                            <Text style={styles.logroText}>{t('markAchieved')}</Text>
                            <Text style={styles.logroCheck}>✔</Text>
                            <Text style={styles.tripRowArrow}>→</Text>
                          </View>
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
      )}

      {activeSection === 'others' && <OtrosXpTab />}

      {activeSection === 'share' && <CompartirXpTab />}
      </View>

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
  sectionContainer: {
    flex: 1,
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
  resetPinBtn: {
    marginTop: 8,
    alignSelf: 'center',
  },
  resetPinText: {
    fontSize: 13,
    color: GOLD,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  overlayScroll: {
    paddingTop: 4,
  },

  // Trip rows inside overlay
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 14,
  },
  // Ocupa el espacio que antes tenían ciudad y país; el tope evita una
  // franja demasiado panorámica en pantallas anchas.
  tripRowMedia: {
    flex: 1,
    maxWidth: 300,
    height: 64,
  },
  tripRowImg: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#0b1525',
  },
  tripRowImgEmpty: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    borderWidth: 1,
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
  // Columna derecha de los viajes realizados.
  tripRowDate: {
    fontSize: 14,
    color: GOLD,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'right',
    flexShrink: 0,
    marginLeft: 'auto',
  },
  // Columna derecha de los viajes futuros: etiqueta + "¡Lo logré!".
  tripRowFuture: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
    marginLeft: 'auto',
  },
  tripRowBadge: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  tripRowBadgeText: {
    fontSize: 11,
    color: GOLD,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tripRowArrow: {
    fontSize: 18,
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
    fontSize: 14,
    color: GOLD,
    fontWeight: '700',
  },
  logroCheck: {
    fontSize: 14,
    color: GOLD,
    fontWeight: '700',
  },
});
