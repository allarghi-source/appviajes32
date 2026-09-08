import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18n, { initI18n } from '../i18n';
import { runOrigenCoordsMigration } from '../utils/tripOriginMigration';

export default function RootLayout() {
  const [loaded] = useFonts({
    ShareTechMono: require('../assets/fonts/ShareTechMono-Regular.ttf'),
  });
  const [i18nReady, setI18nReady] = useState(false);
  const [migrationReady, setMigrationReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true)).catch(() => setI18nReady(true));
  }, []);

  // Debe terminar antes de que cualquier pantalla lea `trips`, igual que fuentes
  // e i18n bloquean el render de abajo. El catch asegura que un error acá nunca
  // deje la app en blanco.
  useEffect(() => {
    runOrigenCoordsMigration()
      .catch(() => {})
      .finally(() => setMigrationReady(true));
  }, []);

  if (!loaded || !i18nReady || !migrationReady) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <Slot />
    </I18nextProvider>
  );
}