import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { setStoredLanguage, type AppLanguage } from '../i18n/languageStorage';

export function useAppLanguage() {
  const { i18n } = useTranslation();

  const setLanguage = useCallback(
    async (language: AppLanguage) => {
      await i18n.changeLanguage(language);
      await setStoredLanguage(language);
    },
    [i18n]
  );

  return {
    language: (i18n.language as AppLanguage) ?? 'es',
    setLanguage,
  };
}
