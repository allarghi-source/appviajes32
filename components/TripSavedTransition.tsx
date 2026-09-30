// ─────────────────────────────────────────────────────────────────────────
// Transición al guardar un viaje. Dos variantes que comparten el mismo
// sistema de nubes (mismos templates/colores/capas/composición/timing):
//   - 'real'     -> avión cruzando horizontalmente + sonido `cargar` + haptic.
//   - 'wishlist' -> globo subiendo verticalmente + sonido `viaje_deseado`, sin haptic.
// El avión ('real') es un port fiel de la composición visual aprobada en
// `preview-transicion.html` (fuente de verdad) -- NO reinterpreta nubes/
// avión, NO cambia tamaños, posiciones, colores, capas, velocidades ni
// timing respecto de esa preview. El globo ('wishlist') reutiliza ese
// mismo sistema de nubes sin modificarlo, solo con un protagonista y una
// trayectoria distintos.
//
// Responsabilidad de este componente: overlay + nubes + protagonista +
// animación + sonido/haptic sincronizados + callback al terminar. La
// lógica de guardado/persistencia vive en app/cargar.tsx, no acá.
// ─────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, Image, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { playSound } from '../utils/soundEngine';

// ── Timing: 3 fases, igual que preview-transicion.html ──
const DURATION_MS = 4000;
const PHASE1_MS = 500;   // 0.0 -> 0.5s: aparición de nubes, sin avión
const PHASE2_MS = 3000;  // 0.5 -> 3.5s: cruce completo del avión + sonido + haptic
// PHASE3 (3.5 -> 4.0s, salida de nubes) es simplemente el resto de DURATION_MS.
const PHASE1_END = PHASE1_MS / DURATION_MS;           // 0.125
const PHASE2_END = (PHASE1_MS + PHASE2_MS) / DURATION_MS; // 0.875

// Cadencia del tren de pulsos hápticos durante los 3000ms de la fase 2.
// Dentro del rango auditado (~60-90ms); valor conservador, priorizando
// suavidad por sobre continuidad perfecta. Primer punto de ajuste fino.
const HAPTIC_INTERVAL_MS = 80;

const BG_TOP = '#01050d';
const BG_MID = '#0c1f38';
const BG_BOTTOM = '#2b2032';

const PLANE_WIDTH_PCT = 75;
const PLANE_RISE_PX = 22;
const PLANE_TILT_DEG = 5;
const PLANE_ASPECT = 2172 / 724; // dimensiones reales de avionpropio.png
const PLANE_SRC = require('../assets/transition-preview/avionpropio.png');

// Globo wishlist -- mismo ancho relativo que el avión (misma familia
// visual), tamaño de arranque, ajustable si hace falta tras probarlo.
const BALLOON_WIDTH_PCT = 75;
const BALLOON_ASPECT = 1312 / 1199; // dimensiones reales de globowish.png
const BALLOON_SRC = require('../assets/transition-preview/globowish.png');

// Dos siluetas de nube -- idénticas a las de la preview aprobada.
const CLUSTER_TEMPLATES: { cx: number; cy: number; r: number }[][] = [
  [
    { cx: 38, cy: 74, r: 30 }, { cx: 78, cy: 78, r: 36 }, { cx: 122, cy: 76, r: 32 }, { cx: 162, cy: 70, r: 24 },
    { cx: 60, cy: 48, r: 28 }, { cx: 100, cy: 36, r: 36 }, { cx: 138, cy: 46, r: 26 },
  ],
  [
    { cx: 44, cy: 70, r: 26 }, { cx: 82, cy: 76, r: 32 }, { cx: 122, cy: 72, r: 30 }, { cx: 156, cy: 64, r: 22 },
    { cx: 70, cy: 44, r: 26 }, { cx: 104, cy: 32, r: 34 }, { cx: 134, cy: 42, r: 24 },
  ],
  [
    { cx: 22, cy: 76, r: 22 }, { cx: 56, cy: 70, r: 28 }, { cx: 92, cy: 66, r: 32 }, { cx: 128, cy: 68, r: 30 },
    { cx: 162, cy: 74, r: 24 }, { cx: 184, cy: 80, r: 18 }, { cx: 110, cy: 44, r: 26 },
  ],
];

type CloudLayer = 'far' | 'mid' | 'nearBack' | 'nearFront';

const LAYER_STYLE: Record<CloudLayer, { highlight: string; mid: string; shadow: string }> = {
  far: { highlight: '#ffffff', mid: '#e7edf3', shadow: '#d3dce6' },
  mid: { highlight: '#ffffff', mid: '#f1f4f8', shadow: '#c9d2de' },
  nearBack: { highlight: '#ffffff', mid: '#ffffff', shadow: '#aebccd' },
  nearFront: { highlight: '#ffffff', mid: '#ffffff', shadow: '#a7b6c8' },
};

