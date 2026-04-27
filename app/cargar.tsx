import NavBar from '../components/NavBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
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

export default function CargarViaje() {
  const [tipo, setTipo] = useState<TripType>('real');
  const [ciudad, setCiudad] = useState('');
  const [pais, setPais] = useState('');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [nota, setNota] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'buscando' | 'encontrada' | 'no_encontrada' | 'error'>('idle');
  const [geoNombre, setGeoNombre] = useState('');
  const chainIdRef = useRef<string | null>(null);

  function resetForm() {
    setCiudad('');
    setPais('');
    setDia('');
    setMes('');
    setAnio('');
    setNota('');
    setFotos([]);
    setCoords(null);
    setGeoStatus('idle');
    setGeoNombre('');
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

  async function pickImage() {
    if (fotos.length >= 4) {
      Alert.alert('Máximo 4 fotos', 'Ya cargaste el máximo de fotos permitidas.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      setFotos((prev) => [...prev, result.assets[0].uri]);
    }
  }

  async function takePhoto() {
    if (fotos.length >= 4) {
      Alert.alert('Máximo 4 fotos', 'Ya cargaste el máximo de fotos permitidas.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
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

  async function handleGuardar() {
    if (!validate()) return;
    try {
      const trip = buildTrip(null);
      await saveTrip(trip);
      chainIdRef.current = null;
      resetForm();
      Alert.alert('¡Guardado!', `Tu ${tipo === 'real' ? 'viaje' : 'destino'} fue guardado correctamente.`);
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intentá de nuevo.');
    }
  }

  async function handleGuardarYAgregarDestino() {
    if (!validate()) return;
    try {
      if (!chainIdRef.current) {
        chainIdRef.current = genId();
      }
      const trip = buildTrip(chainIdRef.current);
      await saveTrip(trip);
      resetForm();
      Alert.alert('Destino guardado', 'Cargá el siguiente destino del mismo viaje.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intentá de nuevo.');
    }
  }

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Cargar viaje</Text>
        <Text style={styles.subtitle}>Registrá tu experiencia o tu próximo destino</Text>

        {/* Toggle tipo */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, tipo === 'real' && styles.toggleBtnActive]}
            onPress={() => setTipo('real')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, tipo === 'real' && styles.toggleTextActive]}>
              Ya lo hice
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, tipo === 'wishlist' && styles.toggleBtnActive]}
            onPress={() => setTipo('wishlist')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, tipo === 'wishlist' && styles.toggleTextActive]}>
              Lo quiero hacer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sección fotos — solo para real */}
        {tipo === 'real' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Fotos ({fotos.length}/4)</Text>
            <Text style={styles.sectionHint}>La primera foto será la portada del viaje.</Text>

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

              {fotos.length < 4 && (
                <View style={styles.addPhotoGroup}>
                  <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage} activeOpacity={0.8}>
                    <Text style={styles.addPhotoIcon}>🖼</Text>
                    <Text style={styles.addPhotoLabel}>Galería</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addPhotoBtn} onPress={takePhoto} activeOpacity={0.8}>
                    <Text style={styles.addPhotoIcon}>📷</Text>
                    <Text style={styles.addPhotoLabel}>Cámara</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
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
            style={[styles.outlineBtn, geoStatus === 'buscando' && styles.outlineBtnDisabled]}
            onPress={buscarUbicacion}
            activeOpacity={0.8}
            disabled={geoStatus === 'buscando'}
          >
            <Text style={styles.outlineBtnText}>
              {geoStatus === 'buscando' ? 'Buscando...' : 'Buscar ubicación'}
            </Text>
          </TouchableOpacity>

          {geoStatus === 'encontrada' && (
            <View style={styles.geoFound}>
              <Text style={styles.geoCheck}>✓</Text>
              <Text style={styles.geoFoundText} numberOfLines={2}>{geoNombre}</Text>
            </View>
          )}

          {(geoStatus === 'no_encontrada' || geoStatus === 'error') && (
            <View style={styles.geoNotFound}>
              <Text style={styles.geoNotFoundText}>
                Ubicación no encontrada. Revisá la ciudad y el país.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.8}>
            <Text style={styles.outlineBtnText}>Elegir país de la lista</Text>
          </TouchableOpacity>
        </View>

        {/* Fecha — solo para real */}
        {tipo === 'real' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Fecha de inicio</Text>
            <View style={styles.dateRow}>
              <TextInput
                style={[styles.input, styles.datePart]}
                placeholder="DD"
                placeholderTextColor={MUTED}
                value={dia}
                onChangeText={(t) => setDia(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <TextInput
                style={[styles.input, styles.datePart]}
                placeholder="MM"
                placeholderTextColor={MUTED}
                value={mes}
                onChangeText={(t) => setMes(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <TextInput
                style={[styles.input, styles.dateYear]}
                placeholder="AAAA"
                placeholderTextColor={MUTED}
                value={anio}
                onChangeText={(t) => setAnio(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
              />
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 32,
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: BORDER,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: GOLD,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
  },
  toggleTextActive: {
    color: BG,
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
  sectionHint: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 12,
    marginTop: -6,
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

  // Date
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  datePart: {
    flex: 1,
    textAlign: 'center',
    marginBottom: 0,
  },
  dateYear: {
    flex: 1.8,
    textAlign: 'center',
    marginBottom: 0,
  },

  // Photos
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
  addPhotoGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoIcon: {
    fontSize: 22,
  },
  addPhotoLabel: {
    fontSize: 10,
    color: MUTED,
    fontWeight: '600',
  },

  // Outline buttons (placeholders)
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
