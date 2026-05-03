import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_H = Math.round(SCREEN_W * 0.68);

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
  tipsViaje?: string;
  xp: number;
  distancia: number;
  chainId: string | null;
}

function parseDate(s: string | null): Date {
  if (!s) return new Date(0);
  const parts = s.split(/[\/\-]/);
  if (parts.length !== 3) return new Date(0);
  const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function formatDate(s: string | null): string {
  if (!s) return '';
  const d = parseDate(s);
  if (d.getTime() === 0) return s;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function DetalleViaje() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();


  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [nota, setNota] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [editingNota, setEditingNota] = useState(false);
  const [tipsViaje, setTipsViaje] = useState('');
  const [editingTips, setEditingTips] = useState(false);
  const [tipsInputHeight, setTipsInputHeight] = useState(120);
  const [saving, setSaving] = useState(false);
  const paddedYRef = useRef(0);
  const tipsCardYRef = useRef(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  const scrollToTipsCard = () => {
    setTimeout(() => {
      const y = paddedYRef.current + tipsCardYRef.current;
      scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }, 350);
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('trips');
        const all: Trip[] = raw ? JSON.parse(raw) : [];
        const found = all.find((t) => t.id === id) ?? null;
        if (found) {
          setTrip(found);
          setNota(found.nota);
          setTipsViaje(found.tipsViaje || '');
          Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 360, useNativeDriver: true }),
          ]).start();
        }
      } catch {
        Alert.alert('Error', 'No se pudo cargar el viaje.');
      }
    })();
  }, [id]);

  async function persistTrip(updated: Trip) {
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem('trips');
      const all: Trip[] = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex((t) => t.id === updated.id);
      if (idx !== -1) {
        all[idx] = updated;
        await AsyncStorage.setItem('trips', JSON.stringify(all));
        setTrip(updated);
      }
    } catch {
      Alert.alert('Error', 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNota() {
    if (!trip) return;
    await persistTrip({ ...trip, nota: nota.trim() });
    setEditingNota(false);
  }

  async function handleSetPortada(uri: string) {
    if (!trip || trip.portada === uri) return;
    await persistTrip({ ...trip, portada: uri });
  }

  async function handleShareTips() {
    if (!trip || !tipsViaje.trim()) return;
    const raw = await AsyncStorage.getItem('userData');
    const userData = raw ? JSON.parse(raw) : {};
    const nombre = (userData.nombre || '').trim();
    const texto = `${nombre} de MyWorldXP te recomienda que si visitás ${trip.ciudad}, ${trip.pais} tengas en cuenta:\n\n${tipsViaje.trim()}`;
    await Clipboard.setStringAsync(texto);
    Alert.alert('¡Copiado!', 'Texto copiado. Ahora podés pegarlo donde quieras.');
  }

  // ─── Loading state ────────────────────────────────────────────────────────────

  if (!trip) {
    return (
      <View style={styles.loadingRoot}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backLabel}>Volver</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingCenter}>
          <Text style={styles.mutedText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  const portada = trip.portada ?? trip.fotos[0] ?? null;
  const hasPhotos = trip.fotos.length > 0;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header fijo con back */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backLabel}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {trip.ciudad}
        </Text>
      </View>

      {/* Contenido con animación de entrada */}
      <Animated.View
        style={[styles.animatedContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <ScrollView
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"
  contentContainerStyle={{ paddingBottom: 80 }}
  ref={scrollViewRef}
>

          {/* ── GALERÍA ─────────────────────────────────────────────────────── */}
          {hasPhotos && (
            <View style={styles.galleryWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={SCREEN_W}
                snapToAlignment="center"
                bounces={false}
              >
                {trip.fotos.map((uri) => {
                  const isCover = uri === portada;
                  return (
                    <TouchableOpacity
                      key={uri}
                      onPress={() => handleSetPortada(uri)}
                      activeOpacity={0.92}
                      style={styles.photoSlot}
                    >
                      <Image source={{ uri }} style={styles.photo} resizeMode="cover" />

                      {/* Gradiente simulado abajo */}
                      <View style={styles.photoOverlay} pointerEvents="none" />

                      {isCover ? (
                        <View style={styles.coverBadge}>
                          <Text style={styles.coverBadgeText}>◆  PORTADA</Text>
                        </View>
                      ) : (
                        <View style={styles.tapHint}>
                          <Text style={styles.tapHintText}>Tocar para hacer portada</Text>
                        </View>
                      )}

                      {/* Marco dorado si es portada */}
                      {isCover && <View style={styles.coverFrame} pointerEvents="none" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Indicador de fotos */}
              {trip.fotos.length > 1 && (
                <View style={styles.photoCount}>
                  <Text style={styles.photoCountText}>{trip.fotos.length} fotos</Text>
                </View>
              )}
            </View>
          )}

          {/* Sin fotos */}
          {!hasPhotos && (
            <View style={styles.noCoverWrap}>
              <Text style={styles.noCoverIcon}>✈</Text>
              <Text style={styles.noCoverText}>Sin fotos</Text>
            </View>
          )}

          {/* ── SECCIÓN PRINCIPAL ───────────────────────────────────────────── */}
          <View
            style={styles.padded}
            onLayout={(e) => { paddedYRef.current = e.nativeEvent.layout.y; }}
          >

            {/* Ubicación */}
            <View style={styles.locationCard}>
              <View style={styles.locationLeft}>
                <Text style={styles.cityText}>{trip.ciudad}</Text>
                <View style={styles.countryRow}>
                  <Text style={styles.countryDiamond}>◆</Text>
                  <Text style={styles.countryText}>{trip.pais}</Text>
                </View>
              </View>
              <Text style={styles.globeSymbol}>◎</Text>
            </View>

            {/* Fecha */}
            {trip.fechaInicio ? (
              <View style={styles.infoCard}>
                <Text style={styles.cardLabel}>FECHA DEL VIAJE</Text>
                <Text style={styles.dateValue}>{formatDate(trip.fechaInicio)}</Text>
              </View>
            ) : null}

            {/* Comentario */}
            <View style={styles.infoCard}>
              <View style={styles.notaHeader}>
                <Text style={styles.cardLabel}>COMENTARIO</Text>
                {!editingNota && (
                  <TouchableOpacity onPress={() => setEditingNota(true)} activeOpacity={0.7}>
                    <Text style={styles.editLink}>{trip.nota ? 'Editar' : '+ Agregar'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {editingNota ? (
                <>
                  <TextInput
                    style={styles.notaInput}
                    value={nota}
                    onChangeText={setNota}
                    multiline
                    autoFocus
                    placeholder="Escribí algo sobre este viaje..."
                    placeholderTextColor={MUTED}
                    textAlignVertical="top"
                  />
                  <View style={styles.notaActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => { setNota(trip.nota); setEditingNota(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                      onPress={handleSaveNota}
                      disabled={saving}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : trip.nota ? (
                <Text style={styles.notaText}>{trip.nota}</Text>
              ) : (
                <Text style={styles.notaEmpty}>Sin comentario</Text>
              )}
            </View>
<View
  style={styles.infoCard}
  onLayout={(e) => { tipsCardYRef.current = e.nativeEvent.layout.y; }}
>
  <View style={styles.notaHeader}>
    <Text style={styles.cardLabel}>TIPS DE VIAJE</Text>
    {!editingTips && (
      <TouchableOpacity onPress={() => setEditingTips(true)} activeOpacity={0.7}>
        <Text style={styles.editLink}>
          {tipsViaje ? 'Editar' : '+ Agregar'}
        </Text>
      </TouchableOpacity>
    )}
  </View>


  {editingTips ? (
    <>
      <TextInput
        style={[styles.notaInput, { height: Math.max(120, tipsInputHeight) }]}
        autoFocus={true}
        value={tipsViaje}
        onChangeText={setTipsViaje}
        onFocus={scrollToTipsCard}
        onContentSizeChange={(e) => {
          const newH = e.nativeEvent.contentSize.height + 28;
          if (newH > tipsInputHeight) {
            setTipsInputHeight(newH);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 60);
          }
        }}
        multiline
        maxLength={500}
        placeholder="Cargar datos útiles de este destino, bares, restaurantes, lugares imperdibles..."
        placeholderTextColor="#6fa8dc"
        textAlignVertical="top"
      />

      <View style={styles.notaActions}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => {
            setTipsViaje(trip.tipsViaje || '');
            setEditingTips(false);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={async () => {
            if (!trip) return;
            await persistTrip({
              ...trip,
              tipsViaje: tipsViaje.trim(),
            });
            setEditingTips(false);
          }}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveText}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  ) : (
  <>
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setEditingTips(true)}
    >
      {tipsViaje ? (
        <Text style={styles.notaText}>{tipsViaje}</Text>
      ) : (
        <Text style={[styles.notaEmpty, { color: '#6fa8dc' }]}>
          Cargar datos útiles de este destino, bares, restaurantes, lugares imperdibles...
        </Text>
      )}
    </TouchableOpacity>
    {!!tipsViaje && (
      <TouchableOpacity style={styles.shareBtn} onPress={handleShareTips} activeOpacity={0.8}>
        <Text style={styles.shareBtnText}>↑ Compartir tips</Text>
      </TouchableOpacity>
    )}
  </>
)}
  
</View>

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  loadingRoot: { flex: 1, backgroundColor: BG },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mutedText: { color: MUTED, fontSize: 14 },
  animatedContent: { flex: 1 },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backIcon: { fontSize: 32, color: GOLD, lineHeight: 34, marginTop: -2 },
  backLabel: { fontSize: 15, color: GOLD, fontWeight: '600' },
  headerTitle: { flex: 1, fontSize: 16, color: TEXT, fontWeight: '600', opacity: 0.6 },

  // Gallery
  galleryWrap: { marginBottom: 22 },
  photoSlot: { width: SCREEN_W, height: PHOTO_H, position: 'relative' },
  photo: { width: SCREEN_W, height: PHOTO_H },
  photoOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: PHOTO_H * 0.4,
    backgroundColor: 'transparent',
    // simula gradiente oscuro abajo via la superposición de los badges
  },
  coverBadge: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(212,175,55,0.88)',
    paddingVertical: 11,
    alignItems: 'center',
  },
  coverBadgeText: {
    color: BG,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.5,
  },
  tapHint: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(1,5,13,0.52)',
    paddingVertical: 11,
    alignItems: 'center',
  },
  tapHintText: { color: TEXT, fontSize: 12, opacity: 0.7 },
  coverFrame: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 2.5,
    borderColor: GOLD,
  },
  photoCount: {
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: SURFACE,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: BORDER,
  },
  photoCountText: { fontSize: 12, color: MUTED, fontWeight: '600' },

  // Sin fotos
  noCoverWrap: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 8,
  },
  noCoverIcon: { fontSize: 40, opacity: 0.2 },
  noCoverText: { fontSize: 13, color: MUTED },

  // Padded section
  padded: { paddingHorizontal: 20 },

  // Location card
  locationCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    paddingHorizontal: 22,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  locationLeft: { gap: 4 },
  cityText: { fontSize: 27, fontWeight: '800', color: TEXT, letterSpacing: 0.2 },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 },
  countryDiamond: { fontSize: 7, color: GOLD },
  countryText: { fontSize: 14, color: MUTED, fontWeight: '500', letterSpacing: 0.6 },
  globeSymbol: { fontSize: 38, color: GOLD, opacity: 0.3 },

  // Info cards
  infoCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dateValue: { fontSize: 18, color: TEXT, fontWeight: '600' },

  // Nota
  notaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  editLink: { fontSize: 13, color: GOLD, fontWeight: '600' },
  notaText: { fontSize: 15, color: TEXT, lineHeight: 25 },
  notaEmpty: { fontSize: 14, color: MUTED, fontStyle: 'italic' },
  notaInput: {
    backgroundColor: '#050d1a',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    color: TEXT,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 120,
    marginBottom: 12,
    lineHeight: 22,
  },
  notaActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cancelText: { color: MUTED, fontSize: 14, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 11,
    backgroundColor: GOLD,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveText: { color: BG, fontSize: 14, fontWeight: '700' },

  bottomSpacer: { height: 48 },

  shareBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  shareBtnText: { color: GOLD, fontSize: 13, fontWeight: '600', letterSpacing: 1 },
});
