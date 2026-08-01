import PassportOpen from './passportinside';
import { useRouter } from 'expo-router';
import { playSound, preloadSounds } from '../utils/soundEngine';
import { Image } from 'expo-image';
import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  Path,
  Text as SvgText,
  TextPath,
} from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PASSPORT_W = Math.min(SCREEN_WIDTH * 0.9, 480);
const PASSPORT_H = Math.min(SCREEN_HEIGHT * 0.75, 780);
const LOGO_SIZE = Math.min(260, Math.round(SCREEN_WIDTH * 0.6));

const CornerOrnamentTopLeft = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20">
    <Path d="M2,2 L8,2 L2,8 Z" fill="none" stroke="#d4af37" strokeWidth={1} />
    <Path d="M2,2 L2,8" stroke="#d4af37" strokeWidth={0.8} />
    <Path d="M2,2 L8,2" stroke="#d4af37" strokeWidth={0.8} />
    <Circle cx={2} cy={2} r={1} fill="#d4af37" />
  </Svg>
);

const CornerOrnamentTopRight = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" style={{ transform: [{ scaleX: -1 }] }}>
    <Path d="M2,2 L8,2 L2,8 Z" fill="none" stroke="#d4af37" strokeWidth={1} />
    <Path d="M2,2 L2,8" stroke="#d4af37" strokeWidth={0.8} />
    <Path d="M2,2 L8,2" stroke="#d4af37" strokeWidth={0.8} />
    <Circle cx={2} cy={2} r={1} fill="#d4af37" />
  </Svg>
);

const CornerOrnamentBottomLeft = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" style={{ opacity: 0.5 }}>
    <Path d="M2,14 L2,8 L8,14 Z" fill="none" stroke="#d4af37" strokeWidth={0.8} />
    <Circle cx={2} cy={14} r={0.8} fill="#d4af37" />
  </Svg>
);

const CornerOrnamentBottomRight = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" style={{ opacity: 0.5, transform: [{ scaleX: -1 }] }}>
    <Path d="M2,14 L2,8 L8,14 Z" fill="none" stroke="#d4af37" strokeWidth={0.8} />
    <Circle cx={2} cy={14} r={0.8} fill="#d4af37" />
  </Svg>
);

// ─── SELLO "CONFIG" (marca oficial estampada, sin imágenes) ───────────────────

const STAMP_GOLD = '#d4af37';
const STAMP_SIZE = 117;
const STAMP_CX = 40;
const STAMP_CY = 40;

// Genera el borde dentado fino (alterna entre radio exterior e interior)
function buildDentedRingPath(cx: number, cy: number, rOuter: number, rInner: number, teeth: number): string {
  const step = Math.PI / teeth;
  const points: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const angle = i * step - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `${points.join(' ')} Z`;
}

const CONFIG_STAMP_DENTED_PATH = buildDentedRingPath(STAMP_CX, STAMP_CY, 39, 36.5, 36);
const CONFIG_STAMP_TOP_ARC = `M ${STAMP_CX - 24},${STAMP_CY} A 24,24 0 0 1 ${STAMP_CX + 24},${STAMP_CY}`;
const CONFIG_STAMP_BOTTOM_ARC = `M ${STAMP_CX + 24},${STAMP_CY} A 24,24 0 0 1 ${STAMP_CX - 24},${STAMP_CY}`;

