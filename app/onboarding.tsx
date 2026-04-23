import React from 'react';
import {
    Dimensions,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, {
    Circle,
    Defs,
    Path,
    Polygon,
    RadialGradient,
    Rect,
    Stop
} from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const GlobeIcon = () => (
  <Svg viewBox="0 0 24 24" width={17} height={17} fill="none">
    <Circle cx="12" cy="12" r="9" stroke="#d4af37" strokeWidth={1.5} />
    <Path d="M12 3 C8 7 8 17 12 21" stroke="#d4af37" strokeWidth={1.5} fill="none" />
    <Path d="M12 3 C16 7 16 17 12 21" stroke="#d4af37" strokeWidth={1.5} fill="none" />
    <Path d="M3 12 L21 12" stroke="#d4af37" strokeWidth={1.5} />
  </Svg>
);

const StarIcon = () => (
  <Svg viewBox="0 0 24 24" width={17} height={17} fill="none">
    <Polygon
      points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9"
      stroke="#d4af37"
      strokeWidth={1.5}
      fill="none"
    />
  </Svg>
);

const CalendarIcon = () => (
  <Svg viewBox="0 0 24 24" width={17} height={17} fill="none">
    <Rect x="3" y="4" width="18" height="16" rx="2" stroke="#d4af37" strokeWidth={1.5} />
    <Path d="M3 9 L21 9" stroke="#d4af37" strokeWidth={1.5} />
    <Path d="M8 2 L8 6" stroke="#d4af37" strokeWidth={1.5} />
    <Path d="M16 2 L16 6" stroke="#d4af37" strokeWidth={1.5} />
    <Path d="M7 13 L17 13" stroke="#d4af37" strokeWidth={1.5} />
    <Path d="M7 17 L13 17" stroke="#d4af37" strokeWidth={1.5} />
  </Svg>
);

const ArrowIcon = () => (
  <Svg viewBox="0 0 16 16" width={16} height={16} fill="none">
    <Path d="M3 8 L13 8 M9 4 L13 8 L9 12" stroke="#060f1c" strokeWidth={2} />
  </Svg>
);

// ─── Planet background (SVG version) ──────────────────────────────────────────

const PlanetBg = () => {
  const SIZE = 520;
  const LEFT = (SCREEN_WIDTH - SIZE) / 2;
  const BOTTOM_OFFSET = -120;

  return (
    <View
      style={[
        styles.planetContainer,
        {
          width: SIZE,
          height: SIZE,
          left: LEFT,
          bottom: BOTTOM_OFFSET,
        },
      ]}
    >
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          {/* Base ocean gradient */}
          <RadialGradient id="ocean" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#0a2a5e" />
            <Stop offset="40%" stopColor="#071a3e" />
            <Stop offset="75%" stopColor="#030d20" />
            <Stop offset="100%" stopColor="#010610" />
          </RadialGradient>

          {/* Solar light from upper-right */}
          <RadialGradient id="solar" cx="68%" cy="18%" rx="60%" ry="55%">
            <Stop offset="0%" stopColor="rgba(120,180,255,0.55)" />
            <Stop offset="30%" stopColor="rgba(60,120,220,0.35)" />
            <Stop offset="100%" stopColor="transparent" />
          </RadialGradient>

          {/* Sun glare */}
          <RadialGradient id="glare" cx="65%" cy="20%" rx="50%" ry="45%">
            <Stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <Stop offset="40%" stopColor="rgba(150,200,255,0.06)" />
            <Stop offset="100%" stopColor="transparent" />
          </RadialGradient>

          {/* Americas continent */}
          <RadialGradient id="america" cx="28%" cy="42%" rx="14%" ry="28%">
            <Stop offset="0%" stopColor="rgba(30,100,50,0.5)" />
            <Stop offset="100%" stopColor="transparent" />
          </RadialGradient>

          {/* Europe/Africa continent */}
          <RadialGradient id="euroafrica" cx="58%" cy="48%" rx="12%" ry="35%">
            <Stop offset="0%" stopColor="rgba(40,110,55,0.45)" />
            <Stop offset="100%" stopColor="transparent" />
          </RadialGradient>

          {/* Asia continent */}
          <RadialGradient id="asia" cx="72%" cy="38%" rx="20%" ry="22%">
            <Stop offset="0%" stopColor="rgba(35,95,45,0.4)" />
            <Stop offset="100%" stopColor="transparent" />
          </RadialGradient>

          {/* Clouds 1 */}
          <RadialGradient id="cloud1" cx="50%" cy="25%" rx="30%" ry="8%">
            <Stop offset="0%" stopColor="rgba(180,210,255,0.18)" />
            <Stop offset="100%" stopColor="transparent" />
          </RadialGradient>

          {/* Clouds 2 */}
          <RadialGradient id="cloud2" cx="30%" cy="55%" rx="20%" ry="6%">
            <Stop offset="0%" stopColor="rgba(180,210,255,0.12)" />
            <Stop offset="100%" stopColor="transparent" />
          </RadialGradient>

          {/* Clouds 3 */}
          <RadialGradient id="cloud3" cx="70%" cy="60%" rx="25%" ry="7%">
            <Stop offset="0%" stopColor="rgba(180,210,255,0.1)" />
            <Stop offset="100%" stopColor="transparent" />
          </RadialGradient>

          {/* Shadow (inset effect simulated) */}
          <RadialGradient id="shadow" cx="30%" cy="40%" r="60%">
            <Stop offset="0%" stopColor="transparent" />
            <Stop offset="60%" stopColor="rgba(0,0,5,0.4)" />
            <Stop offset="100%" stopColor="rgba(0,0,5,0.7)" />
          </RadialGradient>
        </Defs>

        {/* Base ocean */}
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#ocean)" />

        {/* Solar light */}
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#solar)" />

        {/* Continents */}
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#america)" />
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#euroafrica)" />
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#asia)" />

        {/* Clouds */}
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#cloud1)" />
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#cloud2)" />
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#cloud3)" />

        {/* Shadow to make it look 3D */}
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#shadow)" />

        {/* Solar glare */}
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#glare)" />
      </Svg>

      {/* Atmospheric rings using View borders */}
      <View style={styles.atmosphereRing1} />
      <View style={styles.atmosphereRing2} />
      <View style={styles.atmosphereRing3} />
    </View>
  );
};

// ─── Stars background ─────────────────────────────────────────────────────────

const StarsDots = () => {
  const stars = [
    { left: '8%', top: '5%', opacity: 0.7, size: 1 },
    { left: '20%', top: '10%', opacity: 0.5, size: 1 },
    { left: '35%', top: '4%', opacity: 0.8, size: 1.5 },
    { left: '55%', top: '8%', opacity: 0.4, size: 1 },
    { left: '70%', top: '3%', opacity: 0.6, size: 1 },
    { left: '85%', top: '9%', opacity: 0.5, size: 1 },
    { left: '92%', top: '15%', opacity: 0.3, size: 1 },
    { left: '12%', top: '22%', opacity: 0.4, size: 1 },
    { left: '45%', top: '18%', opacity: 0.35, size: 1 },
    { left: '78%', top: '20%', opacity: 0.5, size: 1 },
    { left: '5%', top: '35%', opacity: 0.3, size: 1 },
    { left: '95%', top: '30%', opacity: 0.4, size: 1 },
    { left: '60%', top: '25%', opacity: 0.6, size: 1.5 },
    { left: '28%', top: '40%', opacity: 0.25, size: 1 },
    { left: '88%', top: '38%', opacity: 0.35, size: 1 },
  ];

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {stars.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: s.left as any,
            top: s.top as any,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: `rgba(255,255,255,${s.opacity})`,
          }}
        />
      ))}
    </View>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Onboarding() {
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#01050d" />

      {/* ── Background layers ── */}
      <View style={styles.bg} />
      <StarsDots />
      <PlanetBg />

      {/* ── Dark fade overlay at bottom ── */}
      <View style={styles.bgFade} />

      {/* ── Screen content ── */}
      <View style={styles.content}>
        {/* Status bar row */}
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>21:04</Text>
        </View>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('./assets/myworld-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* App name */}
        <View style={styles.appName}>
          <Text style={styles.appNameMy}>My</Text>
          <Text style={styles.appNameWorld}>World</Text>
          <Text style={styles.appNameXP}>XP</Text>
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>Tu mundo · Tu historia · Tus logros</Text>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
        </View>

        {/* Features */}
        <View style={styles.features}>
          {/* Feature 1 */}
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <GlobeIcon />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Registrá tus viajes</Text>
              <Text style={styles.featureDesc}>Cada ciudad, cada país, cada aventura</Text>
            </View>
          </View>

          {/* Feature 2 */}
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <StarIcon />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Ganá XP y rangos</Text>
              <Text style={styles.featureDesc}>De Novato a Astronauta, subí de nivel</Text>
            </View>
          </View>

          {/* Feature 3 */}
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <CalendarIcon />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Tu pasaporte personal</Text>
              <Text style={styles.featureDesc}>Stats, fotos y memorias de cada destino</Text>
            </View>
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Primary button */}
        <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>Crear mi perfil</Text>
          <ArrowIcon />
        </TouchableOpacity>

        {/* Secondary button */}
        <View style={styles.btnSecondaryWrap}>
          <Text style={styles.btnSecondaryText}>
            ¿Ya tenés cuenta?{' '}
            <Text style={styles.btnSecondaryLink}>Iniciá sesión</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#01050d',
  },

  // ── Background ──
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#01050d',
  },

  // ── Planet ──
  planetContainer: {
    position: 'absolute',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  atmosphereRing1: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 9999,
    borderWidth: 8,
    borderColor: 'rgba(80,150,255,0.12)',
  },
  atmosphereRing2: {
    position: 'absolute',
    top: -18,
    left: -18,
    right: -18,
    bottom: -18,
    borderRadius: 9999,
    borderWidth: 10,
    borderColor: 'rgba(60,120,220,0.07)',
  },
  atmosphereRing3: {
    position: 'absolute',
    top: -35,
    left: -35,
    right: -35,
    bottom: -35,
    borderRadius: 9999,
    borderWidth: 17,
    borderColor: 'rgba(40,90,180,0.04)',
  },

  // ── Dark fade at bottom ──
  bgFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 420,
    // LinearGradient not available without expo-linear-gradient
    // Use a semi-opaque overlay as approximation
    backgroundColor: 'rgba(1,5,13,0.75)',
  },

  // ── Content container ──
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  // ── Status bar ──
  statusBar: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  statusTime: {
    fontFamily: 'monospace',  // closest to Share Tech Mono available without loading
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
  },

  // ── Logo ──
  logoWrap: {
    marginTop: 32,
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    // drop-shadow approximation via shadow props
    shadowColor: 'rgba(212,175,55,1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 12,
  },
  logoImage: {
    width: 180,
    height: 180,
  },

  // ── App name ──
  appName: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  appNameMy: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
    letterSpacing: 2,
  },
  appNameWorld: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    textShadowColor: 'rgba(255,255,255,0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  appNameXP: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f0d060',
    letterSpacing: 2,
    textShadowColor: 'rgba(212,175,55,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  // ── Tagline ──
  tagline: {
    marginTop: 10,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // ── Divider ──
  dividerRow: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  divider: {
    width: '55%',
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.35)',
    // For gradient effect we use opacity on a solid color as approximation
  },

  // ── Features ──
  features: {
    marginTop: 24,
    width: '100%',
    gap: 15,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 15,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(212,175,55,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.3,
  },

  // ── Spacer ──
  spacer: {
    flex: 1,
  },

  // ── Primary button ──
  btnPrimary: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: '#d4a835',   // fallback for gradient midpoint
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: 'rgba(212,175,55,1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#060f1c',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ── Secondary button ──
  btnSecondaryWrap: {
    marginTop: 14,
    marginBottom: 38,
  },
  btnSecondaryText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 1,
    textAlign: 'center',
  },
  btnSecondaryLink: {
    color: 'rgba(212,175,55,0.55)',
    textDecorationLine: 'underline',
  },
});