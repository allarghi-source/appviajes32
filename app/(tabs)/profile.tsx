import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { copiarFotoPersistente, PERFIL_DIR } from '../../utils/fotoPersistente';
export default function Profile() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
 const [nombre, setNombre] = useState('');
const [apellido, setApellido] = useState('');
const [nacionalidad, setNacionalidad] = useState('');
const scrollRef = useRef(null);
const [ciudad, setCiudad] = useState('');
const [pais, setPais] = useState('');
const [ciudadError, setCiudadError] = useState('');
const [paisError, setPaisError] = useState('');

const nombreRef      = useRef<TextInput>(null);
const apellidoRef    = useRef<TextInput>(null);
const nacionalidadRef = useRef<TextInput>(null);
const ciudadRef      = useRef<TextInput>(null);
const paisRef        = useRef<TextInput>(null);

useEffect(() => {
  AsyncStorage.getItem('userData').then((raw) => {
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.nombre)       setNombre(data.nombre);
      if (data.apellido)     setApellido(data.apellido);
      if (data.nacionalidad) setNacionalidad(data.nacionalidad);
      if (data.ciudad)       setCiudad(data.ciudad);
      if (data.pais)         setPais(data.pais);
      if (data.foto)         setImage(data.foto);
    } catch {}
  });
}, []);

const soloLetras = (t: string) => t.replace(/[^a-zA-ZÀ-ɏ ]/g, '');

async function validarUbicacion(c: string, p: string, campo: 'ciudad' | 'pais') {
  if (!c.trim() || !p.trim()) return;
  try {
    const q = encodeURIComponent(`${c.trim()}, ${p.trim()}`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { 'User-Agent': 'MyWorldXP/1.0', 'Accept-Language': 'es' } }
    );
    const data = await res.json();
    if (data.length > 0) {
      setCiudadError('');
      setPaisError('');
    } else {
      if (campo === 'ciudad') setCiudadError('Ciudad no encontrada');
      else setPaisError('País no encontrado');
    }
  } catch {
    // Error de red — no bloquear al usuario
  }
}
async function guardarFotoPerfil(uri: string) {
  try {
    const persistida = await copiarFotoPersistente(uri, PERFIL_DIR);
    setImage(persistida);
  } catch {
    Alert.alert('Error', 'No se pudo guardar la foto. Intentá de nuevo.');
  }
}

 const pickImage = async () => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (!result.canceled) {
    const uri = result.assets?.[0]?.uri;
    if (uri) await guardarFotoPerfil(uri);
  }
};

const takePhoto = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return;
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (!result.canceled) {
    const uri = result.assets?.[0]?.uri;
    if (uri) await guardarFotoPerfil(uri);
  }
};

const selectPhoto = () => {
  Alert.alert('Seleccionar imagen', 'Elegí una opción', [
    { text: 'Tomar foto', onPress: takePhoto },
    { text: 'Elegir de galería', onPress: pickImage },
    { text: 'Cancelar', style: 'cancel' },
  ]);
};
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

</View>
<View style={styles.form}>

  <View style={styles.input}>
    <Feather name="user" size={18} color="#d4af37" />
    <View style={styles.divider} />
    <TextInput
      ref={nombreRef}
      placeholder="Nombre"
      placeholderTextColor="rgba(255,255,255,0.5)"
      style={styles.inputText}
      value={nombre}
      onChangeText={(t) => setNombre(soloLetras(t))}
      returnKeyType="next"
      submitBehavior="submit"
      onSubmitEditing={() => apellidoRef.current?.focus()}
    />
  </View>

  <View style={styles.input}>
    <Feather name="user" size={18} color="#d4af37" />
    <View style={styles.divider} />
    <TextInput
      ref={apellidoRef}
      placeholder="Apellido"
      placeholderTextColor="rgba(255,255,255,0.5)"
      style={styles.inputText}
      value={apellido}
      onChangeText={setApellido}
      returnKeyType="next"
      submitBehavior="submit"
      onSubmitEditing={() => nacionalidadRef.current?.focus()}
    />
  </View>

  <View style={styles.input}>
    <Feather name="globe" size={18} color="#d4af37" />
    <View style={styles.divider} />
    <TextInput
      ref={nacionalidadRef}
      placeholder="Nacionalidad"
      placeholderTextColor="rgba(255,255,255,0.5)"
      style={styles.inputText}
      value={nacionalidad}
      onChangeText={(t) => setNacionalidad(soloLetras(t))}
      returnKeyType="next"
      submitBehavior="submit"
      onSubmitEditing={() => ciudadRef.current?.focus()}
    />
  </View>

  <View>
    <View style={styles.input}>
      <Feather name="map-pin" size={18} color="#d4af37" />
      <View style={styles.divider} />
      <TextInput
        ref={ciudadRef}
        placeholder="Ciudad donde resides"
        placeholderTextColor="rgba(255,255,255,0.5)"
        style={styles.inputText}
        value={ciudad}
        onChangeText={(t) => { setCiudad(t); if (ciudadError) setCiudadError(''); }}
        onBlur={() => {
          if (!ciudad.trim() && pais.trim()) { setCiudadError('Ciudad no encontrada'); return; }
          if (ciudad.trim()) validarUbicacion(ciudad, pais, 'ciudad');
        }}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => paisRef.current?.focus()}
      />
    </View>
    {ciudadError ? <Text style={styles.errorText}>{ciudadError}</Text> : null}
  </View>

  <View>
    <View style={styles.input}>
      <Feather name="map" size={18} color="#d4af37" />
      <View style={styles.divider} />
      <TextInput
        ref={paisRef}
        placeholder="País donde resides"
        placeholderTextColor="rgba(255,255,255,0.5)"
        style={styles.inputText}
        value={pais}
        onChangeText={(t) => { setPais(soloLetras(t)); if (paisError) setPaisError(''); }}
        onBlur={() => {
          if (!pais.trim() && ciudad.trim()) { setPaisError('País no encontrado'); return; }
          if (pais.trim()) validarUbicacion(ciudad, pais, 'pais');
        }}
        returnKeyType="done"
      />
    </View>
    {paisError ? <Text style={styles.errorText}>{paisError}</Text> : null}
  </View>


<View style={styles.footer}>
  <TouchableOpacity
  style={styles.button}
  onPress={async () => {
    const faltantes: string[] = [];
    if (!image) faltantes.push('Foto de perfil');
    if (!nombre.trim()) faltantes.push('Nombre');
    if (!apellido.trim()) faltantes.push('Apellido');
    if (!nacionalidad.trim()) faltantes.push('Nacionalidad');
    if (!ciudad.trim()) faltantes.push('Ciudad de residencia');
    if (!pais.trim()) faltantes.push('País de residencia');

    if (faltantes.length > 0) {
      Alert.alert(
        'Faltan datos',
        `Para continuar debés completar:\n\n${faltantes.map((f) => `• ${f}`).join('\n')}`
      );
      return;
    }

    if (ciudad.trim() && !pais.trim()) { setPaisError('País no encontrado'); return; }
    if (!ciudad.trim() && pais.trim()) { setCiudadError('Ciudad no encontrada'); return; }
    if (ciudadError || paisError) return;
    const userData = {
      nombre,
      apellido,
      nacionalidad,
      ciudad,
      pais,
      foto: image,
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
});