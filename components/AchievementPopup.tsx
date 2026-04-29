import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { Achievement } from '../utils/achievementsEngine';

const GOLD = '#d4af37';

interface Props {
  achievements: Achievement[];
  onDone: () => void;
}

export function AchievementPopup({ achievements, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.88)).current;
  const cardRef = useRef<any>(null);

  useEffect(() => {
    opacity.setValue(0);
    scale.setValue(0.88);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 110, useNativeDriver: true }),
    ]).start();
    // No timer — popup stays until user closes with ✕
  }, [index]);

  function advance() {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(scale,  { toValue: 0.88, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      if (index < achievements.length - 1) {
        setIndex((i) => i + 1);
      } else {
        onDone();
      }
    });
  }

  async function handleShare() {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Compartir logro',
        });
      }
    } catch (e) {
      console.warn('Error al compartir:', e);
    }
  }

  if (!achievements.length) return null;
  const a = achievements[index];

  return (
    <View style={styles.root}>
      {/* Backdrop — tap to advance through multiple achievements */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={achievements.length > 1 ? advance : undefined}
      />

      <View style={styles.cardWrapper}>
        {/* Close button — always closes the popup */}
        <TouchableOpacity style={styles.closeBtn} onPress={onDone}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        {/* Card — only this region is captured for sharing */}
        <Animated.View
          ref={cardRef}
          style={[styles.card, { opacity, transform: [{ scale }] }]}
        >
          {/* Top label row */}
          <View style={styles.topRow}>
            <Text style={styles.unlockedLabel}>LOGRO DESBLOQUEADO</Text>
            {achievements.length > 1 && (
              <Text style={styles.counter}>{index + 1} / {achievements.length}</Text>
            )}
          </View>

          {/* Star icon */}
          <Text style={styles.star}>★</Text>

          {/* Categoria */}
          <Text style={styles.categoria}>{a.categoria.toUpperCase()}</Text>

          {/* Name */}
          <Text style={styles.nombre}>{a.nombre}</Text>

          {/* Description */}
          <Text style={styles.desc}>{a.descripcion}</Text>

          {/* XP badge */}
          <View style={styles.xpBadge}>
            <Text style={styles.xpText}>+{a.xp} XP</Text>
          </View>

          {/* Branding */}
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>MyWorld</Text>
            <Text style={[styles.brandText, { color: GOLD }]}>XP</Text>
          </View>
        </Animated.View>

        {/* Share button — outside the captured card */}
        <Animated.View style={{ opacity, width: '100%', alignItems: 'center' }}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Compartir logro</Text>
          </TouchableOpacity>

          {achievements.length > 1 && (
            <Text style={styles.hint}>Toca para continuar</Text>
          )}
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
    zIndex: 999,
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
    zIndex: 1000,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  unlockedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2,
  },
  counter: {
    fontSize: 10,
    color: '#4a5a6a',
    letterSpacing: 1,
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
    fontSize: 17,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1,
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
  hint: {
    marginTop: 10,
    fontSize: 11,
    color: '#2a3a4a',
    letterSpacing: 0.5,
  },
});
