import type { ImageSourcePropType } from 'react-native';

// ─── CONTENIDO DEL TUTORIAL ───────────────────────────────────────────────────
// Capturas reales (assets/tutorial/<idioma>/, nombres exactos del directorio)
// y la ubicación de cada elemento DENTRO de cada captura, en píxeles de esa
// misma captura. TutorialPlayer las convierte a proporciones del tamaño
// dibujado, así que el foco acompaña a la imagen en cualquier pantalla.
//
// Las capturas de cada idioma no siempre tienen el mismo encuadre (por
// ejemplo, la de CONFIG superior en español es más grande y empieza más
// arriba), por eso cada idioma tiene sus propias coordenadas.

export type TutorialLang = 'es' | 'en';

export type ShotKey =
  | 'profile'
  | 'cover'
  | 'configTop'
  | 'configBottom'
  | 'inside'
  | 'addTrip'
  | 'timeline'
  | 'detail';

export interface Shot {
  source: ImageSourcePropType;
  width: number;
  height: number;
}

export const SHOTS: Record<TutorialLang, Record<ShotKey, Shot>> = {
  es: {
    profile: { source: require('../../assets/tutorial/es/01_perfil.png'), width: 738, height: 1600 },
    cover: { source: require('../../assets/tutorial/es/02_pasaporte_cerrado.png'), width: 738, height: 1600 },
    configTop: { source: require('../../assets/tutorial/es/03_config_superior.png'), width: 851, height: 1849 },
    configBottom: { source: require('../../assets/tutorial/es/04_config_inferior.png'), width: 738, height: 1600 },
    inside: { source: require('../../assets/tutorial/es/05_pasaporte_interior.png'), width: 738, height: 1600 },
    addTrip: { source: require('../../assets/tutorial/es/06_cargar_viaje.png'), width: 738, height: 1600 },
    timeline: { source: require('../../assets/tutorial/es/07_timeline.png'), width: 738, height: 1600 },
    detail: { source: require('../../assets/tutorial/es/08_detalle_viaje.png'), width: 738, height: 1600 },
  },
  en: {
    profile: { source: require('../../assets/tutorial/en/01_perfil (1).png'), width: 738, height: 1600 },
    cover: { source: require('../../assets/tutorial/en/02_pasaporte_cerrado.png'), width: 738, height: 1600 },
    configTop: { source: require('../../assets/tutorial/en/03_config_superior (1).png'), width: 738, height: 1600 },
    configBottom: { source: require('../../assets/tutorial/en/04_config_inferior (1).png'), width: 738, height: 1600 },
    inside: { source: require('../../assets/tutorial/en/05_pasaporte_interior (1).png'), width: 738, height: 1600 },
    addTrip: { source: require('../../assets/tutorial/en/06_cargar_viaje (1).png'), width: 738, height: 1600 },
    timeline: { source: require('../../assets/tutorial/en/07_timeline (1).png'), width: 738, height: 1600 },
    detail: { source: require('../../assets/tutorial/en/08_detalle_viaje (1).png'), width: 738, height: 1600 },
  },
};

// Rectángulo en píxeles de la captura. `circle`: foco circular (sello CONFIG).
export interface FocusRect {
  x: number;
  y: number;
  w: number;
  h: number;
  circle?: boolean;
}

// Textos aprobados (i18n/locales/<idioma>/tutorial.json → steps).
export type StepTextKey =
  | 'profile'
  | 'config'
  | 'openPassport'
  | 'inside'
  | 'close'
  | 'navbar'
  | 'tripType'
  | 'multiCity'
  | 'validate'
  | 'timeline'
  | 'detailOpen'
  | 'detailInside'
  | 'stats'
  | 'map';

// Un "cuadro" del recorrido: una captura con UN foco. Un paso con dos focos
// (p. ej. resumen y barra XP) son dos cuadros consecutivos del mismo paso.
export interface TutorialFrame {
  step: number;
  shot: ShotKey;
  focus: Record<TutorialLang, FocusRect>;
  // Sin texto: el recuadro muestra solo progreso y controles (recorrido por CONFIG).
  text: StepTextKey | null;
  // Al tocar SIGUIENTE se simula un toque sobre el foco antes de pasar al
  // cuadro siguiente (abrir el pasaporte, abrir Cargar, Timeline, un viaje).
  tapOnNext?: boolean;
  // Posición fija del recuadro. Sin valor, se elige la que menos estorba.
  card?: 'top' | 'bottom';
  // El recuadro del cuadro anterior sigue visible y quieto (mismo texto):
  // solo cambian la captura y el foco. Vale también al retroceder.
  holdCard?: boolean;
}

// Mismo rectángulo en ambos idiomas (capturas con idéntico encuadre).
function both(r: FocusRect): Record<TutorialLang, FocusRect> {
  return { es: r, en: r };
}

