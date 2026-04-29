import NavBar from '../components/NavBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { AchievementPopup } from '../components/AchievementPopup';
import { Achievement, checkAndSaveAchievements } from '../utils/achievementsEngine';
import { calcularStats, Trip as StatsTrip } from '../utils/statsEngine';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const BG = '#01050d';
const GOLD = '#d4af37';
const SURFACE = '#0d1a2e';
const BORDER = '#1e3050';
const TEXT = '#e8e0d0';
const MUTED = '#6b7a8d';

type TripType = 'real' | 'wishlist';

interface TripData {
  id: string;
  tipo: TripType;
  ciudad: string;
  pais: string;
  coords: { lat: number; lng: number } | null;
  fechaInicio: string | null;
  fotos: string[];
  portada: string | null;
  nota: string;
  xp: number;
  distancia: number;
  chainId: string | null;
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildFechaInicio(dia: string, mes: string, anio: string): string {
  return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
}

// ─── WHEEL PICKER ─────────────────────────────────────────────────────────────

const ITEM_H = 36;
const VISIBLE_ITEMS = 3;
const WHEEL_H = ITEM_H * VISIBLE_ITEMS; // 108
const WHEEL_PAD = ITEM_H;              // 1 item of padding so first/last can center

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  label: String(i + 1).padStart(2, '0'),
  value: String(i + 1),
}));

const MONTHS = [
  { label: 'Ene', value: '1' },  { label: 'Feb', value: '2' },
  { label: 'Mar', value: '3' },  { label: 'Abr', value: '4' },
  { label: 'May', value: '5' },  { label: 'Jun', value: '6' },
  { label: 'Jul', value: '7' },  { label: 'Ago', value: '8' },
  { label: 'Sep', value: '9' },  { label: 'Oct', value: '10' },
  { label: 'Nov', value: '11' }, { label: 'Dic', value: '12' },
];

const CUR_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CUR_YEAR - 1969 }, (_, i) => ({
  label: String(1970 + i),
  value: String(1970 + i),
}));

interface WheelItem { label: string; value: string; }

const WheelColumn = ({
  items,
  initialIndex,
  onChange,
  width = 80,
}: {
  items: WheelItem[];
  initialIndex: number;
  onChange: (value: string) => void;
  width?: number;
}) => {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, initialIndex) * ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  const handleEnd = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(y / ITEM_H), items.length - 1));
    onChange(items[index].value);
  };

  return (
    <View style={{ width, height: WHEEL_H, overflow: 'hidden' }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
        contentContainerStyle={{ paddingVertical: WHEEL_PAD }}
      >
        {items.map((item, i) => (
          <View key={i} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={styles.wheelItem}>{item.label}</Text>
          </View>
        ))}
      </ScrollView>
      <LinearGradient
        colors={[SURFACE, 'transparent']}
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H }}
      />
      <LinearGradient
        colors={['transparent', SURFACE]}
        pointerEvents="none"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H }}
      />
    </View>
  );
};

// ─── TOGGLE CONSTANTS ─────────────────────────────────────────────────────────

const TRACK_W = 64;
const THUMB_D = 28;
const THUMB_TRAVEL = TRACK_W - THUMB_D - 4;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const todayInit = new Date();