const Z = { far: 1, mid: 2, nearBack: 3, plane: 4, nearFront: 5 };

interface CloudConfig {
  id: string;
  layer: CloudLayer;
  template: 0 | 1 | 2;
  sizePct: number;
  topPct: number;
  startPct: number;
  endPct: number;
  maxOpacity: number;
  zIndex?: number;
}

// Idéntico al estado final de preview-transicion.html, incluida la última
// corrección aprobada: nf-1/nf-2 con zIndex forzado a Z.nearBack (quedan
// detrás del avión en vez de delante).
const CLOUDS: CloudConfig[] = [
  { id: 'far-1', layer: 'far', template: 0, sizePct: 52, topPct: 4, startPct: -52, endPct: -45, maxOpacity: 0.55 },
  { id: 'far-2', layer: 'far', template: 1, sizePct: 46, topPct: 11, startPct: 58, endPct: 52, maxOpacity: 0.5 },
  { id: 'far-3', layer: 'far', template: 2, sizePct: 58, topPct: 1, startPct: 14, endPct: 9, maxOpacity: 0.5 },
  { id: 'far-4', layer: 'far', template: 0, sizePct: 40, topPct: 17, startPct: -14, endPct: -10, maxOpacity: 0.45 },

  { id: 'mid-1', layer: 'mid', template: 1, sizePct: 76, topPct: 20, startPct: -58, endPct: -46, maxOpacity: 0.85 },
  { id: 'mid-2', layer: 'mid', template: 0, sizePct: 68, topPct: 27, startPct: 64, endPct: 53, maxOpacity: 0.8 },
  { id: 'mid-3', layer: 'mid', template: 2, sizePct: 58, topPct: 13, startPct: 22, endPct: 14, maxOpacity: 0.78 },
  { id: 'mid-4', layer: 'mid', template: 1, sizePct: 62, topPct: 32, startPct: -6, endPct: 0, maxOpacity: 0.78 },

  { id: 'nb-1', layer: 'nearBack', template: 0, sizePct: 100, topPct: 56, startPct: -64, endPct: -48, maxOpacity: 0.98 },
  { id: 'nb-2', layer: 'nearBack', template: 2, sizePct: 92, topPct: 65, startPct: 80, endPct: 63, maxOpacity: 0.96 },
  { id: 'nb-3', layer: 'nearBack', template: 1, sizePct: 86, topPct: 73, startPct: 24, endPct: 10, maxOpacity: 0.94 },
  { id: 'nb-4', layer: 'nearBack', template: 0, sizePct: 80, topPct: 59, startPct: -18, endPct: -7, maxOpacity: 0.92 },

  { id: 'nf-1', layer: 'nearFront', template: 2, sizePct: 52, topPct: 39, startPct: -24, endPct: 4, maxOpacity: 0.85, zIndex: Z.nearBack },
  { id: 'nf-2', layer: 'nearFront', template: 0, sizePct: 46, topPct: 45, startPct: 34, endPct: 58, maxOpacity: 0.8, zIndex: Z.nearBack },
];

// Viewbox de los puffs (mismo margen que preview-transicion.html: lienzo
// 200x110 con 10px de margen por lado para no cortar los círculos).
const CLOUD_VIEWBOX = '-10 -10 220 130';
const CLOUD_CANVAS_W = 220;
const CLOUD_CANVAS_H = 130;

function CloudPuff({ cfg, progress, screenW }: { cfg: CloudConfig; progress: Animated.Value; screenW: number }) {
  const style = LAYER_STYLE[cfg.layer];
  const gradId = `grad-${cfg.id}`;

  const width = (screenW * cfg.sizePct) / 100;
  const height = width * (CLOUD_CANVAS_H / CLOUD_CANVAS_W);
  const left = (screenW * cfg.startPct) / 100;

  const opacity = progress.interpolate({
    inputRange: [0, PHASE1_END, PHASE2_END, 1],
    outputRange: [0, cfg.maxOpacity, cfg.maxOpacity, 0],
    extrapolate: 'clamp',
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, ((cfg.endPct - cfg.startPct) / 100) * screenW],
    extrapolate: 'clamp',
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.06],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: `${cfg.topPct}%`,
        left,
        width,
        height,
        zIndex: cfg.zIndex ?? Z[cfg.layer],
        opacity,
        transform: [{ translateX }, { scale }],
      }}
    >
      <Svg width="100%" height="100%" viewBox={CLOUD_VIEWBOX}>
        <Defs>
          <RadialGradient id={gradId} cx="32%" cy="26%" r="80%">
            <Stop offset="0%" stopColor={style.highlight} />
            <Stop offset="55%" stopColor={style.mid} />
            <Stop offset="100%" stopColor={style.shadow} />
          </RadialGradient>
        </Defs>
        {CLUSTER_TEMPLATES[cfg.template].map((p, i) => (
          <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={`url(#${gradId})`} />
        ))}
      </Svg>
    </Animated.View>
  );
}