// Interior del pasaporte: mismo encuadre en ambos idiomas.
const INSIDE = {
  summary: both({ x: 40, y: 88, w: 658, h: 1092 }),
  xp: both({ x: 62, y: 1197, w: 614, h: 86 }),
  close: both({ x: 200, y: 1384, w: 338, h: 56 }),
  navbar: both({ x: 6, y: 1462, w: 726, h: 132 }),
  add: both({ x: 162, y: 1470, w: 118, h: 120 }),
  timeline: both({ x: 310, y: 1470, w: 118, h: 120 }),
  stats: both({ x: 456, y: 1470, w: 118, h: 120 }),
  map: both({ x: 604, y: 1470, w: 118, h: 120 }),
};

export const TUTORIAL_STEP_COUNT = 15;

export const TUTORIAL_FRAMES: TutorialFrame[] = [
  // 1 · Perfil: formulario completo (foto + datos + residencia).
  { step: 1, shot: 'profile', focus: both({ x: 84, y: 330, w: 570, h: 1035 }), text: 'profile' },
  // 2 · Portada: sello CONFIG. El mismo texto queda fijo abajo durante el
  // recorrido por CONFIG (paso 3).
  {
    step: 2,
    shot: 'cover',
    focus: both({ x: 468, y: 103, w: 224, h: 224, circle: true }),
    text: 'config',
    card: 'bottom',
  },
  // 3 · CONFIG: datos personales, después copias de seguridad.
  {
    step: 3,
    shot: 'configTop',
    focus: { es: { x: 45, y: 190, w: 763, h: 955 }, en: { x: 38, y: 312, w: 662, h: 835 } },
    text: 'config',
    card: 'bottom',
    holdCard: true,
  },
  {
    step: 3,
    shot: 'configBottom',
    focus: { es: { x: 38, y: 242, w: 662, h: 436 }, en: { x: 38, y: 220, w: 662, h: 430 } },
    text: 'config',
    card: 'bottom',
    holdCard: true,
  },
  // 4 · Tapa del pasaporte → toque simulado → interior.
  { step: 4, shot: 'cover', focus: both({ x: 38, y: 200, w: 662, h: 1200 }), text: 'openPassport', tapOnNext: true },
  // 5 · Interior: resumen personal y de viajes, después barra XP. Un solo
  // mensaje, fijo arriba, mientras cambia el foco.
  { step: 5, shot: 'inside', focus: INSIDE.summary, text: 'inside', card: 'top' },
  { step: 5, shot: 'inside', focus: INSIDE.xp, text: 'inside', card: 'top', holdCard: true },
  // 6 · Tocar para cerrar.
  { step: 6, shot: 'inside', focus: INSIDE.close, text: 'close' },
  // 7 · Barra de navegación completa → botón CARGAR / ADD → toque simulado →
  // Cargar viaje. El mensaje de la barra queda visible sobre el botón.
  { step: 7, shot: 'inside', focus: INSIDE.navbar, text: 'navbar', card: 'top' },
  { step: 7, shot: 'inside', focus: INSIDE.add, text: 'navbar', card: 'top', holdCard: true, tapOnNext: true },
  // 8–10 · Cargar viaje.
  {
    step: 8,
    shot: 'addTrip',
    focus: { es: { x: 60, y: 296, w: 640, h: 84 }, en: { x: 40, y: 296, w: 660, h: 84 } },
    text: 'tripType',
  },
  {
    step: 9,
    shot: 'addTrip',
    focus: { es: { x: 60, y: 418, w: 640, h: 98 }, en: { x: 60, y: 420, w: 640, h: 78 } },
    text: 'multiCity',
  },
  {
    step: 10,
    shot: 'addTrip',
    focus: { es: { x: 38, y: 608, w: 662, h: 334 }, en: { x: 38, y: 596, w: 662, h: 334 } },
    text: 'validate',
  },
  // 11 · Botón TIMELINE → toque simulado → Timeline.
  { step: 11, shot: 'inside', focus: INSIDE.timeline, text: 'timeline', tapOnNext: true },
  {
    step: 11,
    shot: 'timeline',
    focus: { es: { x: 80, y: 300, w: 600, h: 1095 }, en: { x: 80, y: 322, w: 600, h: 1090 } },
    text: 'timeline',
  },
  // 12 · Tarjeta de Río de Janeiro → toque simulado → detalle del viaje.
  {
    step: 12,
    shot: 'timeline',
    focus: { es: { x: 156, y: 324, w: 516, h: 455 }, en: { x: 152, y: 347, w: 522, h: 463 } },
    text: 'detailOpen',
    tapOnNext: true,
  },
  { step: 12, shot: 'detail', focus: both({ x: 26, y: 712, w: 686, h: 888 }), text: 'detailInside' },
  // 13 · STATS (sin mostrar la pantalla de estadísticas).
  { step: 13, shot: 'inside', focus: INSIDE.stats, text: 'stats' },
  // 14 · MAP (sin mostrar el mapa real).
  { step: 14, shot: 'inside', focus: INSIDE.map, text: 'map' },
  // 15 · Pantalla final: la dibuja TutorialFinal.
];
