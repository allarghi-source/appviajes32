import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppLanguage } from '../hooks/use-app-language';
import { resolveDeviceLanguage } from '../i18n';
import type { AppLanguage } from '../i18n/languageStorage';

const BG = '#01050d';
const GOLD = '#d4af37';
const GOLD_DIM = 'rgba(212,175,55,0.12)';
const GOLD_BORDER = 'rgba(212,175,55,0.28)';
const SECTION_BG = '#07101e';
const TEXT = '#e8e0d0';
const MUTED = '#4a5a6a';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_SIZE = Math.min(380, Math.round(SCREEN_WIDTH * 0.96));

export default function SelectLanguage() {
  const router = useRouter();
  const { setLanguage } = useAppLanguage();
  // Preselección por idioma del dispositivo -- sólo para el estado visual de
  // esta pantalla. No persiste nada por sí sola: hasta que no se toque
  // "Continuar / Continue" no se llama setLanguage(), y el usuario puede
  // cambiar esta selección libremente antes de confirmar.
  const [selected, setSelected] = useState<AppLanguage>(resolveDeviceLanguage());

  async function handleContinue() {
    await setLanguage(selected);
    router.replace('/onboarding');
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.welcome}>Bienvenido / Welcome</Text>

        <Text style={styles.brandTitle}>
          <Text style={styles.brandMy}>My</Text>
          <Text style={styles.brandWorld}>World</Text>
          <Text style={styles.brandXp}>XP</Text>
        </Text>

        <Image
          source={require('../assets/images/myworld-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.options}>
          <TouchableOpacity
            style={[styles.option, selected === 'es' && styles.optionActive]}
            activeOpacity={0.85}
            onPress={() => setSelected('es')}
          >
            <Text style={[styles.optionText, selected === 'es' && styles.optionTextActive]}>
              Español
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, selected === 'en' && styles.optionActive]}
            activeOpacity={0.85}
            onPress={() => setSelected('en')}
          >
            <Text style={[styles.optionText, selected === 'en' && styles.optionTextActive]}>
              English
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continuar / Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 36,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 16,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    color: GOLD,
    textAlign: 'center',
    marginBottom: 10,
  },
  brandTitle: {
    marginBottom: 28,
  },
  brandMy: {
    fontSize: 20,
    fontFamily: 'Georgia',
    color: TEXT,
  },
  brandWorld: {
    fontSize: 40,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: TEXT,
    letterSpacing: 0.5,
  },
  brandXp: {
    fontSize: 40,
    fontFamily: 'Georgia',
    fontWeight: 'bold',
    color: GOLD,
    letterSpacing: 0.5,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  footer: {
    alignItems: 'center',
  },
  options: {
    width: '100%',
    gap: 14,
    marginBottom: 24,
  },
  option: {
    width: '100%',
    backgroundColor: SECTION_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: GOLD_DIM,
    borderColor: GOLD,
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Georgia',
    letterSpacing: 0.5,
    color: MUTED,
  },
  optionTextActive: {
    color: TEXT,
  },
  button: {
    width: '100%',
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    letterSpacing: 1,
    color: '#1a1a1a',
    fontFamily: 'Georgia',
  },
});
