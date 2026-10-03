import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import { getStoredLanguage, type AppLanguage } from './languageStorage';

import esCommon from './locales/es/common.json';
import esOnboarding from './locales/es/onboarding.json';
import esProfile from './locales/es/profile.json';
import esPassport from './locales/es/passport.json';
import esTimeline from './locales/es/timeline.json';
import esDetalle from './locales/es/detalle.json';
import esMap from './locales/es/map.json';
import esStats from './locales/es/stats.json';
import esMedallero from './locales/es/medallero.json';
import esCargar from './locales/es/cargar.json';
import esSettings from './locales/es/settings.json';
import esPopups from './locales/es/popups.json';
import esNavbar from './locales/es/navbar.json';
import esAchievements from './locales/es/achievements.json';
import esRanks from './locales/es/ranks.json';
import esBackup from './locales/es/backup.json';
import esAuth from './locales/es/auth.json';
import esSocial from './locales/es/social.json';

import enCommon from './locales/en/common.json';
import enOnboarding from './locales/en/onboarding.json';
import enProfile from './locales/en/profile.json';
import enPassport from './locales/en/passport.json';
import enTimeline from './locales/en/timeline.json';
import enDetalle from './locales/en/detalle.json';
import enMap from './locales/en/map.json';
import enStats from './locales/en/stats.json';
import enMedallero from './locales/en/medallero.json';
import enCargar from './locales/en/cargar.json';
import enSettings from './locales/en/settings.json';
import enPopups from './locales/en/popups.json';
import enNavbar from './locales/en/navbar.json';
import enAchievements from './locales/en/achievements.json';
import enRanks from './locales/en/ranks.json';
import enBackup from './locales/en/backup.json';
import enAuth from './locales/en/auth.json';
import enSocial from './locales/en/social.json';

export const defaultNS = 'common';

export const resources = {
  es: {
    common: esCommon,
    onboarding: esOnboarding,
    profile: esProfile,
    passport: esPassport,
    timeline: esTimeline,
    detalle: esDetalle,
    map: esMap,
    stats: esStats,
    medallero: esMedallero,
    cargar: esCargar,
    settings: esSettings,
    popups: esPopups,
    navbar: esNavbar,
    achievements: esAchievements,
    ranks: esRanks,
    backup: esBackup,
    auth: esAuth,
    social: esSocial,
  },
  en: {
    common: enCommon,
    onboarding: enOnboarding,
    profile: enProfile,
    passport: enPassport,
    timeline: enTimeline,
    detalle: enDetalle,
    map: enMap,
    stats: enStats,
    medallero: enMedallero,
    cargar: enCargar,
    settings: enSettings,
    popups: enPopups,
    navbar: enNavbar,
    achievements: enAchievements,
    ranks: enRanks,
    backup: enBackup,
    auth: enAuth,
    social: enSocial,
  },
} as const;

// Detección de idioma del dispositivo, con 'es' como fallback si no es 'en'.
// Exportada para que app/select-language.tsx la reuse tal cual para la
// preselección visual de la pantalla de primera apertura (nunca persiste nada
// por sí sola -- eso sigue pasando únicamente por setStoredLanguage()).
export function resolveDeviceLanguage(): AppLanguage {
  const languageCode = Localization.getLocales()[0]?.languageCode;
  return languageCode === 'en' ? 'en' : 'es';
}

let initPromise: Promise<void> | null = null;

export function initI18n(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const stored = await getStoredLanguage();
    const initialLanguage: AppLanguage = stored ?? resolveDeviceLanguage();

    await i18n.use(initReactI18next).init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'es',
      defaultNS,
      ns: Object.keys(resources.es),
      interpolation: { escapeValue: false },
      returnEmptyString: false,
    });
  })();

  return initPromise;
}

export default i18n;
