import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Path
} from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Corner ornament SVG (top-left)
const CornerOrnamentTopLeft = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20">
    <Path d="M2,2 L8,2 L2,8 Z" fill="none" stroke="#d4af37" strokeWidth={1} />
    <Path d="M2,2 L2,8" stroke="#d4af37" strokeWidth={0.8} />
    <Path d="M2,2 L8,2" stroke="#d4af37" strokeWidth={0.8} />
    <Circle cx={2} cy={2} r={1} fill="#d4af37" />
  </Svg>
);

// Corner ornament SVG (top-right, mirrored)
const CornerOrnamentTopRight = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" style={{ transform: [{ scaleX: -1 }] }}>
    <Path d="M2,2 L8,2 L2,8 Z" fill="none" stroke="#d4af37" strokeWidth={1} />
    <Path d="M2,2 L2,8" stroke="#d4af37" strokeWidth={0.8} />
    <Path d="M2,2 L8,2" stroke="#d4af37" strokeWidth={0.8} />
    <Circle cx={2} cy={2} r={1} fill="#d4af37" />
  </Svg>
);

// Bottom corner ornaments
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

// Horizontal line with gradient effect (simulated with views)
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
  return (
    <View style={styles.screenContainer}>
      {/* Passport card */}
      <TouchableOpacity
  onPress={() => router.push('/settings')}
  style={{
    position: 'absolute',
    top: 60,
    right: 25,
    zIndex: 10,
    padding: 6,
  }}
>
  <Text
    style={{
      color: 'rgba(212,175,55,0.6)',
      fontSize: 16,
      fontFamily: 'Georgia',
    }}
  >
    ⚙
  </Text>
</TouchableOpacity>
      <TouchableOpacity
  style={styles.passport}
  activeOpacity={0.9}
  onPress={() => router.push('/passportinside')}
>
        {/* Leather texture overlay (subtle diagonal lines via multiple thin views) */}
        <View style={styles.leatherTexture} pointerEvents="none" />

        {/* Spine / Lomo */}
        <View style={styles.spine} />

        {/* Inner content */}
        <View style={styles.passportInner}>

          {/* TOP BLOCK */}
          <View style={styles.blockTop}>
            {/* Ornament row */}
            <View style={styles.ornamentTop}>
              <View style={{ opacity: 0.7 }}>
                <CornerOrnamentTopLeft />
              </View>
              <TopLine />
              <View style={{ opacity: 0.7 }}>
                <CornerOrnamentTopRight />
              </View>
            </View>

            {/* Brand line */}
            <View style={styles.brandLine}>
              <Text style={styles.brandMy}>MY </Text>
              <Text style={styles.brandWorld}>WORLD</Text>
              <Text style={styles.brandXp}>XP</Text>
            </View>
          </View>

          {/* CENTER BLOCK - Logo */}
          <View style={styles.blockLogo}>
            <Image
              source={require('../assets/images/myworld-logo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          {/* BOTTOM BLOCK */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Passport card: 320x450
  passport: {
    width: SCREEN_WIDTH * 0.9,
height: SCREEN_HEIGHT * 0.75,
    backgroundColor: '#0a1628',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    // Box shadow approximation
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 20 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
    // Inset border via borderWidth
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.15)',
  },

  // Leather texture overlay (subtle)
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

  // Spine / Lomo: 18px wide, left side
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 18,
    zIndex: 2,
    backgroundColor: '#0a1628',
    // Gradient approximation: dark left to slightly lighter
    borderRightWidth: 1,
    borderRightColor: 'rgba(212,175,55,0.2)',
  },

  // Inner layout: paddingLeft 32, paddingRight 28, flex column centered
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

  // TOP BLOCK
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

  // Top line: flex:1, height 1, gradient transparent -> gold -> transparent
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
    // Simulate gradient with opacity layers
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

  // Brand line
  brandLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
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

  // LOGO BLOCK: flex 1, centered
  blockLogo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoImg: {
    width: 320,
    height: 320,
    // drop-shadow approximation
    shadowColor: 'rgba(212,175,55,0.55)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
  },

  // BOTTOM BLOCK
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
