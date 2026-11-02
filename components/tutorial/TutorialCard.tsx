import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const GOLD = '#d4af37';

// Recuadro del tutorial: progreso, texto explicativo (opcional) y controles.
// La posición y la opacidad las maneja TutorialPlayer.
export default function TutorialCard({
  step,
  total,
  text,
  maxTextHeight,
  nextLabel,
  backLabel,
  skipLabel,
  onNext,
  onBack,
  backDisabled,
  onSkip,
}: {
  step: number;
  total: number;
  text: string | null;
  maxTextHeight: number;
  nextLabel: string;
  backLabel: string;
  skipLabel: string;
  onNext: () => void;
  onBack: () => void;
  backDisabled: boolean;
  onSkip: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.progress} accessibilityLabel={`${step}/${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              i + 1 < step && styles.segmentDone,
              i + 1 === step && styles.segmentActive,
            ]}
          />
        ))}
      </View>

      {text !== null && (
        <ScrollView
          style={{ maxHeight: maxTextHeight }}
          contentContainerStyle={styles.textWrap}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={styles.text}>{text}</Text>
        </ScrollView>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={onSkip}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
        >
          <Text style={styles.skip} numberOfLines={1}>{skipLabel}</Text>
        </TouchableOpacity>
        <View style={styles.rightControls}>
          <TouchableOpacity
            style={[styles.backBtn, backDisabled && styles.backBtnDisabled]}
            onPress={onBack}
            disabled={backDisabled}
            activeOpacity={0.7}
            accessibilityState={{ disabled: backDisabled }}
          >
            <Text style={styles.backText} numberOfLines={1}>{backLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={onNext} activeOpacity={0.85}>
            <Text style={styles.nextText} numberOfLines={1}>{nextLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(8,20,44,0.93)',
    borderColor: 'rgba(212,175,55,0.75)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
  progress: {
    flexDirection: 'row',
    gap: 3,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  segmentDone: {
    backgroundColor: 'rgba(212,175,55,0.5)',
  },
  segmentActive: {
    backgroundColor: GOLD,
  },
  textWrap: {
    paddingTop: 12,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: '#ffffff',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 8,
  },
  skipBtn: {
    flexShrink: 1,
  },
  skip: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.1,
    color: 'rgba(255,255,255,0.65)',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Secundario: contorno dorado tenue, sin relleno, para no competir con SIGUIENTE.
  backBtn: {
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.55)',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  backBtnDisabled: {
    opacity: 0.3,
  },
  backText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: GOLD,
  },
  nextBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  nextText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#1a1a1a',
  },
});
