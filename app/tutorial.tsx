import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import TutorialPlayer from '../components/tutorial/TutorialPlayer';
import { markTutorialDone, TUTORIAL_FROM_CONFIG } from '../utils/tutorialState';

// Tutorial guiado. Dos modos:
//   · Inicio de un usuario nuevo (sin parámetro): al terminar o saltearlo se
//     guarda la bandera y se abre la bienvenida oficial (app/onboarding.tsx).
//   · Repetición desde CONFIG (?origen=config): al terminar o saltearlo se
//     vuelve a CONFIG. No guarda nada.
export default function Tutorial() {
  const router = useRouter();
  const { i18n, t } = useTranslation('tutorial');
  const { origen } = useLocalSearchParams<{ origen?: string }>();
  const fromConfig = origen === TUTORIAL_FROM_CONFIG;
  const exitingRef = useRef(false);

  async function handleExit() {
    if (exitingRef.current) return;
    exitingRef.current = true;
    if (fromConfig) {
      if (router.canGoBack()) router.back();
      else router.replace('/settings');
      return;
    }
    await markTutorialDone();
    router.replace('/onboarding');
  }

  return (
    <TutorialPlayer
      lang={i18n.language === 'en' ? 'en' : 'es'}
      finalButtonLabel={fromConfig ? t('finish') : t('start')}
      onExit={handleExit}
    />
  );
}
