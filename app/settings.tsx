import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
const BACKUP_KEY = 'backup_myworldxp';

interface UserData {
  foto?: string;
  apellido?: string;
  nombre?: string;
  nacionalidad?: string;
}

export default function Settings() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');
  const [foto, setFoto] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('userData').then((raw) => {
      if (raw) {
        const data: UserData = JSON.parse(raw);
        setNombre(data.nombre ?? '');
        setApellido(data.apellido ?? '');
        setNacionalidad(data.nacionalidad ?? '');
        setFoto(data.foto);
      }
    });
  }, []);

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
    setFoto(uri);
    const current = await AsyncStorage.getItem('userData');
    const existing: UserData = current ? JSON.parse(current) : {};
    await AsyncStorage.setItem('userData', JSON.stringify({ ...existing, foto: uri }));
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
      const rawUser = await AsyncStorage.getItem('userData');
      const rawTrips = await AsyncStorage.getItem('trips');
      const backup = JSON.stringify({
        userData: rawUser ? JSON.parse(rawUser) : null,
        trips: rawTrips ? JSON.parse(rawTrips) : [],
        savedAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem(BACKUP_KEY, backup);
      setBackupMsg('Backup guardado correctamente ✓');
      setTimeout(() => setBackupMsg(''), 3500);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el backup.');
    }
  };

  const loadBackup = async () => {
    try {
      const raw = await AsyncStorage.getItem(BACKUP_KEY);
      if (!raw) {
        Alert.alert('Sin backup', 'No se encontró ningún backup guardado en este dispositivo.');
        return;
      }
      const { userData, trips } = JSON.parse(raw);
      if (userData) await AsyncStorage.setItem('userData', JSON.stringify(userData));
      if (trips) await AsyncStorage.setItem('trips', JSON.stringify(trips));
      setBackupMsg('Backup restaurado correctamente ✓');
      setTimeout(() => setBackupMsg(''), 3500);
      // Refresh local state from restored data
      if (userData) {
        setNombre(userData.nombre ?? '');
        setApellido(userData.apellido ?? '');
        setNacionalidad(userData.nacionalidad ?? '');
        setFoto(userData.foto);
      }
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
            await AsyncStorage.multiRemove(['userData', 'trips']);
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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

        <Text style={styles.version}>MyWorldXP · v1.0</Text>
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
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
});