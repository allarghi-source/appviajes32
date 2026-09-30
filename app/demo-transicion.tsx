// ─────────────────────────────────────────────────────────────────────────
// DEMO AISLADA — transición "nubes + avión".
//
// Pantalla de prueba temporal, autocontenida, SIN conexión a ninguna
// funcionalidad real de MyWorldXP (sin guardado, sonido, haptics, Supabase,
// estadísticas, logros, XP ni navegación posterior). Expo Router la expone
// automáticamente en /demo-transicion por estar en app/, sin tocar
// _layout.tsx ni ninguna otra pantalla.
//
// Si se descarta, borrar este único archivo deja MyWorldXP exactamente como
// estaba antes.
// ─────────────────────────────────────────────────────────────────────────

import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const DURATION_MS = 1200;

const GOLD = '#d4af37';
const CREAM = '#f2e6c9';
const BG_TOP = '#01050d';
const BG_MID = '#0c1f38';
const BG_BOTTOM = '#2b2032';

const PLANE_W = 96;
const PLANE_H = 34;

// Dos siluetas de nube ligeramente distintas, dibujadas a mano con curvas
// bézier (no círculos apilados), para que las instancias repetidas no se
// vean idénticas ni "de dibujo infantil".
const CLOUD_PATHS = [
  'M8,58 C-4,56 -2,36 14,34 C12,16 44,10 56,26 C68,8 100,16 96,36 C114,34 116,56 98,60 C100,74 68,80 56,68 C40,82 12,76 8,58 Z',
  'M10,50 C0,46 2,28 18,28 C20,12 48,8 58,22 C72,6 102,14 96,32 C112,32 112,52 96,54 C96,68 64,72 54,60 C38,72 14,66 10,50 Z',
];

type CloudConfig = {
  id: string;
  pathIndex: 0 | 1;
  size: number;
  top: number;
  startLeft: number;
  endLeft: number;
  color: string;
  targetOpacity: number;
  enterAt: number; // fracción de progreso [0,1] donde empieza a aparecer
};

// Tres capas de profundidad: lejanas (más chicas, más transparentes, frías),
// medias, y cercanas (más grandes, más opacas, cálidas, se desplazan más
// distancia en el mismo tiempo -> parallax). Tamaños grandes a propósito:
// pocos elementos grandes y suaves leen mejor como "nubes" que muchos chicos.
const CLOUDS: CloudConfig[] = [
  // ── Lejanas ──
  { id: 'far-1', pathIndex: 0, size: SCREEN_W * 0.55, top: SCREEN_H * 0.1, startLeft: -SCREEN_W * 0.6, endLeft: -SCREEN_W * 0.32, color: '#cfe0f2', targetOpacity: 0.32, enterAt: 0 },
  { id: 'far-2', pathIndex: 1, size: SCREEN_W * 0.5, top: SCREEN_H * 0.2, startLeft: SCREEN_W * 0.55, endLeft: SCREEN_W * 0.38, color: '#cfe0f2', targetOpacity: 0.28, enterAt: 0.02 },
  { id: 'far-3', pathIndex: 0, size: SCREEN_W * 0.6, top: SCREEN_H * 0.06, startLeft: SCREEN_W * 0.15, endLeft: SCREEN_W * 0.04, color: '#d8e6f4', targetOpacity: 0.3, enterAt: 0.04 },

  // ── Medias ──
  { id: 'mid-1', pathIndex: 1, size: SCREEN_W * 0.65, top: SCREEN_H * 0.28, startLeft: -SCREEN_W * 0.5, endLeft: -SCREEN_W * 0.12, color: '#e9e2d2', targetOpacity: 0.55, enterAt: 0.05 },
  { id: 'mid-2', pathIndex: 0, size: SCREEN_W * 0.6, top: SCREEN_H * 0.38, startLeft: SCREEN_W * 0.7, endLeft: SCREEN_W * 0.42, color: '#e9e2d2', targetOpacity: 0.5, enterAt: 0.08 },
  { id: 'mid-3', pathIndex: 1, size: SCREEN_W * 0.55, top: SCREEN_H * 0.2, startLeft: SCREEN_W * 0.2, endLeft: SCREEN_W * 0.01, color: '#efe7d6', targetOpacity: 0.5, enterAt: 0.1 },

  // ── Cercanas ──
  { id: 'near-1', pathIndex: 0, size: SCREEN_W * 0.85, top: SCREEN_H * 0.48, startLeft: -SCREEN_W * 0.7, endLeft: SCREEN_W * 0.08, color: '#f5ede0', targetOpacity: 0.85, enterAt: 0.12 },
  { id: 'near-2', pathIndex: 1, size: SCREEN_W * 0.8, top: SCREEN_H * 0.6, startLeft: SCREEN_W * 0.85, endLeft: SCREEN_W * 0.22, color: '#f7efe2', targetOpacity: 0.85, enterAt: 0.15 },
  { id: 'near-3', pathIndex: 0, size: SCREEN_W * 0.9, top: SCREEN_H * 0.38, startLeft: SCREEN_W * 0.3, endLeft: -SCREEN_W * 0.08, color: '#f2e9da', targetOpacity: 0.8, enterAt: 0.18 },
];