const ConfigStamp = () => (
  <Svg
    width={STAMP_SIZE}
    height={STAMP_SIZE}
    viewBox="0 0 80 80"
    style={{ transform: [{ rotate: '-12deg' }] }}
  >
    <Defs>
      <Path id="configTopArc" d={CONFIG_STAMP_TOP_ARC} />
      <Path id="configBottomArc" d={CONFIG_STAMP_BOTTOM_ARC} />
    </Defs>

    {/* Fondo opaco (mismo tono del cuero del pasaporte): evita que cualquier
        elemento detrás del sello (p. ej. los adornos de esquina de la tapa)
        se asome entre sus trazos. Nada debe verse fuera de los círculos del sello. */}
    <Circle cx={STAMP_CX} cy={STAMP_CY} r={39} fill="#0a1628" />

    {/* Borde dentado fino */}
    <Path d={CONFIG_STAMP_DENTED_PATH} fill="none" stroke={STAMP_GOLD} strokeWidth={0.6} opacity={0.85} />

    {/* Doble aro — exterior con más cuerpo, interior fino */}
    <Circle cx={STAMP_CX} cy={STAMP_CY} r={34} fill="none" stroke={STAMP_GOLD} strokeWidth={2.6} opacity={0.85} />
    <Circle cx={STAMP_CX} cy={STAMP_CY} r={30} fill="none" stroke={STAMP_GOLD} strokeWidth={0.8} opacity={0.55} />

    {/* MYWORLDXP — arco superior e inferior */}
    <SvgText fill={STAMP_GOLD} fontFamily="Georgia" fontSize={5.4} fontWeight="700" letterSpacing={1.1} opacity={0.8}>
      <TextPath href="#configTopArc" startOffset="50%" textAnchor="middle">MYWORLDXP</TextPath>
    </SvgText>
    <SvgText fill={STAMP_GOLD} fontFamily="Georgia" fontSize={5.4} fontWeight="700" letterSpacing={1.1} opacity={0.8}>
      <TextPath href="#configBottomArc" startOffset="50%" textAnchor="middle">MYWORLDXP</TextPath>
    </SvgText>

    {/* Anillo separador entre los textos circulares y el CONFIG central */}
    <Circle cx={STAMP_CX} cy={STAMP_CY} r={22.5} fill="none" stroke={STAMP_GOLD} strokeWidth={0.6} opacity={0.5} />

    {/* Líneas finas + CONFIG centrado */}
    <Line x1={22} y1={35} x2={58} y2={35} stroke={STAMP_GOLD} strokeWidth={0.5} opacity={0.6} />
    <SvgText
      x={STAMP_CX}
      y={42}
      fill={STAMP_GOLD}
      stroke={STAMP_GOLD}
      strokeWidth={0.28}
      fontFamily="Georgia"
      fontSize={7.7}
      fontWeight="700"
      letterSpacing={1}
      textAnchor="middle"
      opacity={0.95}
    >
      CONFIG
    </SvgText>
    <Line x1={22} y1={47} x2={58} y2={47} stroke={STAMP_GOLD} strokeWidth={0.5} opacity={0.6} />
  </Svg>
);

const TopLine = () => (
  <View style={styles.topLineContainer}>
    <View style={styles.topLineGradientLeft} />
    <View style={styles.topLineCenter} />
    <View style={styles.topLineGradientRight} />
  </View>
);

const DividerLine = () => (
  <View style={styles.dividerContainer}>
    <View style={styles.dividerGradientLeft} />
    <View style={styles.dividerCenter} />
    <View style={styles.dividerGradientRight} />
  </View>
);

