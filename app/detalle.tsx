import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
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

const BG      = '#01050d';
const GOLD    = '#d4af37';
const SURFACE = '#0b1525';
const BORDER  = '#1a2d46';
const TEXT    = '#e8e0d0';
const MUTED   = '#4a5a6a';
const DANGER  = '#c0392b';

const FOTOS_DIR = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}fotos/`
  : null;

interface GeoOpcion {
  lat: string;
  lon: string;
  display_name: string;
}

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
  coords: { lat: number; lng: number } | null;
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

function buildFechaInicio(dia: string, mes: string, anio: string): string {
  return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
}

async function copiarFoto(uri: string): Promise<string> {
  if (!FOTOS_DIR || !FileSystem.documentDirectory) throw new Error('FileSystem no disponible');
  if (uri.startsWith(FileSystem.documentDirectory)) return uri;
  const dirInfo = await FileSystem.getInfoAsync(FOTOS_DIR);
  if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(FOTOS_DIR, { intermediates: true });
  const cleanUri = uri.split('?')[0];
  const rawExt = cleanUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(rawExt) ? rawExt : 'jpg';
  const dest = `${FOTOS_DIR}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}.${safeExt}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export default function DetalleViaje() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [saving, setSaving] = useState(false);

  // Nota
  const [nota, setNota] = useState('');
  const [editingNota, setEditingNota] = useState(false);

  // Tips
  const [tipsViaje, setTipsViaje] = useState('');
  const [editingTips, setEditingTips] = useState(false);
  const [tipsInputHeight, setTipsInputHeight] = useState(120);

  // Fecha
  const [editingFecha, setEditingFecha] = useState(false);
  const [editDia, setEditDia] = useState('');
  const [editMes, setEditMes] = useState('');
  const [editAnio, setEditAnio] = useState('');

  // Ubicación
  type GeoStatus = 'idle' | 'buscando' | 'encontrada' | 'no_encontrada' | 'error' | 'multiples';
  const [editingLocation, setEditingLocation] = useState(false);
  const [editCiudad, setEditCiudad] = useState('');
  const [editPais, setEditPais] = useState('');
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [geoOpciones, setGeoOpciones] = useState<GeoOpcion[]>([]);
  const [newCoords, setNewCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Fotos — sesión de edición con eliminaciones diferidas
  const [editingPhotos, setEditingPhotos] = useState(false);
  const [pendingFotos, setPendingFotos] = useState<string[]>([]);
  const [pendingPortada, setPendingPortada] = useState<string | null>(null);
  const [toDeleteOnCommit, setToDeleteOnCommit] = useState<string[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);
  const paddedYRef    = useRef(0);
  const tipsCardYRef  = useRef(0);
  const fadeAnim      = useRef(new Animated.Value(0)).current;
  const slideAnim     = useRef(new Animated.Value(28)).current;

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

  // ─── Persist ─────────────────────────────────────────────────────────────────

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

  // ─── Nota ─────────────────────────────────────────────────────────────────────

  async function handleSaveNota() {
    if (!trip) return;
    await persistTrip({ ...trip, nota: nota.trim() });
    setEditingNota(false);
  }

  // ─── Portada ──────────────────────────────────────────────────────────────────

  async function handleSetPortada(uri: string) {
    if (!trip || trip.portada === uri) return;
    await persistTrip({ ...trip, portada: uri });
  }

  // ─── Tips ─────────────────────────────────────────────────────────────────────

  async function handleShareTips() {
    if (!trip || !tipsViaje.trim()) return;
    const raw = await AsyncStorage.getItem('userData');
    const userData = raw ? JSON.parse(raw) : {};
    const nombre = (userData.nombre || '').trim();
    const texto = `${nombre} de MyWorldXP te recomienda que si visitás ${trip.ciudad}, ${trip.pais} tengas en cuenta:\n\n${tipsViaje.trim()}`;
    await Clipboard.setStringAsync(texto);
    Alert.alert('¡Copiado!', 'Texto copiado. Ahora podés pegarlo donde quieras.');
  }

  // ─── Fecha ────────────────────────────────────────────────────────────────────

  function openEditFecha() {
    if (!trip?.fechaInicio) return;
    const parts = trip.fechaInicio.split('/');
    setEditDia(parts[0] ?? '');
    setEditMes(parts[1] ?? '');
    setEditAnio(parts[2] ?? '');
    setEditingFecha(true);
  }

  async function handleSaveFecha() {
    if (!trip) return;
    const dia  = editDia.padStart(2, '0');
    const mes  = editMes.padStart(2, '0');
    const anio = editAnio;
    if (!dia || !mes || !anio || anio.length !== 4) {
      Alert.alert('Fecha inválida', 'Ingresá una fecha completa (DD, MM y año de 4 dígitos).');
      return;
    }
    const newDate  = buildFechaInicio(dia, mes, anio);
    const oldYear  = trip.fechaInicio ? trip.fechaInicio.split('/')[2] : null;
    const yearChanged = oldYear !== anio;

    if (trip.chainId && yearChanged) {
      Alert.alert(
        'Viaje de varios destinos',
        'Este viaje forma parte de un viaje de varios destinos. Estás cambiando el año.\n\n¿Qué querés hacer?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Solo este destino', onPress: () => detachAndSave(newDate) },
          { text: 'Cambiar todos',     onPress: () => saveAllInChain(newDate, anio) },
        ]
      );
      return;
    }

    await persistTrip({ ...trip, fechaInicio: newDate });
    setEditingFecha(false);
  }

  async function detachAndSave(newDate: string) {
    if (!trip) return;
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem('trips');
      const all: Trip[] = raw ? JSON.parse(raw) : [];
      const chainSiblings = all.filter((t) => t.chainId === trip.chainId && t.id !== trip.id);

      const idx = all.findIndex((t) => t.id === trip.id);
      if (idx !== -1) all[idx] = { ...trip, fechaInicio: newDate, chainId: null };

      // Si queda 1 solo en la cadena, también lo desvinculamos
      if (chainSiblings.length === 1) {
        const ri = all.findIndex((t) => t.id === chainSiblings[0].id);
        if (ri !== -1) all[ri] = { ...all[ri], chainId: null };
      }

      await AsyncStorage.setItem('trips', JSON.stringify(all));
      setTrip({ ...trip, fechaInicio: newDate, chainId: null });
    } catch {
      Alert.alert('Error', 'No se pudo guardar.');
    } finally {
      setSaving(false);
      setEditingFecha(false);
    }
  }

  async function saveAllInChain(newDate: string, newYear: string) {
    if (!trip) return;
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem('trips');
      const all: Trip[] = raw ? JSON.parse(raw) : [];
      const updated = all.map((t) => {
        if (t.chainId !== trip.chainId) return t;
        if (t.id === trip.id) return { ...t, fechaInicio: newDate };
        if (!t.fechaInicio) return t;
        const p = t.fechaInicio.split('/');
        return { ...t, fechaInicio: `${p[0]}/${p[1]}/${newYear}` };
      });
      await AsyncStorage.setItem('trips', JSON.stringify(updated));
      setTrip({ ...trip, fechaInicio: newDate });
    } catch {
      Alert.alert('Error', 'No se pudo guardar.');
    } finally {
      setSaving(false);
      setEditingFecha(false);
    }
  }

  // ─── Ubicación ────────────────────────────────────────────────────────────────

  function openEditLocation() {
    if (!trip) return;
    setEditCiudad(trip.ciudad);
    setEditPais(trip.pais);
    setGeoStatus('idle');
    setGeoOpciones([]);
    setNewCoords(null);
    setEditingLocation(true);
  }

  async function buscarUbicacion() {
    if (!editCiudad.trim() || !editPais.trim()) {
      Alert.alert('Faltan datos', 'Ingresá ciudad y país.');
      return;
    }
    setGeoStatus('buscando');
    setGeoOpciones([]);
    setNewCoords(null);
    try {
      const q = encodeURIComponent(`${editCiudad.trim()}, ${editPais.trim()}`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5`,
        { headers: { 'User-Agent': 'MyWorldXP/1.0', 'Accept-Language': 'es' } }
      );
      const data: GeoOpcion[] = await res.json();
      if (data.length === 1) {
        setNewCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        setGeoStatus('encontrada');
      } else if (data.length > 1) {
        setGeoStatus('multiples');
        setGeoOpciones(data);
      } else {
        setGeoStatus('no_encontrada');
      }
    } catch {
      setGeoStatus('error');
    }
  }

  async function handleSaveLocation() {
    if (!trip || !newCoords) return;
    await persistTrip({
      ...trip,
      ciudad: editCiudad.trim(),
      pais:   editPais.trim(),
      coords: newCoords,
    });
    setEditingLocation(false);
    setGeoStatus('idle');
  }

  // ─── Fotos ────────────────────────────────────────────────────────────────────

  function openEditPhotos() {
    if (!trip) return;
    setPendingFotos([...trip.fotos]);
    setPendingPortada(trip.portada);
    setToDeleteOnCommit([]);
    setEditingPhotos(true);
  }

  function cancelPhotoEdits() {
    // Descarta todos los cambios de la sesión: ningún archivo fue eliminado aún
    setPendingFotos([]);
    setPendingPortada(null);
    setToDeleteOnCommit([]);
    setEditingPhotos(false);
  }

  async function commitPhotoEdits() {
    if (!trip) { setEditingPhotos(false); return; }
    setSaving(true);
    try {
      await persistTrip({ ...trip, fotos: pendingFotos, portada: pendingPortada });
      // Solo eliminar archivos físicos después de que el guardado fue exitoso
      for (const uri of toDeleteOnCommit) {
        try {
          if (FileSystem.documentDirectory && uri.startsWith(FileSystem.documentDirectory)) {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          }
        } catch { /* eliminación de archivo es best-effort */ }
      }
      setToDeleteOnCommit([]);
      setEditingPhotos(false);
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  }

  // Marca una foto para eliminación sin tocar el filesystem ni AsyncStorage
  function markDeletePhoto(uri: string) {
    const newFotos   = pendingFotos.filter((f) => f !== uri);
    const newPortada = uri === pendingPortada ? (newFotos[0] ?? null) : pendingPortada;
    setPendingFotos(newFotos);
    setPendingPortada(newPortada);
    setToDeleteOnCommit((prev) => [...prev, uri]);
  }

  async function handleAddPhotos() {
    if (!trip) return;
    const currentCount = editingPhotos ? pendingFotos.length : trip.fotos.length;
    if (currentCount >= 4) {
      Alert.alert('Máximo 4 fotos', 'Ya cargaste el máximo de fotos permitidas.');
      return;
    }
    Alert.alert('Agregar fotos', '', [
      { text: 'Elegir de galería', onPress: pickFromGallery },
      { text: 'Tomar foto',        onPress: takePhoto },
      { text: 'Cancelar',          style: 'cancel' },
    ]);
  }

  async function pickFromGallery() {
    if (!trip) return;
    const currentCount = editingPhotos ? pendingFotos.length : trip.fotos.length;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 4 - currentCount,
    });
    if (result.canceled) return;
    await addPhotosToTrip(result.assets.map((a) => a.uri));
  }

  async function takePhoto() {
    if (!trip) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled) return;
    await addPhotosToTrip(result.assets.map((a) => a.uri));
  }

  async function addPhotosToTrip(uris: string[]) {
    if (!trip) return;
    setSaving(true);
    try {
      const persisted: string[] = [];
      for (const uri of uris) {
        persisted.push(await copiarFoto(uri));
      }
      if (editingPhotos) {
        // En modo edición: acumular en estado pendiente, no guardar aún
        const newPending = [...pendingFotos, ...persisted].slice(0, 4);
        setPendingFotos(newPending);
        if (!pendingPortada && newPending.length > 0) {
          setPendingPortada(newPending[0]);
        }
      } else {
        // Fuera de edición (ej: "Sin fotos" → "Agregar fotos"): guardar inmediatamente
        const newFotos   = [...trip.fotos, ...persisted].slice(0, 4);
        const newPortada = trip.portada ?? newFotos[0] ?? null;
        await persistTrip({ ...trip, fotos: newFotos, portada: newPortada });
      }
    } catch {
      Alert.alert('Error', 'No se pudieron guardar las fotos.');
    } finally {
      setSaving(false);
    }
  }

  // ─── Eliminar viaje ───────────────────────────────────────────────────────────

  function handleDeleteTrip() {
    if (!trip) return;
    Alert.alert(
      '¿Eliminar viaje?',
      `¿Estás seguro de que querés eliminar el viaje a ${trip.ciudad}?`,
      [
        { text: 'Cancelar',  style: 'cancel' },
        { text: 'Eliminar',  style: 'destructive', onPress: doDeleteTrip },
      ]
    );
  }

  async function doDeleteTrip() {
    if (!trip) return;
    setSaving(true);
    try {
      const raw  = await AsyncStorage.getItem('trips');
      const all: Trip[] = raw ? JSON.parse(raw) : [];
      const remaining   = all.filter((t) => t.id !== trip.id);

      // Si el viaje pertenecía a una cadena y queda 1 solo, lo desvinculamos
      if (trip.chainId) {
        const chainLeft = remaining.filter((t) => t.chainId === trip.chainId);
        if (chainLeft.length === 1) {
          const ri = remaining.findIndex((t) => t.id === chainLeft[0].id);
          if (ri !== -1) remaining[ri] = { ...remaining[ri], chainId: null };
        }
      }

      await AsyncStorage.setItem('trips', JSON.stringify(remaining));
      router.replace('/timeline');
    } catch {
      Alert.alert('Error', 'No se pudo eliminar el viaje.');
      setSaving(false);
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────────

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

  // En modo edición, la galería muestra el estado pendiente (no el guardado)
  const displayFotos   = editingPhotos ? pendingFotos   : trip.fotos;
  const displayPortada = editingPhotos ? pendingPortada : (trip.portada ?? trip.fotos[0] ?? null);
  const hasPhotos = displayFotos.length > 0;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backLabel}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{trip.ciudad}</Text>
      </View>

      <Animated.View
        style={[styles.animatedContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 80 }}
          ref={scrollViewRef}
        >

          {/* ── GALERÍA ──────────────────────────────────────────────────────── */}
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
                {displayFotos.map((uri) => {
                  const isCover = uri === displayPortada;
                  if (editingPhotos) {
                    return (
                      <View key={uri} style={styles.photoSlot}>
                        <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                        {isCover && <View style={styles.coverFrame} pointerEvents="none" />}
                        <TouchableOpacity
                          style={styles.deletePhotoBtn}
                          onPress={() => markDeletePhoto(uri)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.deletePhotoBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={uri}
                      onPress={() => handleSetPortada(uri)}
                      activeOpacity={0.92}
                      style={styles.photoSlot}
                    >
                      <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
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
                      {isCover && <View style={styles.coverFrame} pointerEvents="none" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.photoControls}>
                {editingPhotos ? (
                  <>
                    {pendingFotos.length < 4 && (
                      <TouchableOpacity
                        style={styles.photoCtrlBtn}
                        onPress={handleAddPhotos}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.photoCtrlBtnText}>+ Agregar</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.photoCtrlBtn}
                      onPress={cancelPhotoEdits}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.photoCtrlBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoCtrlBtn, styles.photoCtrlBtnGold, saving && styles.saveBtnDisabled]}
                      onPress={commitPhotoEdits}
                      disabled={saving}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.photoCtrlBtnText, styles.photoCtrlBtnTextGold]}>
                        {saving ? 'Guardando...' : 'Listo'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {trip.fotos.length > 1 && (
                      <View style={styles.photoCount}>
                        <Text style={styles.photoCountText}>{trip.fotos.length} fotos</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.photoCtrlBtn}
                      onPress={openEditPhotos}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.photoCtrlBtnText}>Editar fotos</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Sin fotos */}
          {!hasPhotos && (
            <View style={styles.noCoverWrap}>
              <Text style={styles.noCoverIcon}>✈</Text>
              <Text style={styles.noCoverText}>Sin fotos</Text>
              <TouchableOpacity style={styles.photoCtrlBtn} onPress={handleAddPhotos} activeOpacity={0.7}>
                <Text style={styles.photoCtrlBtnText}>+ Agregar fotos</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── SECCIÓN PRINCIPAL ────────────────────────────────────────────── */}
          <View
            style={styles.padded}
            onLayout={(e) => { paddedYRef.current = e.nativeEvent.layout.y; }}
          >

            {/* Ubicación */}
            <View style={[styles.infoCard, styles.locationAccent]}>
              <View style={styles.notaHeader}>
                <Text style={styles.cardLabel}>UBICACIÓN</Text>
                {!editingLocation && (
                  <TouchableOpacity onPress={openEditLocation} activeOpacity={0.7}>
                    <Text style={styles.editLink}>Editar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {editingLocation ? (
                <>
                  <TextInput
                    style={styles.locationInput}
                    value={editCiudad}
                    onChangeText={(v) => { setEditCiudad(v); setGeoStatus('idle'); }}
                    placeholder="Ciudad"
                    placeholderTextColor={MUTED}
                    autoCapitalize="words"
                  />
                  <TextInput
                    style={styles.locationInput}
                    value={editPais}
                    onChangeText={(v) => { setEditPais(v); setGeoStatus('idle'); }}
                    placeholder="País"
                    placeholderTextColor={MUTED}
                    autoCapitalize="words"
                  />

                  {geoStatus === 'multiples' && (
                    <View style={styles.geoOpcionesWrap}>
                      {geoOpciones.map((op, i) => (
                        <TouchableOpacity
                          key={i}
                          style={styles.geoOpcion}
                          onPress={() => {
                            setNewCoords({ lat: parseFloat(op.lat), lng: parseFloat(op.lon) });
                            setGeoStatus('encontrada');
                            setGeoOpciones([]);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.geoOpcionText} numberOfLines={2}>{op.display_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {geoStatus === 'encontrada'    && <Text style={styles.geoOk}>✓ Ubicación confirmada</Text>}
                  {geoStatus === 'no_encontrada' && <Text style={styles.geoError}>No se encontró. Revisá los datos.</Text>}
                  {geoStatus === 'error'         && <Text style={styles.geoError}>Error de conexión. Intentá de nuevo.</Text>}

                  <View style={styles.notaActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => { setEditingLocation(false); setGeoStatus('idle'); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    {geoStatus === 'encontrada' ? (
                      <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                        onPress={handleSaveLocation}
                        disabled={saving}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.saveBtn, geoStatus === 'buscando' && styles.saveBtnDisabled]}
                        onPress={buscarUbicacion}
                        disabled={geoStatus === 'buscando'}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.saveText}>{geoStatus === 'buscando' ? 'Buscando...' : 'Buscar'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.locationViewRow}>
                  <View style={styles.locationLeft}>
                    <Text style={styles.cityText}>{trip.ciudad}</Text>
                    <View style={styles.countryRow}>
                      <Text style={styles.countryDiamond}>◆</Text>
                      <Text style={styles.countryText}>{trip.pais}</Text>
                    </View>
                  </View>
                  <Text style={styles.globeSymbol}>◎</Text>
                </View>
              )}
            </View>

            {/* Fecha */}
            {trip.fechaInicio && (
              <View style={styles.infoCard}>
                <View style={styles.notaHeader}>
                  <Text style={styles.cardLabel}>FECHA DEL VIAJE</Text>
                  {!editingFecha && (
                    <TouchableOpacity onPress={openEditFecha} activeOpacity={0.7}>
                      <Text style={styles.editLink}>Editar</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {editingFecha ? (
                  <>
                    <View style={styles.dateEditRow}>
                      <TextInput
                        style={[styles.dateInput, { flex: 1 }]}
                        value={editDia}
                        onChangeText={setEditDia}
                        placeholder="DD"
                        placeholderTextColor={MUTED}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <TextInput
                        style={[styles.dateInput, { flex: 1 }]}
                        value={editMes}
                        onChangeText={setEditMes}
                        placeholder="MM"
                        placeholderTextColor={MUTED}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <TextInput
                        style={[styles.dateInput, { flex: 2 }]}
                        value={editAnio}
                        onChangeText={setEditAnio}
                        placeholder="AAAA"
                        placeholderTextColor={MUTED}
                        keyboardType="number-pad"
                        maxLength={4}
                        autoFocus
                      />
                    </View>
                    <View style={styles.notaActions}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setEditingFecha(false)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                        onPress={handleSaveFecha}
                        disabled={saving}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <Text style={styles.dateValue}>{formatDate(trip.fechaInicio)}</Text>
                )}
              </View>
            )}

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

            {/* Tips */}
            <View
              style={styles.infoCard}
              onLayout={(e) => { tipsCardYRef.current = e.nativeEvent.layout.y; }}
            >
              <View style={styles.notaHeader}>
                <Text style={styles.cardLabel}>TIPS DE VIAJE</Text>
                {!editingTips && (
                  <TouchableOpacity onPress={() => setEditingTips(true)} activeOpacity={0.7}>
                    <Text style={styles.editLink}>{tipsViaje ? 'Editar' : '+ Agregar'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {editingTips ? (
                <>
                  <TextInput
                    style={[styles.notaInput, { height: Math.max(120, tipsInputHeight) }]}
                    autoFocus
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
                      onPress={() => { setTipsViaje(trip.tipsViaje || ''); setEditingTips(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                      onPress={async () => {
                        if (!trip) return;
                        await persistTrip({ ...trip, tipsViaje: tipsViaje.trim() });
                        setEditingTips(false);
                      }}
                      disabled={saving}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => setEditingTips(true)}>
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

            {/* Eliminar viaje */}
            <TouchableOpacity
              style={[styles.deleteBtn, saving && styles.saveBtnDisabled]}
              onPress={handleDeleteTrip}
              activeOpacity={0.7}
              disabled={saving}
            >
              <Text style={styles.deleteBtnText}>Eliminar viaje</Text>
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG },
  loadingRoot:   { flex: 1, backgroundColor: BG },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mutedText:     { color: MUTED, fontSize: 14 },
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
  backBtn:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backIcon:   { fontSize: 32, color: GOLD, lineHeight: 34, marginTop: -2 },
  backLabel:  { fontSize: 15, color: GOLD, fontWeight: '600' },
  headerTitle:{ flex: 1, fontSize: 16, color: TEXT, fontWeight: '600', opacity: 0.6 },

  // Gallery
  galleryWrap: { marginBottom: 22 },
  photoSlot:   { width: SCREEN_W, height: PHOTO_H, position: 'relative' },
  photo:       { width: SCREEN_W, height: PHOTO_H },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: PHOTO_H * 0.4,
    backgroundColor: 'transparent',
  },
  coverBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(212,175,55,0.88)',
    paddingVertical: 11, alignItems: 'center',
  },
  coverBadgeText: { color: BG, fontSize: 12, fontWeight: '800', letterSpacing: 2.5 },
  tapHint: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(1,5,13,0.52)',
    paddingVertical: 11, alignItems: 'center',
  },
  tapHintText: { color: TEXT, fontSize: 12, opacity: 0.7 },
  coverFrame: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 2.5, borderColor: GOLD,
  },
  deletePhotoBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(1,5,13,0.82)',
    borderWidth: 1, borderColor: 'rgba(192,57,43,0.7)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  deletePhotoBtnText: { color: '#e74c3c', fontSize: 14, fontWeight: '700' },

  photoControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  photoCount: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: BORDER,
  },
  photoCountText: { fontSize: 12, color: MUTED, fontWeight: '600' },
  photoCtrlBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  photoCtrlBtnGold: {
    borderColor: 'rgba(212,175,55,0.45)',
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  photoCtrlBtnText:     { fontSize: 12, color: MUTED, fontWeight: '600' },
  photoCtrlBtnTextGold: { color: GOLD },

  // Sin fotos
  noCoverWrap: {
    height: 180, alignItems: 'center', justifyContent: 'center',
    marginBottom: 22, backgroundColor: SURFACE,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10,
  },
  noCoverIcon: { fontSize: 40, opacity: 0.2 },
  noCoverText: { fontSize: 13, color: MUTED },

  // Padded section
  padded: { paddingHorizontal: 20 },

  // Location
  locationAccent: { borderLeftWidth: 3, borderLeftColor: GOLD },
  locationViewRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  locationLeft:   { gap: 4 },
  cityText:       { fontSize: 27, fontWeight: '800', color: TEXT, letterSpacing: 0.2 },
  countryRow:     { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 },
  countryDiamond: { fontSize: 7, color: GOLD },
  countryText:    { fontSize: 14, color: MUTED, fontWeight: '500', letterSpacing: 0.6 },
  globeSymbol:    { fontSize: 38, color: GOLD, opacity: 0.3 },
  locationInput: {
    backgroundColor: '#050d1a',
    borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    color: TEXT, fontSize: 15,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 8,
  },
  geoOpcionesWrap: { marginBottom: 8 },
  geoOpcion: {
    backgroundColor: '#050d1a',
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 4,
  },
  geoOpcionText: { color: TEXT, fontSize: 13, lineHeight: 18 },
  geoOk:    { color: '#2ecc71', fontSize: 13, marginBottom: 8, fontWeight: '600' },
  geoError: { color: '#e74c3c', fontSize: 13, marginBottom: 8 },

  // Date edit
  dateEditRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dateInput: {
    backgroundColor: '#050d1a',
    borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    color: TEXT, fontSize: 16, fontWeight: '600',
    paddingHorizontal: 12, paddingVertical: 12,
    textAlign: 'center',
  },

  // Info cards (shared)
  infoCard: {
    backgroundColor: SURFACE,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 20, paddingVertical: 16,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 10, fontWeight: '700', color: GOLD,
    letterSpacing: 2.2, textTransform: 'uppercase', marginBottom: 8,
  },
  dateValue: { fontSize: 18, color: TEXT, fontWeight: '600' },

  // Nota / Tips
  notaHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  editLink:  { fontSize: 13, color: GOLD, fontWeight: '600' },
  notaText:  { fontSize: 15, color: TEXT, lineHeight: 25 },
  notaEmpty: { fontSize: 14, color: MUTED, fontStyle: 'italic' },
  notaInput: {
    backgroundColor: '#050d1a',
    borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    color: TEXT, fontSize: 15,
    paddingHorizontal: 16, paddingVertical: 14,
    minHeight: 120, marginBottom: 12, lineHeight: 22,
  },
  notaActions:      { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    borderRadius: 11, borderWidth: 1, borderColor: BORDER,
  },
  cancelText:       { color: MUTED, fontSize: 14, fontWeight: '600' },
  saveBtn: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    borderRadius: 11, backgroundColor: GOLD,
  },
  saveBtnDisabled:  { opacity: 0.55 },
  saveText:         { color: BG, fontSize: 14, fontWeight: '700' },

  // Share tips
  shareBtn: {
    marginTop: 12, paddingVertical: 10, alignItems: 'center',
    borderRadius: 11, borderWidth: 1, borderColor: GOLD,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  shareBtnText: { color: GOLD, fontSize: 13, fontWeight: '600', letterSpacing: 1 },

  // Delete trip
  deleteBtn: {
    marginTop: 8, marginBottom: 4,
    paddingVertical: 14, alignItems: 'center',
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.4)',
    backgroundColor: 'rgba(192,57,43,0.07)',
  },
  deleteBtnText: { color: DANGER, fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },

  bottomSpacer: { height: 48 },
});
