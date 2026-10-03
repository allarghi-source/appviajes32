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
import { useAppLanguage } from '../hooks/use-app-language';
import { copiarFotoPersistente, PERFIL_DIR, resolveFotoUri } from '../utils/fotoPersistente';
import { GeoOpcion, geocodeNominatim } from '../utils/geocoding';
import { buscarPaises, getPaisPorIso2, Pais } from '../utils/paises';
import { playSound } from '../utils/soundEngine';
import { runOrigenCoordsMigration } from '../utils/tripOriginMigration';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { language, setLanguage } = useAppLanguage();
  const { t } = useTranslation(['settings', 'common', 'profile']);
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
      t('settings:residencia.changeAlertTitle'),
      t('settings:residencia.changeAlertMessage'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('settings:residencia.confirmChangeButton'),
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
              Alert.alert(t('common:error'), t('settings:residencia.saveErrorMessage'));
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
      ? t('profile:errors.ciudadNoEncontrada')
      : geoStatus === 'error'
      ? t('common:locationValidation.connectionError')
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
      Alert.alert(t('common:error'), t('profile:alerts.savePhotoError'));
    }
  };

  const openGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('common:permission.titleRequerido'), t('common:permission.galleryRequerido'));
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
      Alert.alert(t('common:permission.titleRequerido'), t('common:permission.cameraRequerido'));
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
    Alert.alert(t('settings:profile.photoLabel'), t('settings:photoPicker.message'), [
      { text: t('settings:photoPicker.takePhoto'), onPress: openCamera },
      { text: t('settings:photoPicker.chooseFromGallery'), onPress: openGallery },
      { text: t('common:cancel'), style: 'cancel' },
    ]);
  };

  const saveBackup = async () => {
    try {
      await writeBackup();
      setBackupMsg(t('settings:backup.savedBanner'));
      setTimeout(() => setBackupMsg(''), 3500);
    } catch {
      Alert.alert(t('common:error'), t('settings:backup.saveErrorMessage'));
    }
  };

  const handleApplyBackup = async (parsed: BackupPayload) => {
    try {
      await applyBackup(parsed);
      setBackupMsg(t('settings:backup.restoredBanner'));
      setTimeout(() => setBackupMsg(''), 3500);
      // Refresh local state from restored data
      if (parsed.userData) {
        setNombre(parsed.userData.nombre ?? '');
        setApellido(parsed.userData.apellido ?? '');
        setNacionalidad(parsed.userData.nacionalidad ?? '');
        setFoto(parsed.userData.foto);
      }
    } catch {
      Alert.alert(t('common:error'), t('common:backupCorrupt'));
    }
  };

  const loadBackup = async () => {
    try {
      const raw = await getRawBackup();
      if (!raw) {
        Alert.alert(t('settings:backup.notFoundTitle'), t('settings:backup.notFoundMessage'));
        return;
      }
      const parsed = parseBackup(raw);

      if (!(await hasCurrentData())) {
        await handleApplyBackup(parsed);
        return;
      }

      const fecha = parsed.savedAt ? formatBackupDate(parsed.savedAt) : null;
      Alert.alert(
        t('settings:backup.foundTitle'),
        buildRestoreConfirmMessage(true, fecha),
        [
          { text: t('common:cancel'), style: 'cancel' },
          { text: t('settings:backup.loadButtonLabel'), style: 'destructive', onPress: () => handleApplyBackup(parsed) },
        ]
      );
    } catch {
      Alert.alert(t('common:error'), t('common:backupCorrupt'));
    }
  };

  const clearAll = () => {
    Alert.alert(
      t('settings:danger.confirmTitle'),
      t('settings:danger.confirmMessage'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('settings:danger.confirmButton'),
          style: 'destructive',
          onPress: async () => {
            playSound('borrar_todo');
            await clearAllUserData();
            // clearAllUserData() ya borra app_language (ver STORAGE_KEYS en
            // utils/backupEngine.ts) -- ir directo a select-language evita
            // tener que cerrar y reabrir la app para volver al estado inicial.
            router.replace('/select-language');
          },
        },
      ]
    );
  };

  const reportarProblema = async () => {
    const appVersion = Constants.expoConfig?.version ?? '1.0.0';
    const deviceInfo = `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Platform.Version}`;
    const subject = t('settings:support.emailSubject');
    const body = [
      t('settings:support.emailBodyIntro'),
      '',
      t('settings:support.emailBodyQ1'),
      '',
      t('settings:support.emailBodyQ2'),
      '',
      t('settings:support.emailBodyQ3'),
      '',
      t('settings:support.emailBodyDevice', { device: deviceInfo }),
      t('settings:support.emailBodyVersion', { version: appVersion }),
    ].join('\n');
    const mailtoUrl = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (!supported) {
        Alert.alert(
          t('settings:support.noMailAppTitle'),
          t('settings:support.manualEmailMessage', { email: REPORT_EMAIL })
        );
        return;
      }
      await Linking.openURL(mailtoUrl);
    } catch {
      Alert.alert(
        t('settings:support.mailtoFailedTitle'),
        t('settings:support.manualEmailMessage', { email: REPORT_EMAIL })
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
        <Text style={styles.headerTitle}>{t('settings:header.title')}</Text>
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
        <Text style={styles.sectionLabel}>{t('settings:profile.sectionLabel')}</Text>
        <View style={styles.section}>

          {/* Foto */}
          <TouchableOpacity style={styles.photoRow} onPress={pickPhoto} activeOpacity={0.75}>
            <View style={styles.photoBox}>
              {foto ? (
                <Image source={{ uri: resolveFotoUri(foto) ?? foto }} style={styles.photoImg} resizeMode="cover" />
              ) : (
                <Text style={styles.photoPlaceholder}>+</Text>
              )}
            </View>
            <View style={styles.photoInfo}>
              <Text style={styles.photoLabel}>{t('settings:profile.photoLabel')}</Text>
              <Text style={styles.photoHint}>{t('settings:profile.photoHint')}</Text>
            </View>
            <Text style={styles.photoChevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('settings:profile.nombreLabel')}</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholderTextColor={MUTED}
              placeholder={t('settings:profile.nombrePlaceholder')}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('settings:profile.apellidoLabel')}</Text>
            <TextInput
              style={styles.input}
              value={apellido}
              onChangeText={setApellido}
              placeholderTextColor={MUTED}
              placeholder={t('settings:profile.apellidoPlaceholder')}
              autoCapitalize="words"
            />
          </View>

          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <Text style={styles.inputLabel}>{t('settings:profile.nacionalidadLabel')}</Text>
            <TextInput
              style={styles.input}
              value={nacionalidad}
              onChangeText={setNacionalidad}
              placeholderTextColor={MUTED}
              placeholder={t('settings:profile.nacionalidadPlaceholder')}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.btnPrimary, saved && styles.btnPrimarySuccess]}
            onPress={saveUserData}
            activeOpacity={0.8}
          >
            <Text style={styles.btnPrimaryText}>{saved ? t('settings:profile.savedButton') : t('settings:profile.saveButton')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── RESIDENCIA ── */}
        <Text style={styles.sectionLabel}>{t('settings:residencia.sectionLabel')}</Text>
        <View style={styles.section}>
          <Text style={styles.sectionDesc}>
            {t('settings:residencia.description')}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('settings:residencia.paisLabel')}</Text>
            <TouchableOpacity
              style={[styles.residInputRow, !residenciaEditMode && styles.residInputRowLocked]}
              onPress={() => {
                if (residenciaEditMode) setPaisModalVisible(true);
              }}
              activeOpacity={residenciaEditMode ? 0.75 : 1}
              disabled={!residenciaEditMode}
            >
              <Text style={[styles.residInputText, !paisSeleccionado && styles.residInputPlaceholder]}>
                {paisSeleccionado ? paisSeleccionado.nombre : t('common:countryPicker.selectCountry')}
              </Text>
              {residenciaEditMode ? <Text style={styles.photoChevron}>›</Text> : null}
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <Text style={styles.inputLabel}>{t('settings:residencia.ciudadLabel')}</Text>
            <TextInput
              ref={ciudadRef}
              style={[styles.input, !(residenciaEditMode && paisSeleccionado) && { opacity: 0.4 }]}
              value={residenciaCiudad}
              editable={residenciaEditMode && !!paisSeleccionado}
              placeholder={t('profile:placeholders.ciudad')}
              placeholderTextColor={MUTED}
              onChangeText={(text) => {
                setResidenciaCiudad(text);
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
              <Text style={styles.residHint}>{t('common:locationValidation.validating')}</Text>
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
              {residenciaGuardadoOk
                ? t('settings:residencia.okButton')
                : residenciaEditMode
                ? t('common:save')
                : t('settings:residencia.editButton')}
            </Text>
          </TouchableOpacity>
          <View ref={residBottomAnchorRef} />
        </View>

        {/* ── IDIOMA / LANGUAGE ── */}
        <Text style={styles.sectionLabel}>{t('settings:language.sectionLabel')}</Text>
        <View style={styles.section}>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langOption, language === 'es' && styles.langOptionActive]}
              activeOpacity={0.85}
              onPress={() => setLanguage('es')}
            >
              <Text style={[styles.langOptionText, language === 'es' && styles.langOptionTextActive]}>
                {t('settings:language.spanish')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langOption, language === 'en' && styles.langOptionActive]}
              activeOpacity={0.85}
              onPress={() => setLanguage('en')}
            >
              <Text style={[styles.langOptionText, language === 'en' && styles.langOptionTextActive]}>
                {t('settings:language.english')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── BACKUP & RESTORE ── */}
        <Text style={styles.sectionLabel}>{t('settings:backup.sectionLabel')}</Text>
        <View style={styles.section}>
          {backupMsg !== '' && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{backupMsg}</Text>
            </View>
          )}

          <Text style={styles.sectionDesc}>
            {t('settings:backup.description')}
          </Text>

          <TouchableOpacity style={styles.btnSecondary} onPress={saveBackup} activeOpacity={0.8}>
            <Text style={styles.btnSecondaryIcon}>↓</Text>
            <Text style={styles.btnSecondaryText}>{t('settings:backup.saveButton')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSecondary, { marginTop: 10 }]}
            onPress={loadBackup}
            activeOpacity={0.8}
          >
            <Text style={styles.btnSecondaryIcon}>↑</Text>
            <Text style={styles.btnSecondaryText}>{t('settings:backup.loadButton')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── ZONA DE PELIGRO ── */}
        <Text style={styles.sectionLabel}>{t('settings:danger.sectionLabel')}</Text>
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={styles.dangerDesc}>
            {t('settings:danger.description')}
          </Text>
          <TouchableOpacity style={styles.btnDanger} onPress={clearAll} activeOpacity={0.8}>
            <Text style={styles.btnDangerText}>{t('settings:danger.button')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── SOPORTE ── */}
        <Text style={styles.sectionLabel}>{t('settings:support.sectionLabel')}</Text>
        <View style={styles.section}>
          <Text style={styles.sectionDesc}>
            {t('settings:support.description')}
          </Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={reportarProblema} activeOpacity={0.8}>
            <Text style={styles.btnSecondaryIcon}>✉</Text>
            <Text style={styles.btnSecondaryText}>{t('settings:support.button')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>{t('settings:footer')}</Text>
        <View style={{ height: 60 }} />
      </ScrollView>

      <Modal
        visible={paisModalVisible}
        animationType="slide"
        onRequestClose={() => setPaisModalVisible(false)}
      >
        <View style={styles.paisModalContainer}>
          <View style={styles.paisModalHeader}>
            <Text style={styles.paisModalTitle}>{t('common:countryPicker.selectCountry')}</Text>
            <TouchableOpacity onPress={() => setPaisModalVisible(false)}>
              <Text style={styles.paisModalClose}>{t('common:cancel')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.paisSearchBox}>
            <Feather name="search" size={16} color={GOLD} />
            <TextInput
              style={styles.paisSearchInput}
              placeholder={t('common:countryPicker.searchPlaceholder')}
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
            ListEmptyComponent={<Text style={styles.paisModalEmpty}>{t('common:countryPicker.noResults')}</Text>}
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

  // Idioma / Language
  langRow: {
    flexDirection: 'row',
    gap: 12,
  },
  langOption: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    paddingVertical: 14,
    alignItems: 'center',
  },
  langOptionActive: {
    backgroundColor: GOLD_DIM,
    borderColor: GOLD,
  },
  langOptionText: {
    fontSize: 14,
    fontFamily: 'Georgia',
    color: MUTED,
  },
  langOptionTextActive: {
    color: TEXT,
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