export default function CargarViaje() {
  const [tipo, setTipo] = useState<TripType>('real');
  const [ciudad, setCiudad] = useState('');
  const [pais, setPais] = useState('');
  const [dia, setDia] = useState(String(todayInit.getDate()));
  const [mes, setMes] = useState(String(todayInit.getMonth() + 1));
  const [anio, setAnio] = useState(String(todayInit.getFullYear()));
  const [nota, setNota] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'buscando' | 'encontrada' | 'no_encontrada' | 'error'>('idle');
  const [geoNombre, setGeoNombre] = useState('');
  const [formKey, setFormKey] = useState(0);
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  const chainIdRef = useRef<string | null>(null);
  const scrollRef = useRef<any>(null);

  // Toggle animation
  const toggleAnim = useRef(new Animated.Value(0)).current;

  function animateToggle(to: number) {
    Animated.spring(toggleAnim, {
      toValue: to,
      useNativeDriver: false,
      friction: 7,
      tension: 130,
    }).start();
  }

  function handleToggle(newTipo: TripType) {
    setTipo(newTipo);
    animateToggle(newTipo === 'real' ? 0 : 1);
  }

  const thumbLeft = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, THUMB_TRAVEL],
  });

  function resetForm() {
    const t = new Date();
    setCiudad('');
    setPais('');
    setDia(String(t.getDate()));
    setMes(String(t.getMonth() + 1));
    setAnio(String(t.getFullYear()));
    setNota('');
    setFotos([]);
    setCoords(null);
    setGeoStatus('idle');
    setGeoNombre('');
    setFormKey((k) => k + 1);
    setTimeout(() => {
      scrollRef.current?.scrollToPosition?.(0, 0, false);
      scrollRef.current?.scrollTo?.({ x: 0, y: 0, animated: false });
    }, 50);
  }

  function resetGeo() {
    setCoords(null);
    setGeoStatus('idle');
    setGeoNombre('');
  }

  async function buscarUbicacion() {
    if (!ciudad.trim() || !pais.trim()) {
      Alert.alert('Faltan datos', 'Ingresá ciudad y país antes de buscar la ubicación.');
      return;
    }
    setGeoStatus('buscando');
    setCoords(null);
    setGeoNombre('');
    try {
      const q = encodeURIComponent(`${ciudad.trim()}, ${pais.trim()}`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
        { headers: { 'User-Agent': 'MyWorldXP/1.0', 'Accept-Language': 'es' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        setGeoNombre(data[0].display_name);
        setGeoStatus('encontrada');
      } else {
        setGeoStatus('no_encontrada');
      }
    } catch {
      setGeoStatus('error');
    }
  }

  function handleCargarFotos() {
    if (fotos.length >= 4) {
      Alert.alert('Máximo 4 fotos', 'Ya cargaste el máximo de fotos permitidas.');
      return;
    }
    Alert.alert('Cargar fotos', '', [
      { text: 'Elegir de galería', onPress: pickImages },
      { text: 'Tomar foto', onPress: takePhoto },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function pickImages() {
    if (fotos.length >= 4) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
      return;
    }
    const remaining = 4 - fotos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled && result.assets.length > 0) {
      setFotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
    }
  }

  async function takePhoto() {
    if (fotos.length >= 4) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setFotos((prev) => [...prev, result.assets[0].uri]);
    }
  }

  function removePhoto(index: number) {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    if (!ciudad.trim()) {
      Alert.alert('Falta información', 'La ciudad es obligatoria.');
      return false;
    }
    if (!pais.trim()) {
      Alert.alert('Falta información', 'El país es obligatorio.');
      return false;
    }
    if (!coords) {
      Alert.alert('Ubicación requerida', 'Buscá y confirmá la ubicación antes de guardar.');
      return false;
    }
    if (tipo === 'real') {
      if (!dia.trim() || !mes.trim() || !anio.trim()) {
        Alert.alert('Falta información', 'La fecha de inicio es obligatoria para viajes reales.');
        return false;
      }
    }
    return true;
  }

  function buildTrip(chainId: string | null): TripData {
    const esReal = tipo === 'real';
    return {
      id: genId(),
      tipo,
      ciudad: ciudad.trim(),
      pais: pais.trim(),
      coords,
      fechaInicio: esReal ? buildFechaInicio(dia, mes, anio) : null,
      fotos: esReal ? fotos : [],
      portada: esReal && fotos.length > 0 ? fotos[0] : null,
      nota: nota.trim(),
      xp: 0,
      distancia: 0,
      chainId,
    };
  }

  async function saveTrip(trip: TripData) {
    const raw = await AsyncStorage.getItem('trips');
    const existing: TripData[] = raw ? JSON.parse(raw) : [];
    existing.push(trip);
    await AsyncStorage.setItem('trips', JSON.stringify(existing));
  }

  async function _checkAchievements() {
    try {
      const raw = await AsyncStorage.getItem('trips');
      const allTrips = raw ? JSON.parse(raw) : [];
      const stats = calcularStats(allTrips as StatsTrip[]);
      const newOnes = await checkAndSaveAchievements(allTrips as StatsTrip[], stats);
      if (newOnes.length > 0) setPendingAchievements(newOnes);
    } catch {
      // silencioso — los logros no deben bloquear el flujo principal
    }
  }

  async function handleGuardar() {
    if (!validate()) return;
    Keyboard.dismiss();
    try {
      const trip = buildTrip(null);
      await saveTrip(trip);
      chainIdRef.current = null;
      resetForm();
      Alert.alert('¡Guardado!', `Tu ${tipo === 'real' ? 'viaje' : 'destino'} fue guardado correctamente.`);
      _checkAchievements();
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intentá de nuevo.');
    }
  }

  async function handleGuardarYAgregarDestino() {
    if (!validate()) return;
    Keyboard.dismiss();
    try {
      if (!chainIdRef.current) {
        chainIdRef.current = genId();
      }
      const trip = buildTrip(chainIdRef.current);
      await saveTrip(trip);
      resetForm();
      Alert.alert('Destino guardado', 'Cargá el siguiente destino del mismo viaje.');
      _checkAchievements();
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intentá de nuevo.');
    }
  }

  const dayIdx = Math.max(0, DAYS.findIndex((d) => d.value === dia));
  const monthIdx = Math.max(0, MONTHS.findIndex((m) => m.value === mes));
  const yearIdx = Math.max(0, YEARS.findIndex((y) => y.value === anio));

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Cargar Viaje</Text>
        <Text style={styles.subtitle}>Registrá tu experiencia o tu próximo destino</Text>

        {/* Toggle tipo — animated switch */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={styles.toggleLabelWrap}
            onPress={() => handleToggle('real')}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleLabel, tipo === 'real' && styles.toggleLabelActive]}>
              Ya lo hice
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleToggle(tipo === 'real' ? 'wishlist' : 'real')}
            activeOpacity={0.85}
          >
            <View style={styles.toggleTrack}>
              <Animated.View style={[styles.toggleThumb, { left: thumbLeft }]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleLabelWrap}
            onPress={() => handleToggle('wishlist')}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleLabel, tipo === 'wishlist' && styles.toggleLabelActive]}>
              Lo quiero hacer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Fotos — solo para real */}
        {tipo === 'real' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Fotos ({fotos.length}/4)</Text>

            {fotos.length < 4 && (
              <TouchableOpacity style={styles.photoCard} onPress={handleCargarFotos} activeOpacity={0.8}>
                <Text style={styles.photoCardIcon}>✦</Text>
                <Text style={styles.photoCardText}>Cargar fotos</Text>
                <Text style={styles.photoCardHint}>Galería · Cámara</Text>
              </TouchableOpacity>
            )}

            {fotos.length > 0 && (
              <View style={styles.photosRow}>
                {fotos.map((uri, i) => (
                  <View key={i} style={styles.photoWrapper}>
                    <Image source={{ uri }} style={styles.photoThumb} />
                    {i === 0 && (
                      <View style={styles.photoCoverBadge}>
                        <Text style={styles.photoCoverText}>Portada</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => removePhoto(i)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.photoRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {fotos.length === 0 && (
              <Text style={styles.photoHint}>La primera foto será la portada del viaje.</Text>
            )}
          </View>
        )}

        {/* Ubicación */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Destino</Text>

          <TextInput
            style={styles.input}
            placeholder="Ciudad"
            placeholderTextColor={MUTED}
            value={ciudad}
            onChangeText={(t) => { setCiudad(t); if (geoStatus === 'encontrada') resetGeo(); }}
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="País"
            placeholderTextColor={MUTED}
            value={pais}
            onChangeText={(t) => { setPais(t); if (geoStatus === 'encontrada') resetGeo(); }}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[
              styles.outlineBtn,
              geoStatus === 'buscando' && styles.outlineBtnDisabled,
              geoStatus === 'encontrada' && styles.outlineBtnSuccess,
            ]}
            onPress={buscarUbicacion}
            activeOpacity={0.8}
            disabled={geoStatus === 'buscando'}
          >
            <Text style={[
              styles.outlineBtnText,
              geoStatus === 'encontrada' && styles.outlineBtnTextSuccess,
              (geoStatus === 'no_encontrada' || geoStatus === 'error') && styles.outlineBtnTextError,
            ]}>
              {geoStatus === 'buscando' ? 'Buscando...'
                : geoStatus === 'encontrada' ? '✓  Ubicación encontrada'
                : geoStatus === 'no_encontrada' ? 'No encontrada — intentá de nuevo'
                : geoStatus === 'error' ? 'Error al buscar — intentá de nuevo'
                : 'Buscar ubicación'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.8}>
            <Text style={styles.outlineBtnText}>Elegir país de la lista</Text>
          </TouchableOpacity>
        </View>

        {/* Fecha — solo para real, wheel picker */}
        {tipo === 'real' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Fecha de inicio</Text>
            <View key={formKey} style={styles.wheelContainer}>
              {/* Highlight bar at center row */}
              <View pointerEvents="none" style={styles.wheelHighlight} />
              <WheelColumn items={DAYS} initialIndex={dayIdx} onChange={setDia} width={70} />
              <WheelColumn items={MONTHS} initialIndex={monthIdx} onChange={setMes} width={88} />
              <WheelColumn items={YEARS} initialIndex={yearIdx} onChange={setAnio} width={96} />
            </View>
          </View>
        )}

        {/* Nota */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Nota <Text style={styles.optional}>(opcional)</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Contá algo de este viaje..."
            placeholderTextColor={MUTED}
            value={nota}
            onChangeText={setNota}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Botones */}
        <View style={styles.buttonsSection}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleGuardar} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>
              {tipo === 'real' ? 'Guardar viaje' : 'Guardar destino'}
            </Text>
          </TouchableOpacity>

          {tipo === 'real' && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleGuardarYAgregarDestino}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>Guardar y agregar destino</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </KeyboardAwareScrollView>
      <NavBar />
      {pendingAchievements.length > 0 && (
        <AchievementPopup
          achievements={pendingAchievements}
          onDone={() => setPendingAchievements([])}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },

  // Title — premium serif centered
  title: {
    fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 36,
  },

  // Toggle — animated switch with labels
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 32,
  },
  toggleLabelWrap: {
    flex: 1,
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'center',
  },
  toggleLabelActive: {
    color: GOLD,
  },
  toggleTrack: {
    width: TRACK_W,
    height: THUMB_D + 4,
    borderRadius: (THUMB_D + 4) / 2,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: 'rgba(212,175,55,0.15)',
    position: 'relative',
  },
  toggleThumb: {
    position: 'absolute',
    top: 2,
    width: THUMB_D,
    height: THUMB_D,
    borderRadius: THUMB_D / 2,
    backgroundColor: GOLD,
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  optional: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
  },

  // Inputs
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    color: TEXT,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 13,
  },

  // Photo card
  photoCard: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 12,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    gap: 5,
  },
  photoCardIcon: {
    fontSize: 20,
    color: GOLD,
  },
  photoCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT,
    letterSpacing: 0.5,
  },
  photoCardHint: {
    fontSize: 12,
    color: MUTED,
    letterSpacing: 0.3,
  },
  photoHint: {
    fontSize: 12,
    color: MUTED,
    marginTop: -4,
  },

  // Photos grid
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'flex-start',
  },
  photoWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GOLD,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoCoverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(212,175,55,0.85)',
    alignItems: 'center',
    paddingVertical: 2,
  },
  photoCoverText: {
    fontSize: 9,
    fontWeight: '700',
    color: BG,
    letterSpacing: 0.5,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(1,5,13,0.75)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: TEXT,
    fontSize: 10,
    fontWeight: '700',
  },

  // Wheel picker
  wheelContainer: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    gap: 0,
  },
  wheelHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_H,
    height: ITEM_H,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: GOLD,
    opacity: 0.35,
    zIndex: 1,
  },
  wheelItem: {
    fontSize: 18,
    color: TEXT,
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
  },

  // Outline buttons
  outlineBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: SURFACE,
  },
  outlineBtnText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '500',
  },
  outlineBtnDisabled: {
    opacity: 0.5,
  },
  outlineBtnSuccess: {
    borderColor: 'rgba(212,175,55,0.5)',
    backgroundColor: 'rgba(212,175,55,0.07)',
  },
  outlineBtnTextSuccess: {
    color: GOLD,
    fontWeight: '600',
  },
  outlineBtnTextError: {
    color: '#e07070',
  },

  geoFound: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  geoCheck: {
    fontSize: 16,
    color: GOLD,
    fontWeight: '700',
    marginTop: 1,
  },
  geoFoundText: {
    flex: 1,
    fontSize: 13,
    color: GOLD,
    lineHeight: 18,
  },

  geoNotFound: {
    backgroundColor: 'rgba(180,40,40,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(180,40,40,0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  geoNotFoundText: {
    fontSize: 13,
    color: '#e07070',
    lineHeight: 18,
  },

  // Action buttons
  buttonsSection: {
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: BG,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  bottomSpacer: {
    height: 88,
  },
});