function Cloud({ config, progress }: { config: CloudConfig; progress: Animated.Value }) {
  const { pathIndex, size, top, startLeft, endLeft, color, targetOpacity, enterAt } = config;

  const opacity = progress.interpolate({
    inputRange: [enterAt, Math.min(1, enterAt + 0.25), 1],
    outputRange: [0, targetOpacity, targetOpacity],
    extrapolate: 'clamp',
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, endLeft - startLeft],
    extrapolate: 'clamp',
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left: startLeft,
        width: size,
        height: size * 0.68,
        opacity,
        transform: [{ translateX }, { scale }],
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 120 82">
        <Defs>
          <RadialGradient id={`grad-${config.id}`} cx="45%" cy="38%" r="65%">
            <Stop offset="0%" stopColor={color} stopOpacity={1} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.3} />
          </RadialGradient>
        </Defs>
        <Path d={CLOUD_PATHS[pathIndex]} fill={`url(#grad-${config.id})`} />
      </Svg>
    </Animated.View>
  );
}

function Plane({ progress }: { progress: Animated.Value }) {
  const translateX = progress.interpolate({
    inputRange: [0, 0.167, 0.833, 1],
    outputRange: [-PLANE_W, -PLANE_W, SCREEN_W + PLANE_W, SCREEN_W + PLANE_W],
    extrapolate: 'clamp',
  });
  // Trayectoria apenas ascendente mientras cruza (sutil, no un arco marcado).
  const translateY = progress.interpolate({
    inputRange: [0, 0.167, 0.833, 1],
    outputRange: [14, 14, -10, -10],
    extrapolate: 'clamp',
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.16, 0.2, 0.78, 0.833, 1],
    outputRange: [0, 0, 1, 1, 0, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.planeWrap,
        { transform: [{ translateX }, { translateY }], opacity },
      ]}
    >
      {/* Estela sutil detrás del avión -- refuerza la sensación de velocidad */}
      <LinearGradient
        colors={['rgba(212,175,55,0)', 'rgba(212,175,55,0.35)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.planeTrail}
      />
      <Svg width={PLANE_W} height={PLANE_H} viewBox="0 0 100 34">
        <Defs>
          <SvgLinearGradient id="planeBody" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={GOLD} />
            <Stop offset="100%" stopColor={CREAM} />
          </SvgLinearGradient>
        </Defs>
        {/* Fuselaje: silueta tipo lente, más angosta en cola y morro */}
        <Path d="M2,17 C2,10 18,6 50,7 C78,8 92,12 98,17 C92,22 78,26 50,27 C18,28 2,24 2,17 Z" fill="url(#planeBody)" />
        {/* Estabilizador de cola */}
        <Path d="M10,18 L4,3 L23,14 Z" fill={GOLD} opacity={0.9} />
        {/* Ala, vista de costado */}
        <Path d="M46,22 L26,32 L66,24 Z" fill={GOLD} opacity={0.85} />
      </Svg>
    </Animated.View>
  );
}

export default function DemoTransicion() {
  const progress = useRef(new Animated.Value(0)).current;
  const [isPlaying, setIsPlaying] = useState(false);

  function playTransicion() {
    if (isPlaying) return;
    setIsPlaying(true);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsPlaying(false);
    });
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[BG_TOP, BG_MID, BG_BOTTOM]} style={StyleSheet.absoluteFill} />

      {CLOUDS.map((c) => (
        <Cloud key={c.id} config={c} progress={progress} />
      ))}

      <Plane progress={progress} />

      <View style={styles.topText} pointerEvents="none">
        <Text style={styles.title}>Demo de transición</Text>
        <Text style={styles.subtitle}>Prueba aislada — no forma parte del diseño final</Text>
      </View>

      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.button, isPlaying && styles.buttonDisabled]}
          onPress={playTransicion}
          activeOpacity={0.85}
          disabled={isPlaying}
        >
          <Text style={styles.buttonText}>PROBAR TRANSICIÓN</Text>
        </TouchableOpacity>
        <Text style={styles.footnote}>Pantalla de prueba temporal — no forma parte de MyWorldXP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_TOP,
    overflow: 'hidden',
  },
  topText: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: CREAM,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(242,230,201,0.55)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  bottomArea: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: GOLD,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 30,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#01050d',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  footnote: {
    color: 'rgba(242,230,201,0.35)',
    fontSize: 11,
    marginTop: 14,
    textAlign: 'center',
  },
  planeWrap: {
    position: 'absolute',
    top: SCREEN_H * 0.42,
    left: 0,
    width: PLANE_W,
    height: PLANE_H,
  },
  planeTrail: {
    position: 'absolute',
    left: -PLANE_W * 0.9,
    top: PLANE_H / 2 - 2,
    width: PLANE_W * 0.9,
    height: 4,
    borderRadius: 2,
  },
});
