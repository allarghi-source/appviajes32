import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SpotlightOverlay from './SpotlightOverlay';
import TutorialCard from './TutorialCard';
import TutorialFinal from './TutorialFinal';
import { baseImageBox, cardTop, computeFrameLayout, FrameLayout, holeCenter, Screen } from './tutorialLayout';
import { SHOTS, TUTORIAL_FRAMES, TUTORIAL_STEP_COUNT, TutorialLang } from './tutorialSteps';

const BG = '#01050d';
const GOLD = '#d4af37';
const CARD_MAX_WIDTH = 520;
const MOVE_MS = 420;
const CARD_OUT_MS = 150;
const CARD_IN_MS = 220;
const TAP_MS = 560;
const TAP_SIZE = 76;
const EASE = Easing.bezier(0.4, 0, 0.2, 1);

// Reproduce el recorrido de capturas (solo demostración: nada es interactivo
// salvo SALTAR / ATRÁS / SIGUIENTE y el botón Atrás de Android). No lee ni escribe
// datos del usuario: avisa con `onExit` cuando se termina o se saltea.
export default function TutorialPlayer({
  lang,
  finalButtonLabel,
  onExit,
}: {
  lang: TutorialLang;
  finalButtonLabel: string;
  onExit: () => void;
}) {
  const { t } = useTranslation('tutorial');
  // Tamaño real del contenedor (en Android con pantalla completa puede no
  // coincidir con la ventana); la ventana es solo el valor inicial.
  const win = useWindowDimensions();
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const width = area?.width ?? win.width;
  const height = area?.height ?? win.height;
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [cardH, setCardH] = useState(0);
  const isFinal = index >= TUTORIAL_FRAMES.length;
  const frame = isFinal ? null : TUTORIAL_FRAMES[index];
  const shot = SHOTS[lang][frame?.shot ?? TUTORIAL_FRAMES[TUTORIAL_FRAMES.length - 1].shot];

  const screen: Screen = { width, height, insetTop: insets.top, insetBottom: insets.bottom };
  const base = baseImageBox(screen, shot.width, shot.height);
  const cardWidth = Math.min(width - 24, CARD_MAX_WIDTH);

  // Mientras hay una transición en curso (y antes del primer cuadro) los
  // toques se ignoran: el recuadro está invisible pero sigue en pantalla, y
  // toques rápidos no deben saltear cuadros ni el tutorial.
  const busyRef = useRef(true);
  // El cambio en curso conserva el recuadro (holdCard): no se oculta ni
  // vuelve a aparecer, solo cambian captura y foco.
  const holdingRef = useRef(false);
  const firstLayoutRef = useRef(true);
  const layoutRef = useRef<FrameLayout | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const holeX = useSharedValue(0);
  const holeY = useSharedValue(0);
  const holeW = useSharedValue(0);
  const holeH = useSharedValue(0);
  const holeR = useSharedValue(0);
  const stageOpacity = useSharedValue(0);
  const cardY = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const tapX = useSharedValue(0);
  const tapY = useSharedValue(0);
  const tapScale = useSharedValue(0);
  const tapOpacity = useSharedValue(0);

  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  // Ubica captura, foco y recuadro para el cuadro actual. Corre al cambiar de
  // cuadro, al conocerse la altura del recuadro y al cambiar la pantalla.
  useEffect(() => {
    if (!frame || cardH === 0 || !area) {
      if (isFinal) busyRef.current = false;
      return;
    }
    const layout = computeFrameLayout(screen, shot.width, shot.height, frame.focus[lang], cardH, frame.card);
    layoutRef.current = layout;

    const instant = firstLayoutRef.current || reduceMotion;
    const move = (v: number) => (instant ? v : withTiming(v, { duration: MOVE_MS, easing: EASE }));
    scale.set(move(layout.scale));
    tx.set(move(layout.tx));
    ty.set(move(layout.ty));
    holeX.set(move(layout.hole.x));
    holeY.set(move(layout.hole.y));
    holeW.set(move(layout.hole.w));
    holeH.set(move(layout.hole.h));
    holeR.set(move(layout.hole.r));

    // El recuadro está oculto durante el cambio: se ubica sin animar y
    // aparece cuando el foco ya está llegando. Si se conserva (holdCard),
    // sigue visible en la misma posición fija y no se toca.
    cardY.set(cardTop(screen, cardH, layout.cardPlacement));
    if (!holdingRef.current) {
      cardOpacity.set(
        instant
          ? withTiming(1, { duration: reduceMotion ? 0 : CARD_IN_MS })
          : withDelay(MOVE_MS - 120, withTiming(1, { duration: CARD_IN_MS })),
      );
    }
    if (firstLayoutRef.current) stageOpacity.set(withTiming(1, { duration: reduceMotion ? 0 : 300 }));

    firstLayoutRef.current = false;
    later(() => { busyRef.current = false; }, instant ? 0 : MOVE_MS);
    // screen se deriva de width/height/insets (incluidos abajo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, cardH, width, height, insets.top, insets.bottom, lang, reduceMotion]);

  const goTo = useCallback(
    (next: number, withTap: boolean) => {
      if (busyRef.current) return;
      if (next < 0 || next > TUTORIAL_FRAMES.length) return;
      busyRef.current = true;

      // Se conserva el recuadro entre un cuadro y el siguiente que lo
      // mantiene (holdCard), en ambos sentidos.
      const hold =
        (next === index + 1 && !!TUTORIAL_FRAMES[next]?.holdCard) ||
        (next === index - 1 && !!TUTORIAL_FRAMES[index]?.holdCard);
      holdingRef.current = hold;

      let wait = 0;
      if (!hold) {
        cardOpacity.set(withTiming(0, { duration: reduceMotion ? 0 : CARD_OUT_MS }));
        wait = reduceMotion ? 0 : CARD_OUT_MS;
      }
      const layout = layoutRef.current;
      if (withTap && layout && !reduceMotion) {
        // Toque simulado sobre el centro del foco.
        const c = holeCenter(layout.hole);
        tapX.set(c.x);
        tapY.set(c.y);
        tapScale.set(withSequence(
          withTiming(0.35, { duration: 0 }),
          withTiming(1.5, { duration: TAP_MS, easing: Easing.out(Easing.quad) }),
        ));
        tapOpacity.set(withSequence(
          withTiming(0.95, { duration: 90 }),
          withDelay(170, withTiming(0, { duration: TAP_MS - 260 })),
        ));
        wait = TAP_MS - 80;
      }
      later(() => setIndex(next), wait);
    },
    [index, cardOpacity, reduceMotion, later, tapX, tapY, tapScale, tapOpacity],
  );

  const handleNext = useCallback(() => {
    goTo(index + 1, !!frame?.tapOnNext);
  }, [goTo, index, frame]);

  // ATRÁS (botón del recuadro, pantalla final y Atrás de Android): cuadro
  // anterior, sin toque simulado. En el primero no hace nada.
  const handleBack = useCallback(() => {
    if (index > 0) goTo(index - 1, false);
  }, [goTo, index]);

  const handleSkip = useCallback(() => {
    if (!busyRef.current) onExit();
  }, [onExit]);

  // Atrás de Android: mismo comportamiento. En el primero no sale del tutorial.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));
  const stageStyle = useAnimatedStyle(() => ({ opacity: stageOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ top: cardY.value, opacity: cardOpacity.value }));
  const tapStyle = useAnimatedStyle(() => ({
    left: tapX.value - TAP_SIZE / 2,
    top: tapY.value - TAP_SIZE / 2,
    opacity: tapOpacity.value,
    transform: [{ scale: tapScale.value }],
  }));

  const text = frame?.text ? t(`steps.${frame.text}`) : null;

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (!area || Math.abs(area.width - w) > 0.5 || Math.abs(area.height - h) > 0.5) setArea({ width: w, height: h });
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, stageStyle]} pointerEvents="box-none">
        <Animated.View
          style={[styles.image, { left: base.x, top: base.y, width: base.w, height: base.h }, imageStyle]}
          pointerEvents="none"
        >
          <Image
            source={shot.source}
            style={StyleSheet.absoluteFill}
            contentFit="fill"
            transition={reduceMotion ? 0 : 320}
          />
        </Animated.View>

        <SpotlightOverlay
          width={width}
          height={height}
          hole={{ x: holeX, y: holeY, w: holeW, h: holeH, r: holeR }}
        />

        <Animated.View style={[styles.tap, tapStyle]} pointerEvents="none" />

        {frame && (
          <Animated.View
            style={[styles.cardWrap, { left: (width - cardWidth) / 2, width: cardWidth }, cardStyle]}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (Math.abs(h - cardH) > 0.5) setCardH(h);
            }}
          >
            <TutorialCard
              step={frame.step}
              total={TUTORIAL_STEP_COUNT}
              text={text}
              maxTextHeight={Math.round(height * 0.42)}
              nextLabel={t('next')}
              backLabel={t('back')}
              skipLabel={t('skip')}
              onNext={handleNext}
              onBack={handleBack}
              backDisabled={index === 0}
              onSkip={handleSkip}
            />
          </Animated.View>
        )}
      </Animated.View>

      {isFinal && (
        <Animated.View style={StyleSheet.absoluteFill} entering={reduceMotion ? undefined : FadeIn.duration(380)}>
          <TutorialFinal
            buttonLabel={finalButtonLabel}
            onDone={onExit}
            backLabel={t('back')}
            onBack={handleBack}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  image: {
    position: 'absolute',
  },
  tap: {
    position: 'absolute',
    width: TAP_SIZE,
    height: TAP_SIZE,
    borderRadius: TAP_SIZE / 2,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: 'rgba(212,175,55,0.35)',
  },
  cardWrap: {
    position: 'absolute',
  },
});
