import { StyleSheet } from 'react-native';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const DIM = 'rgba(1,5,13,0.80)';
const GOLD = '#d4af37';

export interface HoleValues {
  x: SharedValue<number>;
  y: SharedValue<number>;
  w: SharedValue<number>;
  h: SharedValue<number>;
  r: SharedValue<number>;
}

// Oscurece toda la pantalla salvo el foco (rectángulo redondeado o círculo),
// con un borde dorado. Solo dibuja: no recibe toques.
export default function SpotlightOverlay({
  width,
  height,
  hole,
}: {
  width: number;
  height: number;
  hole: HoleValues;
}) {
  const pathProps = useAnimatedProps(() => {
    const x = hole.x.value;
    const y = hole.y.value;
    const w = Math.max(hole.w.value, 0);
    const h = Math.max(hole.h.value, 0);
    const r = Math.min(hole.r.value, w / 2, h / 2);
    // Pantalla completa + hueco; evenodd deja el hueco transparente.
    const d =
      `M0 0H${width}V${height}H0Z ` +
      `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}` +
      `V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
      `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
      `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
    return { d };
  }, [width, height]);

  const borderProps = useAnimatedProps(() => {
    const w = Math.max(hole.w.value, 0);
    const h = Math.max(hole.h.value, 0);
    const r = Math.min(hole.r.value, w / 2, h / 2);
    return { x: hole.x.value, y: hole.y.value, width: w, height: h, rx: r, ry: r };
  });

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <AnimatedPath animatedProps={pathProps} fill={DIM} fillRule="evenodd" />
      <AnimatedRect animatedProps={borderProps} fill="none" stroke={GOLD} strokeWidth={2} strokeOpacity={0.9} />
    </Svg>
  );
}
