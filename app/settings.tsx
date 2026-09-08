import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyBackup,
  BackupPayload,
  buildRestoreConfirmMessage,
  clearAllUserData,
  formatBackupDate,
  getRawBackup,
  hasCurrentData,
  parseBackup,
  writeBackup,
} from '../utils/backupEngine';
import { copiarFotoPersistente, PERFIL_DIR } from '../utils/fotoPersistente';
import { GeoOpcion, geocodeNominatim } from '../utils/geocoding';
import { buscarPaises, getPaisPorIso2, Pais } from '../utils/paises';
import { playSound } from '../utils/soundEngine';
import { runOrigenCoordsMigration } from '../utils/tripOriginMigration';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const BG = '#01050d';
const GOLD = '#d4af37';
const GOLD_DIM = 'rgba(212,175,55,0.12)';
const GOLD_BORDER = 'rgba(212,175,55,0.28)';
const TEXT = '#e8e0d0';
const MUTED = '#4a5a6a';
const SECTION_BG = '#07101e';
const DANGER = '#c0392b';
const REPORT_EMAIL = 'myworldxp.app@gmail.com';

interface Residencia {
  ciudad: string;
  pais: string;
  countryCode: string;
  lat: number;
  lng: number;
}

interface UserData {
  foto?: string;
  apellido?: string;
  nombre?: string;
  nacionalidad?: string;
  residencia?: Residencia;
}

type GeoStatus = 'idle' | 'validando' | 'encontrada' | 'no_encontrada' | 'error' | 'multiples';

