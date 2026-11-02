import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BG = '#01050d';
const GOLD = '#d4af37';
const TEXT = '#e8e0d0';

// Paso 15: logo original, lema oficial (mismo texto que la bienvenida,
// onboarding:subtitle) y mensaje final.
export default function TutorialFinal({
  buttonLabel,
  onDone,
  backLabel,
  onBack,
}: {
  buttonLabel: string;
  onDone: () => void;
  backLabel: string;
  onBack: () => void;
}) {
  const { t } = useTranslation(['tutorial', 'onboarding']);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const logoSize = Math.min(260, Math.round(width * 0.62));

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
        <Text style={styles.brandTitle}>
          <Text style={styles.brandMy}>{t('onboarding:brand.my')}</Text>
          <Text style={styles.brandWorld}>{t('onboarding:brand.world')}</Text>
          <Text style={styles.brandXp}>{t('onboarding:brand.xp')}</Text>
        </Text>
        <Image
          source={require('../../assets/images/myworld-logo.png')}
          style={{ width: logoSize, height: logoSize }}
          resizeMode="contain"
        />
        <Text style={styles.motto}>{t('onboarding:subtitle')}</Text>
        <Text style={styles.title}>{t('tutorial:final.title')}</Text>
        <Text style={styles.body}>{t('tutorial:final.body')}</Text>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backText} numberOfLines={1}>{backLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onDone} activeOpacity={0.85}>
          <Text style={styles.buttonText} numberOfLines={1}>{buttonLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  brandTitle: {
    marginBottom: 8,
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
  motto: {
    fontSize: 12,
    letterSpacing: 2,
    color: GOLD,
    fontFamily: 'Georgia',
    textAlign: 'center',
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 26,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginTop: 16,
  },
  // Secundario, igual que en el recuadro del recorrido.
  backBtn: {
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.55)',
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: GOLD,
  },
  button: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'Georgia',
  },
});
