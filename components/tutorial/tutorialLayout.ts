import type { FocusRect } from './tutorialSteps';

// ─── GEOMETRÍA DEL TUTORIAL (funciones puras) ─────────────────────────────────
// 1. La captura se dibuja ENTERA y sin deformar (encaje "contain") en la
//    pantalla: en otras proporciones quedan franjas del color de fondo.
// 2. El foco se guarda en píxeles de la captura y se convierte con la misma
//    escala, así que siempre cae sobre el elemento real.
// 3. El recuadro de texto va arriba o abajo, donde menos estorbe. Si el foco
//    no entra en el espacio libre, la captura se achica un poco y se desplaza
//    (una "cámara") para que el recuadro nunca tape el elemento explicado.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameLayout {
  // Transformación de la captura respecto de su posición base (escala sobre
  // su centro y luego desplazamiento).
  scale: number;
  tx: number;
  ty: number;
  // Foco ya transformado, en coordenadas de pantalla.
  hole: Box & { r: number };
  cardPlacement: 'top' | 'bottom';
}

export interface Screen {
  width: number;
  height: number;
  insetTop: number;
  insetBottom: number;
}

const MARGIN = 12; // separación del recuadro con los bordes seguros
const GAP = 14; // separación entre recuadro y foco
const HOLE_PAD = 6; // aire alrededor del elemento iluminado
const HOLE_RADIUS = 14;
const MIN_SCALE = 0.55;

// Rectángulo donde se dibuja la captura sin transformar.
export function baseImageBox(screen: Screen, imgW: number, imgH: number): Box {
  const aspect = imgW / imgH;
  const w = Math.min(screen.width, screen.height * aspect);
  const h = w / aspect;
  return { x: (screen.width - w) / 2, y: (screen.height - h) / 2, w, h };
}

// Posición vertical del recuadro de texto.
export function cardTop(screen: Screen, cardH: number, placement: 'top' | 'bottom'): number {
  return placement === 'top'
    ? screen.insetTop + MARGIN
    : screen.height - screen.insetBottom - MARGIN - cardH;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

export function computeFrameLayout(
  screen: Screen,
  imgW: number,
  imgH: number,
  focus: FocusRect,
  cardH: number,
  // Posición del recuadro impuesta por el cuadro (texto fijo entre cuadros).
  forcedPlacement?: 'top' | 'bottom',
): FrameLayout {
  const base = baseImageBox(screen, imgW, imgH);
  const k = base.w / imgW;
  // Foco en pantalla sin transformar, con aire alrededor.
  const f: Box = {
    x: base.x + focus.x * k - HOLE_PAD,
    y: base.y + focus.y * k - HOLE_PAD,
    w: focus.w * k + HOLE_PAD * 2,
    h: focus.h * k + HOLE_PAD * 2,
  };
  const cx = base.x + base.w / 2;
  const cy = base.y + base.h / 2;
  const safeTop = screen.insetTop + MARGIN;
  const safeBottom = screen.height - screen.insetBottom - MARGIN;

  let best: { layout: FrameLayout; cost: number } | null = null;
  const placements = forcedPlacement ? [forcedPlacement] : (['bottom', 'top'] as const);
  for (const placement of placements) {
    const top = cardTop(screen, cardH, placement);
    const r0 = placement === 'top' ? top + cardH + GAP : safeTop;
    const r1 = placement === 'top' ? safeBottom : top - GAP;
    const regionH = Math.max(r1 - r0, 1);

    const scale = clamp(
      Math.min(1, regionH / f.h, (screen.width - MARGIN * 2) / f.w),
      MIN_SCALE,
      1,
    );
    const fh = f.h * scale;
    const fw = f.w * scale;

    // Escala sobre el centro de la captura; después el desplazamiento mínimo
    // que deja el foco dentro de la zona libre.
    const top0 = cy + (f.y - cy) * scale;
    const left0 = cx + (f.x - cx) * scale;
    const wantTop = r1 - fh >= r0 ? clamp(top0, r0, r1 - fh) : r0 + (regionH - fh) / 2;
    const wantLeft = clamp(left0, MARGIN, screen.width - MARGIN - fw);
    const ty = wantTop - top0;
    const tx = fw <= screen.width - MARGIN * 2 ? wantLeft - left0 : 0;

    // Preferir no achicar; después, mover lo menos posible.
    const cost = (1 - scale) * 1000 + Math.abs(ty) + Math.abs(tx);
    const r = focus.circle ? Math.min(fw, fh) / 2 : HOLE_RADIUS * scale;
    const layout: FrameLayout = {
      scale,
      tx,
      ty,
      hole: { x: left0 + tx, y: wantTop, w: fw, h: fh, r },
      cardPlacement: placement,
    };
    if (!best || cost < best.cost) best = { layout, cost };
  }

  return best!.layout;
}

// Centro del foco, para el toque simulado.
export function holeCenter(hole: Box): { x: number; y: number } {
  return { x: hole.x + hole.w / 2, y: hole.y + hole.h / 2 };
}