export default function Settings() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');
  const [foto, setFoto] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');

  // ── Residencia ("kilómetro cero") ──────────────────────────────────────────
  // Mismo motor de validación que Crear Perfil (utils/geocoding.ts + utils/paises.ts):
  // país elegido de una lista cerrada, ciudad geocodificada junto con el país,
  // sin validaciones concurrentes, cero-resultados vs error de red diferenciados.
  const [paisSeleccionado, setPaisSeleccionado] = useState<Pais | null>(null);
  const [paisModalVisible, setPaisModalVisible] = useState(false);
  const [paisQuery, setPaisQuery] = useState('');
  const [residenciaCiudad, setResidenciaCiudad] = useState('');
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [geoOpciones, setGeoOpciones] = useState<GeoOpcion[]>([]);
  const [ubicacionConfirmada, setUbicacionConfirmada] = useState<Residencia | null>(null);

  // Flujo de tres estados: lectura (bloqueado, botón EDITAR) → edición
  // (campos habilitados, botón GUARDAR) → confirmado (botón OK verde temporal,
  // luego vuelve a lectura). Arranca en edición solo si todavía no hay
  // residencia guardada (primera carga).
  const [residenciaEditMode, setResidenciaEditMode] = useState(false);
  const [residenciaGuardando, setResidenciaGuardando] = useState(false);
  const [residenciaGuardadoOk, setResidenciaGuardadoOk] = useState(false);

  const ciudadRef = useRef<TextInput>(null);
  const ciudadValueRef = useRef(residenciaCiudad);
  const paisSeleccionadoRef = useRef(paisSeleccionado);
  useEffect(() => { ciudadValueRef.current = residenciaCiudad; }, [residenciaCiudad]);
  useEffect(() => { paisSeleccionadoRef.current = paisSeleccionado; }, [paisSeleccionado]);
  const validandoRef = useRef(false);

  // Scroll/teclado de la sección Residencia: se mide la posición de la sección
  // y un ancla al final (justo después del botón) para poder llevarla a una
  // zona visible por encima del teclado sin taparla.
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const residBottomAnchorRef = useRef<View>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollResidenciaIntoView = (delay = 0) => {
    setTimeout(() => {
      requestAnimationFrame(() => {
        residBottomAnchorRef.current?.measureInWindow((_x, y, _w, h) => {
          const windowHeight = Dimensions.get('window').height;
          const visibleBottom = windowHeight - keyboardHeight - 16;
          const overflow = y + h - visibleBottom;
          if (overflow > 0) {
            scrollRef.current?.scrollTo({ y: scrollYRef.current + overflow, animated: true });
          }
        });
      });
    }, delay);
  };

  useEffect(() => {
    AsyncStorage.getItem('userData').then((raw) => {
      if (raw) {
        const data: UserData = JSON.parse(raw);
        setNombre(data.nombre ?? '');
        setApellido(data.apellido ?? '');
        setNacionalidad(data.nacionalidad ?? '');
        setFoto(data.foto);
        if (data.residencia) {
          const paisActual = getPaisPorIso2(data.residencia.countryCode);
          if (paisActual) {
            setPaisSeleccionado(paisActual);
            setResidenciaCiudad(data.residencia.ciudad);
            setUbicacionConfirmada(data.residencia);
            setGeoStatus('encontrada');
            setResidenciaEditMode(false);
            return;
          }
        }
      }
      // Sin residencia guardada todavía (o país inválido): arranca en edición.
      setResidenciaEditMode(true);
    });
  }, []);

  // Al aparecer varias coincidencias, llevar la lista a una zona visible.
  useEffect(() => {
    if (geoStatus === 'multiples') {
      scrollResidenciaIntoView(80);
    }
  }, [geoStatus]);

  async function validarResidencia(cInput: string, paisSel: Pais) {
    const cTrim = cInput.trim();
    if (!cTrim) return;
    if (validandoRef.current) return;
    validandoRef.current = true;
    setGeoStatus('validando');
    try {
      const data = await geocodeNominatim(`${cTrim}, ${paisSel.nombre}`, 5, paisSel.iso2);
      if (ciudadValueRef.current.trim() !== cTrim || paisSeleccionadoRef.current?.iso2 !== paisSel.iso2) {
        return; // el usuario cambió algo mientras esperábamos la respuesta
      }
      if (data.length === 0) {
        setUbicacionConfirmada(null);
        setGeoStatus('no_encontrada');
      } else if (data.length === 1) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setUbicacionConfirmada({ ciudad: cTrim, pais: paisSel.nombre, countryCode: paisSel.iso2, lat, lng });
          setGeoStatus('encontrada');
          setGeoOpciones([]);
        } else {
          setUbicacionConfirmada(null);
          setGeoStatus('no_encontrada');
        }
      } else {
        setGeoOpciones(data);
        setGeoStatus('multiples');
        setUbicacionConfirmada(null);
      }
    } catch {
      setUbicacionConfirmada(null);
      setGeoStatus('error');
    } finally {
      validandoRef.current = false;
    }
  }

  function elegirOpcionMultiple(opt: GeoOpcion) {
    const paisSel = paisSeleccionadoRef.current;
    const cTrim = ciudadValueRef.current.trim();
    if (!paisSel) return;
    const lat = parseFloat(opt.lat);
    const lng = parseFloat(opt.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setUbicacionConfirmada({ ciudad: cTrim, pais: paisSel.nombre, countryCode: paisSel.iso2, lat, lng });
    setGeoStatus('encontrada');
    setGeoOpciones([]);
    Keyboard.dismiss();
    scrollResidenciaIntoView(80);
  }

  function seleccionarPaisResidencia(p: Pais) {
    setPaisSeleccionado(p);
    setPaisModalVisible(false);
    setPaisQuery('');
    setUbicacionConfirmada(null);
    setGeoStatus('idle');
    setGeoOpciones([]);
    setTimeout(() => ciudadRef.current?.focus(), 300);
  }

  const iniciarEdicionResidencia = () => {
    setResidenciaEditMode(true);
    scrollResidenciaIntoView(50);
  };

  const guardarResidencia = () => {
    if (!ubicacionConfirmada || residenciaGuardando) return;
    Alert.alert(
      'Cambiar residencia',
      'Tu nueva residencia se usará como punto de partida para calcular los próximos viajes. Los viajes que ya cargaste conservarán sus distancias actuales.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar cambio',
          onPress: async () => {
            setResidenciaGuardando(true);
            try {
              const current = await AsyncStorage.getItem('userData');
              const existing: UserData = current ? JSON.parse(current) : {};
              await AsyncStorage.setItem(
                'userData',
                JSON.stringify({ ...existing, residencia: ubicacionConfirmada })
              );
              await runOrigenCoordsMigration();
              setResidenciaEditMode(false);
              setResidenciaGuardadoOk(true);
              setTimeout(() => setResidenciaGuardadoOk(false), 1300);
            } catch {
              Alert.alert('Error', 'No se pudo guardar la residencia. Intentá de nuevo.');
            } finally {
              setResidenciaGuardando(false);
            }
          },
        },
      ]
    );
  };

  const geoErrorMsg =
    geoStatus === 'no_encontrada'
      ? 'Ciudad no encontrada.'
      : geoStatus === 'error'
      ? 'No se pudo validar la ciudad. Verificá tu conexión e intentá nuevamente.'
      : '';
  const paisesFiltrados = buscarPaises(paisQuery);

  const saveUserData = async () => {
    const current = await AsyncStorage.getItem('userData');
    const existing: UserData = current ? JSON.parse(current) : {};
    await AsyncStorage.setItem(
      'userData',
      JSON.stringify({ ...existing, nombre, apellido, nacionalidad, foto })
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const savePhoto = async (uri: string) => {
    try {
      const persistida = await copiarFotoPersistente(uri, PERFIL_DIR);
      const current = await AsyncStorage.getItem('userData');
      const existing: UserData = current ? JSON.parse(current) : {};
      await AsyncStorage.setItem('userData', JSON.stringify({ ...existing, foto: persistida }));
      setFoto(persistida);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la foto. Intentá de nuevo.');
    }
  };

  const openGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitás permitir el acceso a la galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await savePhoto(result.assets[0].uri);
    }
  };

  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitás permitir el acceso a la cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await savePhoto(result.assets[0].uri);
    }
  };

  const pickPhoto = () => {
    Alert.alert('Foto de perfil', 'Elegí una opción', [
      { text: 'Tomar foto', onPress: openCamera },
      { text: 'Elegir de galería', onPress: openGallery },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const saveBackup = async () => {
    try {
      await writeBackup();
      setBackupMsg('Backup guardado correctamente ✓');
      setTimeout(() => setBackupMsg(''), 3500);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el backup.');
    }
  };

  const handleApplyBackup = async (parsed: BackupPayload) => {
    try {
      await applyBackup(parsed);
      setBackupMsg('Backup restaurado correctamente ✓');
      setTimeout(() => setBackupMsg(''), 3500);
      // Refresh local state from restored data
      if (parsed.userData) {
        setNombre(parsed.userData.nombre ?? '');
        setApellido(parsed.userData.apellido ?? '');
        setNacionalidad(parsed.userData.nacionalidad ?? '');
        setFoto(parsed.userData.foto);
      }
    } catch {
      Alert.alert('Error', 'El archivo de backup está dañado o no se puede leer.');
    }
  };

  const loadBackup = async () => {
    try {
      const raw = await getRawBackup();
      if (!raw) {
        Alert.alert('Sin backup', 'No se encontró ningún backup guardado en este dispositivo.');
        return;
      }
      const parsed = parseBackup(raw);

      if (!(await hasCurrentData())) {
        await handleApplyBackup(parsed);
        return;
      }

      const fecha = parsed.savedAt ? formatBackupDate(parsed.savedAt) : null;
      Alert.alert(
        'Backup encontrado',
        buildRestoreConfirmMessage(true, fecha),
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cargar Backup', style: 'destructive', onPress: () => handleApplyBackup(parsed) },
        ]
      );
    } catch {
      Alert.alert('Error', 'El archivo de backup está dañado o no se puede leer.');
    }
  };

  const clearAll = () => {
    Alert.alert(
      'Borrar todos los datos',
      'Se eliminarán permanentemente todos tus viajes, estadísticas y datos de perfil. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: async () => {
            playSound('borrar_todo');
            await clearAllUserData();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const reportarProblema = async () => {
    const appVersion = Constants.expoConfig?.version ?? '1.0.0';
    const deviceInfo = `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Platform.Version}`;
    const subject = 'Reporte de problema - MyWorldXP';
    const body = [
      'Contanos qué ocurrió:',
      '',
      '¿Qué estabas haciendo cuando apareció el problema?',
      '',
      '¿Qué esperabas que pasara?',
      '',
      '¿Qué pasó realmente?',
      '',
      `Modelo de dispositivo: ${deviceInfo}`,
      `Versión de la app: ${appVersion}`,
    ].join('\n');
    const mailtoUrl = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (!supported) {
        Alert.alert(
          'No se encontró una app de correo',
          `Podés escribirnos manualmente a:\n${REPORT_EMAIL}`
        );
        return;
      }
      await Linking.openURL(mailtoUrl);
    } catch {
      Alert.alert(
        'No se pudo abrir el correo',
        `Podés escribirnos manualmente a:\n${REPORT_EMAIL}`
      );
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        {/* ── PERFIL ── */}
        <Text style={styles.sectionLabel}>PERFIL</Text>
        <View style={styles.section}>

          {/* Foto */}
          <TouchableOpacity style={styles.photoRow} onPress={pickPhoto} activeOpacity={0.75}>
            <View style={styles.photoBox}>
              {foto ? (
                <Image source={{ uri: foto }} style={styles.photoImg} resizeMode="cover" />
              ) : (
                <Text style={styles.photoPlaceholder}>+</Text>
              )}
            </View>
            <View style={styles.photoInfo}>
              <Text style={styles.photoLabel}>Foto de perfil</Text>
              <Text style={styles.photoHint}>Tocar para tomar foto o elegir de galería</Text>
            </View>
            <Text style={styles.photoChevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>NOMBRE</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholderTextColor={MUTED}
              placeholder="Tu nombre"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>APELLIDO</Text>
            <TextInput
              style={styles.input}
              value={apellido}
              onChangeText={setApellido}
              placeholderTextColor={MUTED}
              placeholder="Tu apellido"
              autoCapitalize="words"
            />
          </View>

          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <Text style={styles.inputLabel}>NACIONALIDAD</Text>
            <TextInput
              style={styles.input}
              value={nacionalidad}
              onChangeText={setNacionalidad}
              placeholderTextColor={MUTED}
              placeholder="Ej: Argentina"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.btnPrimary, saved && styles.btnPrimarySuccess]}
            onPress={saveUserData}
            activeOpacity={0.8}
          >
            <Text style={styles.btnPrimaryText}>{saved ? 'Guardado ✓' : 'Guardar cambios'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── RESIDENCIA ── */}
        <Text style={styles.sectionLabel}>RESIDENCIA</Text>
        <View style={styles.section}>
          <Text style={styles.sectionDesc}>
            Tu ciudad de residencia es el punto de partida para calcular distancias y horas de vuelo de tus próximos viajes.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PAÍS</Text>
            <TouchableOpacity
              style={[styles.residInputRow, !residenciaEditMode && styles.residInputRowLocked]}
              onPress={() => {
                if (residenciaEditMode) setPaisModalVisible(true);
              }}
              activeOpacity={residenciaEditMode ? 0.75 : 1}
              disabled={!residenciaEditMode}
            >
              <Text style={[styles.residInputText, !paisSeleccionado && styles.residInputPlaceholder]}>
                {paisSeleccionado ? paisSeleccionado.nombre : 'Elegí tu país'}
              </Text>
              {residenciaEditMode ? <Text style={styles.photoChevron}>›</Text> : null}
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <Text style={styles.inputLabel}>CIUDAD</Text>
            <TextInput
              ref={ciudadRef}
              style={[styles.input, !(residenciaEditMode && paisSeleccionado) && { opacity: 0.4 }]}
              value={residenciaCiudad}
              editable={residenciaEditMode && !!paisSeleccionado}
              placeholder="Ciudad donde residís"
              placeholderTextColor={MUTED}
              onChangeText={(t) => {
                setResidenciaCiudad(t);
                setUbicacionConfirmada(null);
                setGeoOpciones([]);
                setGeoStatus('idle');
              }}
              onFocus={() => scrollResidenciaIntoView(250)}
              onBlur={() => {
                if (!residenciaCiudad.trim() || !paisSeleccionado) return;
                validarResidencia(residenciaCiudad, paisSeleccionado);
              }}
              returnKeyType="done"
            />
            {geoStatus === 'validando' ? (
              <Text style={styles.residHint}>Validando ubicación...</Text>
            ) : null}
            {geoErrorMsg ? <Text style={styles.residError}>{geoErrorMsg}</Text> : null}
            {geoStatus === 'multiples' && geoOpciones.length > 0 ? (
              <View style={styles.sugList}>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {geoOpciones.map((opt, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.sugItem}
                      activeOpacity={0.7}
                      onPress={() => elegirOpcionMultiple(opt)}
                    >
                      <Text style={styles.sugText}>{opt.display_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[
              styles.btnPrimary,
              residenciaGuardadoOk && styles.btnPrimarySuccess,
              residenciaEditMode && !ubicacionConfirmada && styles.btnPrimaryDisabled,
            ]}
            onPress={residenciaEditMode ? guardarResidencia : iniciarEdicionResidencia}
            activeOpacity={0.8}
            disabled={residenciaGuardadoOk || residenciaGuardando || (residenciaEditMode && !ubicacionConfirmada)}
          >
            <Text style={styles.btnPrimaryText}>
              {residenciaGuardadoOk ? 'OK' : residenciaEditMode ? 'Guardar' : 'Editar'}
            </Text>
          </TouchableOpacity>
          <View ref={residBottomAnchorRef} />
        </View>

        {/* ── BACKUP & RESTORE ── */}
        <Text style={styles.sectionLabel}>DATOS Y BACKUP</Text>
        <View style={styles.section}>
          {backupMsg !== '' && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{backupMsg}</Text>
            </View>
          )}

          <Text style={styles.sectionDesc}>
            El backup almacena tu perfil y todos tus viajes localmente en el dispositivo.
          </Text>

          <TouchableOpacity style={styles.btnSecondary} onPress={saveBackup} activeOpacity={0.8}>
            <Text style={styles.btnSecondaryIcon}>↓</Text>
            <Text style={styles.btnSecondaryText}>Guardar backup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSecondary, { marginTop: 10 }]}
            onPress={loadBackup}
            activeOpacity={0.8}
          >
            <Text style={styles.btnSecondaryIcon}>↑</Text>
            <Text style={styles.btnSecondaryText}>Cargar backup</Text>
          </TouchableOpacity>
        </View>

        {/* ── ZONA DE PELIGRO ── */}
        <Text style={styles.sectionLabel}>ZONA DE PELIGRO</Text>
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={styles.dangerDesc}>
            Elimina permanentemente todos tus viajes, estadísticas y datos de perfil. No se puede deshacer.
          </Text>
          <TouchableOpacity style={styles.btnDanger} onPress={clearAll} activeOpacity={0.8}>
            <Text style={styles.btnDangerText}>Borrar todos los datos</Text>
          </TouchableOpacity>
        </View>

        {/* ── SOPORTE ── */}
        <Text style={styles.sectionLabel}>SOPORTE</Text>
        <View style={styles.section}>
          <Text style={styles.sectionDesc}>
            ¿Encontraste un error o algo no funciona como esperabas? Contanos qué pasó.
          </Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={reportarProblema} activeOpacity={0.8}>
            <Text style={styles.btnSecondaryIcon}>✉</Text>
            <Text style={styles.btnSecondaryText}>Reportar problema</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>MyWorldXP · v1.0</Text>
        <View style={{ height: 60 }} />
      </ScrollView>

      <Modal
        visible={paisModalVisible}
        animationType="slide"
        onRequestClose={() => setPaisModalVisible(false)}
      >
        <View style={styles.paisModalContainer}>
          <View style={styles.paisModalHeader}>
            <Text style={styles.paisModalTitle}>Elegí tu país</Text>
            <TouchableOpacity onPress={() => setPaisModalVisible(false)}>
              <Text style={styles.paisModalClose}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.paisSearchBox}>
            <Feather name="search" size={16} color={GOLD} />
            <TextInput
              style={styles.paisSearchInput}
              placeholder="Buscar país..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={paisQuery}
              onChangeText={setPaisQuery}
              autoFocus
            />
          </View>
          <FlatList
            data={paisesFiltrados}
            keyExtractor={(item) => item.iso2}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.paisModalItem}
                activeOpacity={0.7}
                onPress={() => seleccionarPaisResidencia(item)}
              >
                <Text style={styles.paisModalItemText}>{item.nombre}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.paisModalEmpty}>No se encontraron países.</Text>}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.14)',
  },
  backBtn: {
    width: 32,
    alignItems: 'flex-start',
  },
  backArrow: {
    fontSize: 30,
    color: GOLD,
    lineHeight: 34,
    fontFamily: 'Georgia',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 3,
    fontFamily: 'Georgia',
    textTransform: 'uppercase',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },

  sectionLabel: {
    fontSize: 9,
    letterSpacing: 3.5,
    color: MUTED,
    fontFamily: 'Georgia',
    marginBottom: 8,
    marginLeft: 4,
  },

  section: {
    backgroundColor: SECTION_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    padding: 18,
    marginBottom: 28,
  },

  divider: {
    height: 1,
    backgroundColor: GOLD_BORDER,
    marginVertical: 16,
  },

  // Photo
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photoBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: '#0d1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    fontSize: 28,
    color: GOLD,
    lineHeight: 34,
    opacity: 0.6,
  },
  photoInfo: {
    flex: 1,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT,
    fontFamily: 'Georgia',
    marginBottom: 4,
  },
  photoHint: {
    fontSize: 11,
    color: MUTED,
    letterSpacing: 0.2,
  },
  photoChevron: {
    fontSize: 22,
    color: GOLD,
    opacity: 0.5,
    fontFamily: 'Georgia',
  },

  // Inputs
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 9,
    letterSpacing: 3,
    color: GOLD,
    fontFamily: 'Georgia',
    marginBottom: 7,
    opacity: 0.75,
  },
  input: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    backgroundColor: 'rgba(212,175,55,0.04)',
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 15,
    fontFamily: 'Courier',
    letterSpacing: 0.3,
  },

  // Primary button
  btnPrimary: {
    height: 48,
    borderRadius: 10,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimarySuccess: {
    backgroundColor: '#2e7d32',
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0a1628',
    letterSpacing: 2,
    fontFamily: 'Georgia',
    textTransform: 'uppercase',
  },

  // Secondary button
  btnSecondary: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: GOLD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD_DIM,
    flexDirection: 'row',
    gap: 8,
  },
  btnSecondaryIcon: {
    fontSize: 16,
    color: GOLD,
    fontWeight: '700',
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: GOLD,
    letterSpacing: 1.5,
    fontFamily: 'Georgia',
  },

  sectionDesc: {
    fontSize: 12,
    color: MUTED,
    lineHeight: 19,
    marginBottom: 16,
    letterSpacing: 0.2,
  },

  successBanner: {
    backgroundColor: 'rgba(46,125,50,0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(46,125,50,0.35)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    color: '#66bb6a',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Danger zone
  dangerSection: {
    borderColor: 'rgba(192,57,43,0.3)',
    backgroundColor: 'rgba(192,57,43,0.04)',
  },
  dangerDesc: {
    fontSize: 12,
    color: 'rgba(192,57,43,0.65)',
    lineHeight: 19,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  btnDanger: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: DANGER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(192,57,43,0.08)',
  },
  btnDangerText: {
    fontSize: 13,
    fontWeight: '600',
    color: DANGER,
    letterSpacing: 1.5,
    fontFamily: 'Georgia',
  },

  version: {
    textAlign: 'center',
    fontSize: 10,
    color: 'rgba(74,90,106,0.5)',
    letterSpacing: 2,
    marginBottom: 8,
  },

  // Residencia
  residInputRow: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    backgroundColor: 'rgba(212,175,55,0.04)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  residInputRowLocked: {
    opacity: 0.55,
  },
  residInputText: {
    color: TEXT,
    fontSize: 15,
    fontFamily: 'Courier',
    letterSpacing: 0.3,
  },
  residInputPlaceholder: {
    color: MUTED,
  },
  residHint: {
    marginTop: 6,
    fontSize: 11,
    color: MUTED,
  },
  residError: {
    marginTop: 6,
    fontSize: 11,
    color: '#e07070',
  },
  btnPrimaryDisabled: {
    opacity: 0.4,
  },
  sugList: {
    backgroundColor: SECTION_BG,
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 8,
    maxHeight: 220,
    marginTop: 6,
  },
  sugItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GOLD_BORDER,
  },
  sugText: {
    color: TEXT,
    fontSize: 14,
  },

  // Modal de selección de país (mismo patrón que Crear Perfil)
  paisModalContainer: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 60,
  },
  paisModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  paisModalTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  paisModalClose: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '600',
  },
  paisSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    backgroundColor: 'rgba(212,175,55,0.05)',
    paddingHorizontal: 14,
    gap: 10,
  },
  paisSearchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
  },
  paisModalItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.15)',
  },
  paisModalItemText: {
    color: TEXT,
    fontSize: 15,
  },
  paisModalEmpty: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
});