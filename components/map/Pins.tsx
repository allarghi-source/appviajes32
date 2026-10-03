import type { Region } from 'react-native-maps';
import Svg, { Circle, Path } from 'react-native-svg';

// Pines y región inicial compartidos por el mapa propio (app/mapa.tsx) y el
// mapa de solo lectura de OtherXP (components/map/OtherWorldMap.tsx). Movidos
// sin cambios desde app/mapa.tsx.

const GOLD = '#d4af37';
const GREEN = '#1a3a6e';

export const WORLD: Region = {
  latitude: 20,
  longitude: 10,
  latitudeDelta: 130,
  longitudeDelta: 130,
};

// ─── PINES TIPO ALFILER ───────────────────────────────────────────────────────

export function PinReal() {
  return (
    <Svg width={22} height={30} viewBox="0 0 22 30">
      <Path
        d="M11 1C5.5 1 1 5.5 1 11C1 18.5 11 29 11 29C11 29 21 18.5 21 11C21 5.5 16.5 1 11 1Z"
        fill={GREEN}
        stroke="#0d2550"
        strokeWidth={1}
      />
      <Circle cx={11} cy={11} r={3.5} fill="rgba(255,255,255,0.9)" />
    </Svg>
  );
}

export function PinWishlist() {
  return (
    <Svg width={22} height={30} viewBox="0 0 22 30">
      <Path
        d="M11 1C5.5 1 1 5.5 1 11C1 18.5 11 29 11 29C11 29 21 18.5 21 11C21 5.5 16.5 1 11 1Z"
        fill={GOLD}
        stroke="#a88620"
        strokeWidth={1}
      />
      <Circle cx={11} cy={11} r={3.5} fill="rgba(255,255,255,0.9)" />
    </Svg>
  );
}
