import React, { useEffect, useRef } from 'react';
import { Animated, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const GOLD = '#d4af37';

interface Props {
  prevRango: string;
  newRango: string;
  xpRestantes: number | null;
  userName: string;
  onDone: () => void;
}

export function LevelUpPopup({ prevRango, newRango, xpRestantes, userName, onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    opacity.setValue(0);
    scale.setValue(0.88);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 110, useNativeDriver: true }),
    ]).start();
  }, []);

  function close() {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.88, duration: 220, useNativeDriver: true }),
    ]).start(() => onDone());
  }

  async function handleShare() {
    try {
      const name = userName.trim() || 'Un viajero';
      await Share.share({ message: `${name} subió de nivel en MyWorldXP: ahora es ${newRango}` });
    } catch (e) {
      console.warn('Error al compartir:', e);
    }
  }

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />

      <View style={styles.cardWrapper}>
        <TouchableOpacity style={styles.closeBtn} onPress={close}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <View style={styles.topRow}>
            <Text style={styles.unlockedLabel}>SUBISTE DE NIVEL</Text>
          </View>

          <Text style={styles.star}>⬆</Text>

          <Text style={styles.categoria}>PROGRESO</Text>

          <Text style={styles.nombre}>Subiste de nivel</Text>

          <Text style={styles.desc}>
            Pasaste de {prevRango} a {newRango}
          </Text>

          {xpRestantes !== null && (
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>{xpRestantes} XP para el próximo nivel</Text>
            </View>
          )}

          <View style={styles.brandRow}>
            <Text style={styles.brandText}>MyWorld</Text>
            <Text style={[styles.brandText, { color: GOLD }]}>XP</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity, width: '100%', alignItems: 'center' }}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Compartir nivel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(1,5,13,0.78)',
  },
  cardWrapper: {
    width: '82%',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: -14,
    right: -14,
    zIndex: 1002,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0d1a2e',
    borderWidth: 1,
    borderColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: GOLD,
    fontWeight: '700',
  },
  card: {
    width: '100%',
    margin: 20,
    backgroundColor: '#0d1a2e',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingVertical: 32,
    paddingHorizontal: 26,
    alignItems: 'center',
    gap: 6,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 14,
    zIndex: 1001,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  unlockedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2,
  },
  star: {
    fontSize: 44,
    color: GOLD,
    marginVertical: 6,
  },
  categoria: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4a5a6a',
    letterSpacing: 2.5,
    marginBottom: 2,
  },
  nombre: {
    fontFamily: 'Georgia',
    fontSize: 21,
    fontWeight: '700',
    color: '#e8e0d0',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  desc: {
    fontSize: 13,
    color: '#5a6a7a',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  xpBadge: {
    backgroundColor: 'rgba(212,175,55,0.13)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.38)',
    marginTop: 10,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 0.5,
  },
  brandRow: {
    flexDirection: 'row',
    marginTop: 18,
    alignItems: 'baseline',
  },
  brandText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8f6f2',
    letterSpacing: 5,
    fontFamily: 'Georgia',
    textShadowColor: 'rgba(212,175,55,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  shareBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(212,175,55,0.10)',
    borderRadius: 20,
    paddingVertical: 11,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.38)',
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1,
  },
});