function PlaneLayer({ progress, screenW, screenH }: { progress: Animated.Value; screenW: number; screenH: number }) {
  const planeW = (screenW * PLANE_WIDTH_PCT) / 100;
  const planeH = planeW / PLANE_ASPECT;

  const translateX = progress.interpolate({
    inputRange: [0, PHASE1_END, PHASE2_END, 1],
    outputRange: [-planeW, -planeW, screenW + planeW, screenW + planeW],
    extrapolate: 'clamp',
  });
  const translateY = progress.interpolate({
    inputRange: [0, PHASE1_END, PHASE2_END, 1],
    outputRange: [PLANE_RISE_PX / 2, PLANE_RISE_PX / 2, -PLANE_RISE_PX / 2, -PLANE_RISE_PX / 2],
    extrapolate: 'clamp',
  });
  const rotate = progress.interpolate({
    inputRange: [0, PHASE1_END, PHASE2_END, 1],
    outputRange: ['0deg', '0deg', `-${PLANE_TILT_DEG}deg`, `-${PLANE_TILT_DEG}deg`],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: screenH * 0.42,
        left: 0,
        width: planeW,
        height: planeH,
        zIndex: Z.plane,
        transform: [{ translateX }, { translateY }, { rotate }],
      }}
    >
      <Image source={PLANE_SRC} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
    </Animated.View>
  );
}

// Globo wishlist: recorrido vertical puro (abajo -> arriba), centrado
// horizontalmente, sin oscilación ni cambios de dirección ni zoom --
// mismo criterio de "movimiento continuo y limpio" que el avión, solo que
// en el eje Y. Reusa el mismo slot de z-index que el avión (Z.plane): es
// el mismo lugar de profundidad en la composición, solo cambia quién lo
// ocupa según la variante.
function BalloonLayer({ progress, screenW, screenH }: { progress: Animated.Value; screenW: number; screenH: number }) {
  const balloonW = (screenW * BALLOON_WIDTH_PCT) / 100;
  const balloonH = balloonW / BALLOON_ASPECT;

  const translateY = progress.interpolate({
    inputRange: [0, PHASE1_END, PHASE2_END, 1],
    // Arranca con el borde superior exactamente en el borde inferior de
    // pantalla (0% visible) y termina con el borde inferior exactamente en
    // el borde superior de pantalla (0% visible) -- oculto por completo en
    // ambos extremos, recorrido íntegro solo durante la fase 2.
    outputRange: [screenH, screenH, -balloonH, -balloonH],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: (screenW - balloonW) / 2,
        width: balloonW,
        height: balloonH,
        zIndex: Z.plane,
        transform: [{ translateY }],
      }}
    >
      <Image source={BALLOON_SRC} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
    </Animated.View>
  );
}

type TransitionVariant = 'real' | 'wishlist';

interface Props {
  variant?: TransitionVariant;
  onDone: () => void;
}

export function TripSavedTransition({ variant = 'real', onDone }: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let hapticTimer: ReturnType<typeof setInterval> | null = null;
    let hapticStopTimer: ReturnType<typeof setTimeout> | null = null;

    // Sonido arranca exactamente al comienzo de la fase 2 (t=500ms),
    // sincronizado con el instante en que el protagonista (avión o globo)
    // empieza a cruzar. El haptic -- solo para 'real' -- es un tren de
    // pulsos livianos (no un impacto único ni una vibración fuerte) que se
    // corta a los 3000ms exactos. Wishlist es intencionalmente sin haptic:
    // solo nubes + globo + arpa.
    const soundTimer = setTimeout(() => {
      if (variant === 'real') {
        playSound('cargar');
        hapticTimer = setInterval(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, HAPTIC_INTERVAL_MS);
        hapticStopTimer = setTimeout(() => {
          if (hapticTimer !== null) {
            clearInterval(hapticTimer);
            hapticTimer = null;
          }
        }, PHASE2_MS);
      } else {
        playSound('viaje_deseado');
      }
    }, PHASE1_MS);

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) onDone();
    });

    return () => {
      clearTimeout(soundTimer);
      if (hapticStopTimer !== null) clearTimeout(hapticStopTimer);
      if (hapticTimer !== null) clearInterval(hapticTimer);
      anim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[BG_TOP, BG_MID, BG_BOTTOM]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      {CLOUDS.map((cfg) => (
        <CloudPuff key={cfg.id} cfg={cfg} progress={progress} screenW={screenW} />
      ))}
      {variant === 'real' ? (
        <PlaneLayer progress={progress} screenW={screenW} screenH={screenH} />
      ) : (
        <BalloonLayer progress={progress} screenW={screenW} screenH={screenH} />
      )}
    </View>
  );
}
