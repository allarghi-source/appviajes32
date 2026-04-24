import { Image, StyleSheet, Text, View } from 'react-native';

export default function Onboarding() {
 return (
  <View style={styles.container}>

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
    <Text style={styles.featureIcon}>🌍</Text>
    <View>
      <Text style={styles.featureTitle}>Registrá tus viajes</Text>
      <Text style={styles.featureDesc}>Cada ciudad, cada país</Text>
    </View>
  </View>

  <View style={styles.featureRow}>
    <Text style={styles.featureIcon}>⭐</Text>
    <View>
      <Text style={styles.featureTitle}>Ganá XP</Text>
      <Text style={styles.featureDesc}>Subí de nivel viajando</Text>
    </View>
  </View>

  <View style={styles.featureRow}>
    <Text style={styles.featureIcon}>📖</Text>
    <View>
      <Text style={styles.featureTitle}>Tu pasaporte</Text>
      <Text style={styles.featureDesc}>Historial de viajes y stats</Text>
    </View>
  </View>

</View>
  <View style={styles.footer}>
    <Text style={styles.button}>
      CREAR MI PERFIL →
    </Text>
  </View>

</View>
);
}

const styles = StyleSheet.create({
 container: {
  flex: 1,
  backgroundColor: '#01050d',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingTop: 60,
},
  logo: {
    width: 200,
    height: 200,
  },
  title: {
  color: '#ffffff',
  fontSize: 36,
  marginTop: 10,
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
  fontSize: 13,
  color: '#cfcfcf',
  letterSpacing: 2,
  fontWeight: '500',
},
content: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},

footer: {
  width: '100%',
  paddingBottom: 30,
  alignItems: 'center',
  marginTop: 100,
},

button: {
  backgroundColor: '#d4af37',
  color: '#000',
  paddingVertical: 16,
  paddingHorizontal: 40,
  borderRadius: 25,
  fontWeight: 'bold',
},
features: {
  marginTop: 30,
  gap: 18,
},

featureRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},

featureIcon: {
  fontSize: 18,
},

featureTitle: {
  color: '#ffffff',
  fontWeight: '600',
},

featureDesc: {
  color: '#888',
  fontSize: 12,
},
});