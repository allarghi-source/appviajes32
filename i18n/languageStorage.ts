import AsyncStorage from '@react-native-async-storage/async-storage';

export const LANGUAGE_STORAGE_KEY = 'app_language';

export type AppLanguage = 'es' | 'en';

export async function getStoredLanguage(): Promise<AppLanguage | null> {
  try {
    const value = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return value === 'es' || value === 'en' ? value : null;
  } catch {
    return null;
  }
}

export async function setStoredLanguage(language: AppLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Persistencia best-effort: si falla, el idioma sigue activo en memoria para esta sesión.
  }
}