export default function PassportCover() {
  const router = useRouter();
  const coverAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { preloadSounds(); }, []);

  const coverTranslateX = coverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(SCREEN_WIDTH + 20)],
  });

  const openPassport = () => {
    Animated.timing(coverAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closePassport = () => {
    Animated.timing(coverAnim, {
      toValue: 0,
      duration: 500,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.screenContainer}>
      {/* Inside content — siempre renderizado como fondo */}
      <PassportOpen onClose={closePassport} />

      {/* Cover — overlay absoluto animado encima */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.coverContainer,
          {
            transform: [{ translateX: coverTranslateX }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={styles.settingsBtn}
          activeOpacity={0.7}
        >
          <ConfigStamp />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.passport}
          activeOpacity={0.9}
          onPress={() => { playSound('abrir_hoja'); openPassport(); }}
        >
          <View style={styles.leatherTexture} pointerEvents="none" />
          <View style={styles.spine} />
          <View style={styles.passportInner}>
            <View style={styles.blockTop}>
              <View style={styles.ornamentTop}>
                <View style={{ opacity: 0.7 }}>
                  <CornerOrnamentTopLeft />
                </View>
                <TopLine />
                <View style={{ opacity: 0.7 }}>
                  <CornerOrnamentTopRight />
                </View>
              </View>
              <View style={styles.brandLine}>
                <Text style={styles.brandMy}>MY </Text>
                <Text style={styles.brandWorld}>WORLD</Text>
                <Text style={styles.brandXp}>XP</Text>
              </View>
            </View>
            <View style={styles.blockLogo}>
              <Image
                source={require('../assets/images/myworld-logo.png')}
                style={styles.logoImg}
                contentFit="contain"
                transition={0}
              />
            </View>
            <View style={styles.blockBottom}>
              <DividerLine />
              <Text style={styles.passportTitle}>PASSPORT</Text>
              <Text style={styles.passportSubtitle}>
                PASSEPORT · PASAPORTE · REISEPASS · PASSAPORTO
              </Text>
              <View style={styles.ornamentBottom}>
                <CornerOrnamentBottomLeft />
                <CornerOrnamentBottomRight />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#01050d',
  },

  coverContainer: {
    backgroundColor: '#01050d',
    justifyContent: 'center',
    alignItems: 'center',
  },

  settingsBtn: {
    position: 'absolute',
    top: 54,
    right: 22,
    zIndex: 10,
    padding: 4,
  },

  passport: {
    width: PASSPORT_W,
    height: PASSPORT_H,
    backgroundColor: '#0a1628',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 20 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.15)',
  },

  leatherTexture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    opacity: 0.03,
    backgroundColor: 'rgba(255,255,255,0.008)',
  },

  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 18,
    zIndex: 2,
    backgroundColor: '#0a1628',
    borderRightWidth: 1,
    borderRightColor: 'rgba(212,175,55,0.2)',
  },

  passportInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingLeft: 32,
    paddingRight: 28,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 3,
  },

  blockTop: {
    paddingTop: 22,
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },

  ornamentTop: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  topLineContainer: {
    flex: 1,
    height: 1,
    flexDirection: 'row',
    marginHorizontal: 8,
  },
  topLineGradientLeft: {
    flex: 1,
    height: 1,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.1)',
  },
  topLineCenter: {
    flex: 2,
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.6)',
  },
  topLineGradientRight: {
    flex: 1,
    height: 1,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.1)',
  },

  brandLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 34,
  },
  brandMy: {
    fontSize: 14,
    color: '#fcfcfc',
    fontStyle: 'italic',
    letterSpacing: 4,
    fontFamily: 'Georgia',
  },
  brandWorld: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8f6f2',
    letterSpacing: 5,
    fontFamily: 'Georgia',
    textShadowColor: 'rgba(212,175,55,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  brandXp: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    letterSpacing: 5,
    fontFamily: 'Georgia',
  },

  blockLogo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoImg: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    shadowColor: 'rgba(212,175,55,0.55)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
  },

  blockBottom: {
    width: '100%',
    paddingBottom: 18,
    flexDirection: 'column',
    alignItems: 'center',
  },

  dividerContainer: {
    width: '80%',
    height: 1,
    flexDirection: 'row',
    marginBottom: 10,
  },
  dividerGradientLeft: {
    flex: 1,
    height: 1,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.1)',
  },
  dividerCenter: {
    flex: 2,
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.4)',
  },
  dividerGradientRight: {
    flex: 1,
    height: 1,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.1)',
  },

  passportTitle: {
    fontSize: 28,
    letterSpacing: 10,
    color: '#d4af37',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    fontFamily: 'Georgia',
    marginBottom: 6,
    textShadowColor: 'rgba(212,175,55,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  passportSubtitle: {
    fontSize: 7.5,
    color: 'rgba(212,175,55,0.55)',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Georgia',
  },

  ornamentBottom: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
