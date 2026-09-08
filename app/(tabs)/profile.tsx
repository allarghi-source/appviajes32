import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { GeoOpcion, geocodeNominatim } from '../../utils/geocoding';
import { copiarFotoPersistente, PERFIL_DIR } from '../../utils/fotoPersistente';
import { buscarPaises, getPaisPorIso2, Pais } from '../../utils/paises';

type UbicacionConfirmada = {
  ciudad: string;
  pais: string;
  countryCode: string;
  lat: number;
  lng: number;
};

type GeoStatus = 'idle' | 'validando' | 'encontrada' | 'no_encontrada' | 'error' | 'multiples';

// Resultado explícito de un intento de validación: evita decidir el alerta final
// leyendo geoStatus desde un closure que puede haber quedado obsoleto tras el await.
type ValidacionResultado =
  | { tipo: 'ok'; ubicacion: UbicacionConfirmada }
  | { tipo: 'multiples' }
  | { tipo: 'no_encontrada' }
  | { tipo: 'error' }
  | { tipo: 'indefinido' }; // en curso / descartado por carrera — no hay nada que mostrar todavía

export default function Profile() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');
  const [ciudad, setCiudad] = useState('');

  const [fotoError, setFotoError] = useState(false);
  const [nombreError, setNombreError] = useState(false);
  const [apellidoError, setApellidoError] = useState(false);
  const [nacionalidadError, setNacionalidadError] = useState(false);

  // País: se elige de una lista cerrada, nunca se escribe libremente.
  const [paisSeleccionado, setPaisSeleccionado] = useState<Pais | null>(null);
  const [paisTouched, setPaisTouched] = useState(false);
  const [paisModalVisible, setPaisModalVisible] = useState(false);
  const [paisQuery, setPaisQuery] = useState('');

  // Ciudad + país se validan juntos como una única ubicación geográfica.
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [geoOpciones, setGeoOpciones] = useState<GeoOpcion[]>([]);
  const [ubicacionConfirmada, setUbicacionConfirmada] = useState<UbicacionConfirmada | null>(null);

  const nombreRef = useRef<TextInput>(null);
  const apellidoRef = useRef<TextInput>(null);
  const nacionalidadRef = useRef<TextInput>(null);
  const ciudadRef = useRef<TextInput>(null);

  // Refs con el valor "vivo" de ciudad/país para descartar respuestas de red que
  // lleguen después de que el usuario ya cambió el texto o el país elegido.
  const ciudadValueRef = useRef(ciudad);
  const paisSeleccionadoRef = useRef(paisSeleccionado);
  useEffect(() => { ciudadValueRef.current = ciudad; }, [ciudad]);
  useEffect(() => { paisSeleccionadoRef.current = paisSeleccionado; }, [paisSeleccionado]);

  // Traba para no lanzar dos validaciones de ubicación en simultáneo (blur + CONTINUAR).
  const validandoRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('userData').then((raw) => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.nombre) setNombre(data.nombre);
        if (data.apellido) setApellido(data.apellido);
        if (data.nacionalidad) setNacionalidad(data.nacionalidad);
        if (data.foto) setImage(data.foto);

        const residencia = data.residencia;
        const lat = residencia?.lat;
        const lng = residencia?.lng;
        const countryCode = residencia?.countryCode;

        if (
          residencia &&
          typeof countryCode === 'string' &&
          residencia.ciudad &&
          Number.isFinite(lat) &&
          Number.isFinite(lng)
        ) {
          const paisGuardado = getPaisPorIso2(countryCode);
          if (paisGuardado) {
            setPaisSeleccionado(paisGuardado);
            setCiudad(String(residencia.ciudad));
            setUbicacionConfirmada({
              ciudad: String(residencia.ciudad).trim(),
              pais: paisGuardado.nombre,
              countryCode: paisGuardado.iso2,
              lat,
              lng,
            });
            setGeoStatus('encontrada');
            return;
          }
        }

        // Perfil de un formato anterior (ciudad/país en texto libre, sin coordenadas)
        // o incompleto: no se asume válido ni se le asigna una ubicación por defecto.
        // Se conserva el texto de ciudad para no perder lo que el usuario ya escribió,
        // pero el país debe elegirse de la lista y la ubicación revalidarse.
        if (data.ciudad) setCiudad(String(data.ciudad));
      } catch {}
    });
  }, []);

  const soloLetras = (t: string) => t.replace(/[^a-zA-ZÀ-ɏ ]/g, '');

  // Valida ciudad + país como una única ubicación (una sola consulta combinada,
  // restringida por countrycodes al país elegido). Nunca se geocodifica el país solo.
  async function validarCiudadPais(cInput: string, paisSel: Pais): Promise<ValidacionResultado> {
    const cTrim = cInput.trim();
    if (!cTrim) return { tipo: 'indefinido' };
    if (validandoRef.current) return { tipo: 'indefinido' };
    validandoRef.current = true;
    setGeoStatus('validando');
    try {
      const data = await geocodeNominatim(`${cTrim}, ${paisSel.nombre}`, 5, paisSel.iso2);

      // Si el usuario cambió la ciudad o el país mientras esperábamos la respuesta,
      // descartamos el resultado: no puede confirmar una ubicación que ya no está vigente.
      if (ciudadValueRef.current.trim() !== cTrim || paisSeleccionadoRef.current?.iso2 !== paisSel.iso2) {
        return { tipo: 'indefinido' };
      }

      if (data.length === 0) {
        setUbicacionConfirmada(null);
        setGeoStatus('no_encontrada');
        return { tipo: 'no_encontrada' };
      }

      if (data.length === 1) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const confirmada: UbicacionConfirmada = {
            ciudad: cTrim,
            pais: paisSel.nombre,
            countryCode: paisSel.iso2,
            lat,
            lng,
          };
          setUbicacionConfirmada(confirmada);
          setGeoStatus('encontrada');
          setGeoOpciones([]);
          return { tipo: 'ok', ubicacion: confirmada };
        }
        setUbicacionConfirmada(null);
        setGeoStatus('no_encontrada');
        return { tipo: 'no_encontrada' };
      }

      // Varias coincidencias: no confirmar automáticamente, dejar que el usuario elija.
      // Esto no es un error: no debe mostrarse ningún mensaje ni alerta, solo la lista.
      setGeoOpciones(data);
      setGeoStatus('multiples');
      setUbicacionConfirmada(null);
      return { tipo: 'multiples' };
    } catch {
      setUbicacionConfirmada(null);
      setGeoStatus('error');
      return { tipo: 'error' };
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
  }

  function seleccionarPais(p: Pais) {
    setPaisSeleccionado(p);
    setPaisModalVisible(false);
    setPaisQuery('');
    // Cambiar de país invalida cualquier ubicación confirmada anteriormente.
    setUbicacionConfirmada(null);
    setGeoStatus('idle');
    setGeoOpciones([]);
    setTimeout(() => ciudadRef.current?.focus(), 300);
  }

  async function guardarFotoPerfil(uri: string) {
    try {
      const persistida = await copiarFotoPersistente(uri, PERFIL_DIR);
      setImage(persistida);
      setFotoError(false);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la foto. Intentá de nuevo.');
    }
  }

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { if (!image) setFotoError(true); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri;
      if (uri) await guardarFotoPerfil(uri);
    } else if (!image) {
      setFotoError(true);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { if (!image) setFotoError(true); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri;
      if (uri) await guardarFotoPerfil(uri);
    } else if (!image) {
      setFotoError(true);
    }
  };

  const selectPhoto = () => {
    Alert.alert('Seleccionar imagen', 'Elegí una opción', [
      { text: 'Tomar foto', onPress: takePhoto },
      { text: 'Elegir de galería', onPress: pickImage },
      { text: 'Cancelar', style: 'cancel', onPress: () => { if (!image) setFotoError(true); } },
    ]);
  };

  const ciudadErrorMsg =
    geoStatus === 'no_encontrada'
      ? 'Ciudad no encontrada.'
      : geoStatus === 'error'
      ? 'No se pudo validar la ciudad. Verificá tu conexión e intentá nuevamente.'
      : '';
  const ciudadBorderError = geoStatus === 'no_encontrada';
  const paisBorderError = paisTouched && !paisSeleccionado;
  const paisesFiltrados = buscarPaises(paisQuery);

  return (
    <LinearGradient
      colors={['#01050d', '#061426', '#01050d']}
      style={styles.container}
    >
      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          paddingBottom: 120,
        }}
        enableOnAndroid={true}
        extraScrollHeight={100}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        <Text style={styles.title}>
          CREÁ TU PERFIL
        </Text>

        <Text style={styles.subtitle}>
          Contanos quién sos para empezar tu viaje
        </Text>
        <View style={styles.photoContainer}>

          <View style={styles.photoOuter}>
            <TouchableOpacity
              style={styles.photoCircle}
              activeOpacity={0.8}
              onPress={selectPhoto}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarIcon}>
                  <View style={styles.avatarHead} />
                  <View style={styles.avatarBody} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.cameraButton}>
              <Feather name="camera" size={16} color="#ffffff" />
            </View>
          </View>

          <Text style={styles.photoText}>
            Tocá para agregar tu foto
          </Text>
          {fotoError ? (
            <Text style={styles.photoErrorText}>La foto de perfil es obligatoria.</Text>
          ) : null}

        </View>
        <View style={styles.form}>

          <View>
            <View style={[styles.input, nombreError && styles.inputErrorBorder]}>
              <Feather name="user" size={18} color="#d4af37" />
              <View style={styles.divider} />
              <TextInput
                ref={nombreRef}
                placeholder="Nombre"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.inputText}
                value={nombre}
                onChangeText={(t) => {
                  const v = soloLetras(t);
                  setNombre(v);
                  if (v.trim()) setNombreError(false);
                }}
                onBlur={() => setNombreError(!nombre.trim())}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => apellidoRef.current?.focus()}
              />
            </View>
            {nombreError ? <Text style={styles.errorText}>Este campo es obligatorio.</Text> : null}
          </View>

          <View>
            <View style={[styles.input, apellidoError && styles.inputErrorBorder]}>
              <Feather name="user" size={18} color="#d4af37" />
              <View style={styles.divider} />
              <TextInput
                ref={apellidoRef}
                placeholder="Apellido"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.inputText}
                value={apellido}
                onChangeText={(t) => {
                  setApellido(t);
                  if (t.trim()) setApellidoError(false);
                }}
                onBlur={() => setApellidoError(!apellido.trim())}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => nacionalidadRef.current?.focus()}
              />
            </View>
            {apellidoError ? <Text style={styles.errorText}>Este campo es obligatorio.</Text> : null}
          </View>

          <View>
            <View style={[styles.input, nacionalidadError && styles.inputErrorBorder]}>
              <Feather name="globe" size={18} color="#d4af37" />
              <View style={styles.divider} />
              <TextInput
                ref={nacionalidadRef}
                placeholder="Nacionalidad"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.inputText}
                value={nacionalidad}
                onChangeText={(t) => {
                  const v = soloLetras(t);
                  setNacionalidad(v);
                  if (v.trim()) setNacionalidadError(false);
                }}
                onBlur={() => setNacionalidadError(!nacionalidad.trim())}
                returnKeyType="done"
              />
            </View>
            {nacionalidadError ? <Text style={styles.errorText}>Este campo es obligatorio.</Text> : null}
          </View>

          {/* País: se elige de una lista cerrada, nunca se escribe libremente. */}
          <View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setPaisTouched(true); setPaisModalVisible(true); }}
            >
              <View style={[styles.input, paisBorderError && styles.inputErrorBorder]}>
                <Feather name="map" size={18} color="#d4af37" />
                <View style={styles.divider} />
                <Text style={[styles.inputText, !paisSeleccionado && styles.inputTextPlaceholder]}>
                  {paisSeleccionado ? paisSeleccionado.nombre : 'País donde resides'}
                </Text>
              </View>
            </TouchableOpacity>
            {paisBorderError ? <Text style={styles.errorText}>Este campo es obligatorio.</Text> : null}
          </View>

          {/* Ciudad: texto libre, validado junto con el país ya elegido. */}
          <View>
            <View style={[styles.input, ciudadBorderError && styles.inputErrorBorder]}>
              <Feather name="map-pin" size={18} color="#d4af37" />
              <View style={styles.divider} />
              <TextInput
                ref={ciudadRef}
                placeholder="Ciudad donde residís"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={[styles.inputText, !paisSeleccionado && styles.inputTextPlaceholder]}
                value={ciudad}
                editable={!!paisSeleccionado}
                onChangeText={(t) => {
                  setCiudad(t);
                  setUbicacionConfirmada(null);
                  setGeoOpciones([]);
                  setGeoStatus('idle');
                }}
                onBlur={() => {
                  if (!ciudad.trim() || !paisSeleccionado) return;
                  validarCiudadPais(ciudad, paisSeleccionado);
                }}
                returnKeyType="done"
              />
            </View>
            {geoStatus === 'validando' ? (
              <Text style={styles.hintText}>Validando ubicación...</Text>
            ) : null}
            {ciudadErrorMsg ? <Text style={styles.errorText}>{ciudadErrorMsg}</Text> : null}
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

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.button}
              onPress={async () => {
                if (validandoRef.current) return; // ya hay una validación en curso

                const cTrim = ciudad.trim();
                const fotoVacia = !image;
                const nombreVacio = !nombre.trim();
                const apellidoVacio = !apellido.trim();
                const nacionalidadVacia = !nacionalidad.trim();
                const paisVacio = !paisSeleccionado;
                const ciudadVacia = !cTrim;

                setFotoError(fotoVacia);
                setNombreError(nombreVacio);
                setApellidoError(apellidoVacio);
                setNacionalidadError(nacionalidadVacia);
                setPaisTouched(true);

                const faltantes: string[] = [];
                if (fotoVacia) faltantes.push('Foto de perfil');
                if (nombreVacio) faltantes.push('Nombre');
                if (apellidoVacio) faltantes.push('Apellido');
                if (nacionalidadVacia) faltantes.push('Nacionalidad');
                if (paisVacio) faltantes.push('País de residencia');
                if (!paisVacio && ciudadVacia) faltantes.push('Ciudad de residencia');

                if (faltantes.length > 0) {
                  Alert.alert(
                    'Faltan datos',
                    `Para continuar debés completar:\n\n${faltantes.map((f) => `• ${f}`).join('\n')}`
                  );
                  return;
                }

                const paisSel = paisSeleccionado as Pais;

                // Ya hay coincidencias esperando que el usuario elija: no repetir la
                // búsqueda ni mostrar ninguna alerta, solo dejar la lista visible.
                if (geoStatus === 'multiples') return;

                // Ya sabemos que esa ciudad no existe en el país elegido: el mensaje
                // ya está debajo del campo, no corresponde agregar una alerta encima.
                if (geoStatus === 'no_encontrada') return;

                const yaValidada =
                  ubicacionConfirmada &&
                  ubicacionConfirmada.ciudad === cTrim &&
                  ubicacionConfirmada.countryCode === paisSel.iso2 &&
                  Number.isFinite(ubicacionConfirmada.lat) &&
                  Number.isFinite(ubicacionConfirmada.lng);

                const resultado: ValidacionResultado = yaValidada
                  ? { tipo: 'ok', ubicacion: ubicacionConfirmada }
                  : await validarCiudadPais(cTrim, paisSel);

                // Varias coincidencias o cero coincidencias: ya se refleja en la lista
                // o en el mensaje inline, no se agrega ninguna alerta general.
                if (resultado.tipo === 'multiples' || resultado.tipo === 'no_encontrada') return;

                if (resultado.tipo === 'error') {
                  Alert.alert(
                    'Sin conexión',
                    'No se pudo validar la ciudad. Verificá tu conexión e intentá nuevamente.'
                  );
                  return;
                }

                if (resultado.tipo === 'indefinido') {
                  Alert.alert(
                    'Ciudad no confirmada',
                    'Para continuar debés confirmar una ciudad de residencia válida.'
                  );
                  return;
                }

                const confirmada = resultado.ubicacion;

                const userData = {
                  nombre,
                  apellido,
                  nacionalidad,
                  foto: image,
                  residencia: {
                    ciudad: confirmada.ciudad,
                    pais: confirmada.pais,
                    countryCode: confirmada.countryCode,
                    lat: confirmada.lat,
                    lng: confirmada.lng,
                  },
                };
                await AsyncStorage.setItem('userData', JSON.stringify(userData));
                router.push('/passportcover');
              }}
            >
              <Text style={styles.buttonText}>CONTINUAR →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>

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
            <Feather name="search" size={16} color="#d4af37" />
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
                onPress={() => seleccionarPais(item)}
              >
                <Text style={styles.paisModalItemText}>{item.nombre}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.paisModalEmpty}>No se encontraron países.</Text>}
          />
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
  },

  photoContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  photoOuter: {
    padding: 6,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#d4af37',
    position: 'relative',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  photoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#d4af37',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 8,
    right: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d4af37',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  photoIcon: {
    fontSize: 50,
  },
  avatarIcon: {
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },

  avatarHead: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff',
  },

  avatarBody: {
    width: 50,
    height: 25,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    marginTop: 6,
  },
  photoText: {
    marginTop: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  photoErrorText: {
    marginTop: 4,
    color: '#e07070',
    fontSize: 12,
    textAlign: 'center',
  },
  title: {
    marginTop: 50,
    fontSize: 24,
    fontFamily: 'serif',
    fontWeight: '700',
    color: '#ffffff',
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#ffffff',
  },
  form: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 14,
  },
  iconWrapper: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  input: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 55,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.5)',
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    justifyContent: 'flex-start',
    paddingLeft: 20,
    paddingHorizontal: 16,
  },
  inputErrorBorder: {
    borderColor: '#e07070',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(212,175,55,0.4)',
    marginHorizontal: 10,
  },

  inputIcon: {
    color: '#d4af37',
    fontSize: 20,
  },
  inputText: {
    flex: 1,
    color: '#ffffff',
    opacity: 0.7,
    textAlign: 'left',
    fontSize: 14,
  },
  inputTextPlaceholder: {
    opacity: 0.5,
  },
  hintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 16,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 30,
  },
  button: {
    width: '85%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#d4af37',
  },

  buttonText: {
    color: '#070709',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  errorText: {
    color: '#e07070',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 16,
  },
  sugList: {
    backgroundColor: '#0d1a2e',
    borderWidth: 1,
    borderColor: '#d4af37',
    borderRadius: 10,
    maxHeight: 240,
    marginTop: 6,
  },
  sugItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,48,80,0.5)',
  },
  sugText: {
    color: '#e8e0d0',
    fontSize: 14,
  },

  // ── Modal de selección de país ────────────────────────────────────────────
  paisModalContainer: {
    flex: 1,
    backgroundColor: '#01050d',
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
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  paisModalClose: {
    color: '#d4af37',
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
    borderColor: 'rgba(212,175,55,0.5)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    gap: 10,
  },
  paisSearchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  paisModalItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.15)',
  },
  paisModalItemText: {
    color: '#ffffff',
    fontSize: 15,
  },
  paisModalEmpty: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
});
