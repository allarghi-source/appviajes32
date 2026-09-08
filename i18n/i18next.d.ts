import 'i18next';

import common from './locales/es/common.json';
import onboarding from './locales/es/onboarding.json';
import profile from './locales/es/profile.json';
import passport from './locales/es/passport.json';
import timeline from './locales/es/timeline.json';
import detalle from './locales/es/detalle.json';
import map from './locales/es/map.json';
import stats from './locales/es/stats.json';
import medallero from './locales/es/medallero.json';
import cargar from './locales/es/cargar.json';
import settings from './locales/es/settings.json';
import popups from './locales/es/popups.json';
import navbar from './locales/es/navbar.json';
import achievements from './locales/es/achievements.json';
import ranks from './locales/es/ranks.json';
import backup from './locales/es/backup.json';

// Augmentación de tipos de i18next contra el español (idioma base/completo),
// para que t('namespace:clave.inexistente') sea un error de compilación.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      onboarding: typeof onboarding;
      profile: typeof profile;
      passport: typeof passport;
      timeline: typeof timeline;
      detalle: typeof detalle;
      map: typeof map;
      stats: typeof stats;
      medallero: typeof medallero;
      cargar: typeof cargar;
      settings: typeof settings;
      popups: typeof popups;
      navbar: typeof navbar;
      achievements: typeof achievements;
      ranks: typeof ranks;
      backup: typeof backup;
    };
  }
}
