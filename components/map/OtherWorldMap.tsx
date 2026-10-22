import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { getSocialLoadErrorMessage } from '../../utils/social';
import { buildSharedPlaces, fetchSharedWorld, SharedOwner, SharedWorld } from '../../utils/sharedWorld';
import { playSound } from '../../utils/soundEngine';
import PinSheetHeader from './PinSheetHeader';
import { PinReal, PinWishlist, WORLD } from './Pins';

const GOLD = '#d4af37';
const MUTED = '#6b7a8d';
const DANGER = '#c0392b';

// Mapa de SOLO LECTURA del mundo que `owner` me comparte. Mismo mapa, pines y
// hoja que el mapa propio (app/mapa.tsx), sin nada editable: los pines no se
// arrastran, no hay "¡Lo logré!", fotos, notas ni navegación a otras
// pantallas. Se ven las coordenadas originales de shared_trips (las
// posiciones visuales que el owner movió a mano son locales y no se publican).
export default function OtherWorldMap({
  myUserId,
  owner,
  onBack,
  onRevoked,
}: {
  myUserId: string;
  owner: SharedOwner;
  onBack: () => void;
  onRevoked: () => void;
}) {
  const { t } = useTranslation(['map', 'social']);

  const [world, setWorld] = useState<SharedWorld | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [fetchedToken, setFetchedToken] = useState<number | null>(null);
  const loading = fetchedToken !== reloadToken;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    fetchSharedWorld(myUserId, owner.id)
      .then((w) => {
        if (stale) return;
        if (!w) {
          // Relación revocada o RLS ya no autoriza: nada de datos viejos.
          setWorld(null);
          onRevoked();
          return;
        }
        setWorld(w);
        setLoadError(null);
        setFetchedToken(reloadToken);
      })
      .catch((err) => {
        if (stale) return;
        // Sin poder confirmar el estado actual no se sigue mostrando el
        // mundo anterior como si estuviera vigente.
        setWorld(null);
        setLoadError(getSocialLoadErrorMessage(err));
        setFetchedToken(reloadToken);
      });
    return () => { stale = true; };
  }, [myUserId, owner.id, reloadToken, onRevoked]);

  const places = useMemo(() => (world ? buildSharedPlaces(world.trips) : []), [world]);
  // Si un refresh deja de traer ese lugar, la hoja se cierra sola.
  const selectedPlace = places.find((p) => p.key === selectedKey) ?? null;

  function handleRefresh() {
    if (loading) return;
    setReloadToken((n) => n + 1);
  }

  const username = world?.username || owner.username;

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backText}>‹ {t('map:tabs.others')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRefresh} disabled={loading} activeOpacity={0.7}>
          <Text style={styles.refreshText}>
            {loading ? t('social:loading') : t('map:othersSection.refresh')}
          </Text>
        </TouchableOpacity>
      </View>

      {!world && loadError && !loading && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      )}

      {!world && loading && (
        <View style={styles.center}>
          <Text style={styles.mutedText}>{t('social:loading')}</Text>
        </View>
      )}

      {world && (
        <View style={styles.mapWrap}>
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
            {places.map((place) => (
              <Marker
                // El tipo forma parte de la key: con tracksViewChanges={false}
                // un pin que cambia de dorado a azul tras un refresh se
                // vuelve a montar en vez de quedar con el dibujo viejo.
                key={`${place.key}-${place.hasReal ? 'r' : 'w'}`}
                coordinate={{ latitude: place.lat, longitude: place.lng }}
                tracksViewChanges={false}
                onPress={() => { playSound('ding'); setSelectedKey(place.key); }}
              >
                {place.hasReal ? <PinReal /> : <PinWishlist />}
              </Marker>
            ))}
          </MapView>

          {/* Recuadro flotante: no recibe toques, el mapa sigue navegable. */}
          <View style={styles.statsWrap} pointerEvents="none">
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {t('map:otherWorld.title', { username })}
              </Text>
              {/* Etiqueta y número en el mismo <Text>: mismo tamaño siempre. */}
              <View style={styles.statsRow}>
                <Text style={styles.statsCell} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {t('map:otherWorld.xp', { xp: world.stats.xpTotal })}
                </Text>
                <Text style={styles.statsCell} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {t('map:otherWorld.continents', { continents: world.stats.continentes })}
                </Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsCell} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {t('map:otherWorld.countries', { countries: world.stats.paises })}
                </Text>
                <Text style={styles.statsCell} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {t('map:otherWorld.cities', { cities: world.stats.ciudades })}
                </Text>
              </View>
            </View>
          </View>

          {/* Hoja del pin: solo lugar, fechas realizadas visibles y A REPETIR. */}
          {selectedPlace && (
            <View style={styles.overlayWrap}>
              <TouchableOpacity
                style={styles.overlayBackdrop}
                activeOpacity={1}
                onPress={() => setSelectedKey(null)}
              />
              <View style={styles.overlayCard}>
                <View style={styles.overlayHandle} />
                <PinSheetHeader
                  city={selectedPlace.ciudad}
                  country={selectedPlace.pais}
                  onClose={() => setSelectedKey(null)}
                />

                {(selectedPlace.fechas.length > 0 || selectedPlace.aRepetir) && (
                  <ScrollView
                    contentContainerStyle={styles.overlayBody}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {selectedPlace.fechas.map((fecha) => (
                      <Text key={fecha} style={styles.dateText}>◆ {fecha}</Text>
                    ))}
                    {selectedPlace.aRepetir && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{t('map:repeatBadge')}</Text>
                      </View>
                    )}
                  </ScrollView>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// Valores visuales copiados del mapa propio (app/mapa.tsx) a propósito: la
// hoja propia tiene edición, fotos y navegación, y abstraerla arriesgaría el
// mapa propio por un componente de solo lectura.
const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mutedText: { color: MUTED, fontSize: 13 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backText: { fontSize: 13, color: GOLD, fontWeight: '700', letterSpacing: 0.3 },
  refreshText: { fontSize: 11, color: MUTED, fontWeight: '600' },

  errorBox: {
    backgroundColor: 'rgba(192,57,43,0.12)',
    borderColor: 'rgba(192,57,43,0.4)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 24,
    marginTop: 8,
  },
  errorText: { color: DANGER, fontSize: 12, textAlign: 'center' },

  mapWrap: { flex: 1 },
  map: { flex: 1 },

  // Contenedor de ancho completo (menos márgenes) que centra el cuadro y
  // le pone un tope en pantallas anchas.
  statsWrap: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  statsCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: 'rgba(13,26,46,0.92)',
    borderColor: 'rgba(212,175,55,0.45)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statsTitle: { fontSize: 17, fontWeight: '700', color: GOLD, letterSpacing: 0.3 },
  statsRow: { flexDirection: 'row', marginTop: 8, gap: 12 },
  statsCell: { flex: 1, fontSize: 15, fontWeight: '600', color: GOLD, opacity: 0.9 },

  overlayWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  overlayBackdrop: { flex: 1 },
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
  // Fechas y etiqueta centradas bajo el encabezado.
  overlayBody: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
  },

  dateText: { fontSize: 11, color: GOLD, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },
  badge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  badgeText: { fontSize: 9, color: GOLD, fontWeight: '700', letterSpacing: 1 },
});
