import PassportOpen from './passportinside';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
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
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.passport}
          activeOpacity={0.9}
          onPress={openPassport}
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
                resizeMode="contain"
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
    top: 60,
    right: 25,
    zIndex: 10,
    padding: 6,
  },

  settingsIcon: {
    color: 'rgba(212,175,55,0.6)',
    fontSize: 16,
    fontFamily: 'Georgia',
  },

  passport: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.75,
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
    width: 320,
    height: 320,
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
