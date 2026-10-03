import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { getStoredLanguage } from '../../i18n/languageStorage';

type Destination = '/passportcover' | '/onboarding' | '/select-language';

export default function TabIndex() {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [userData, storedLanguage] = await Promise.all([
          AsyncStorage.getItem('userData'),
          getStoredLanguage(),
        ]);
        if (userData !== null) {
          // Usuario con perfil ya creado (incluye instalaciones existentes de
          // antes de esta etapa, aunque no tengan idioma guardado todavía):
          // nunca ve la pantalla de selección, igual que siempre.
          setDestination('/passportcover');
        } else if (storedLanguage === null) {
          // Primera apertura real: sin perfil y sin idioma elegido todavía.
          setDestination('/select-language');
        } else {
          // Idioma ya elegido pero onboarding sin terminar (se fue a mitad
          // de camino): no se le vuelve a preguntar el idioma.
          setDestination('/onboarding');
        }
      } catch {
        setDestination('/onboarding');
      }
    })();
  }, []);

  if (destination === null) return null;
  return <Redirect href={destination} />;
}
