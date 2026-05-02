import { useRouter } from 'expo-router';
import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
export default function Onboarding() {
  const router = useRouter();
 return (
  <ImageBackground
    source={require('../assets/images/stars.png')}
    style={styles.container}
    resizeMode="cover"
  >
<Image
  source={require('../assets/images/planet.png')}
  style={styles.planet}
/>
  <View style={styles.content}>
  
      <Image
      source={require('../assets/images/myworld-logo.png')}
      style={styles.logo}
      resizeMode="contain"
    />

    <Text style={styles.title}>
      <Text style={styles.my}>My </Text>
      <Text style={styles.world}>World</Text>
      <Text style={styles.xp}>XP</Text>
    </Text>

    <Text style={styles.subtitle}>
      TU MUNDO · TU HISTORIA · TUS LOGROS
    </Text>
  </View>
<View style={styles.features}>

  <View style={styles.featureRow}>
    <Text style={styles.featureIcon}>◎</Text>
    <View>
      <Text style={styles.featureTitle}>Registrá tus viajes</Text>
      <Text style={styles.featureDesc}>Cada ciudad, cada país</Text>
    </View>
  </View>

  <View style={styles.featureRow}>
    <Text style={styles.featureIcon}>★</Text>
    <View>
      <Text style={styles.featureTitle}>Ganá XP</Text>
      <Text style={styles.featureDesc}>Subí de nivel viajando</Text>
    </View>
  </View>

  <View style={styles.featureRow}>
    <Text style={styles.featureIcon}>▣</Text>
    <View>
      <Text style={styles.featureTitle}>Tu pasaporte</Text>
      <Text style={styles.featureDesc}>Historial de viajes y stats</Text>
    </View>
  </View>

</View>
 <View style={styles.footer}>
  <TouchableOpacity
    style={styles.button}
    activeOpacity={0.85}
    onPress={() => router.push('/profile')}
  >
    <Text style={styles.buttonText}>
      CREAR MI PASAPORTE →
    </Text>
  </TouchableOpacity>
</View>

</ImageBackground>
);
}

const styles = StyleSheet.create({
 container: {
  flex: 1,
  backgroundColor: '#01050d',
  position: 'relative',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  paddingTop: 30,
},

  logo: {
    width: 200,
    height: 200,
  },
  title: {
  color: '#ffffff',
  fontSize: 36,
  marginTop: -30,
  fontFamily: 'serif',
},
my: {
  fontSize: 16,
  color: '#ffffff',
  fontFamily: 'serif',
},

world: {
  fontSize: 36,
  color: '#ffffff',
  fontWeight: 'bold',
  fontFamily: 'serif',
},

xp: {
  fontSize: 36,
  color: '#f0d060',
  fontWeight: 'bold',
  fontFamily: 'serif',
},
subtitle: {
  marginTop: 8,
  maxWidth: 330,
  textAlign: 'center',
  alignSelf: 'center',
  fontSize: 12,
  color: '#9FB3C8',
  letterSpacing: 0.8,
},
content: {
  flex: 0,
  justifyContent: 'flex-start',
  alignItems: 'center',
  marginTop: 70,
  
},

footer: {
  width: '100%',
  paddingBottom: 30,
  
  marginTop: 'auto',
  
},

button: {
  marginHorizontal: 20,
  paddingVertical: 18,
  borderRadius: 16,
  alignItems: 'center',
  backgroundColor: '#d4af37',
},
buttonText: {
  color: '#1a1a1a',
  fontSize: 14,
  fontWeight: '700',
  letterSpacing: 1,
},
features: {
  marginTop: 60,
  gap: 18,
  alignSelf: 'center',
  
},

featureRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},

featureIcon: {
  fontSize: 22,
  color: '#f0d060',
  width: 34,
  textAlign: 'center',
},

featureTitle: {
  color: '#ffffff',
  fontWeight: '600',
},

featureDesc: {
  color: '#888',
  fontSize: 12,
},
planet: {
  position: 'absolute',
  bottom: 80,
  width: '120%',
  height: 300,
  alignSelf: 'center',
  opacity: 0.9,
},
});