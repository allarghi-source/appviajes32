import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

export default function TabIndex() {
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('userData')
      .then((raw) => setReady(raw !== null))
      .catch(() => setReady(false));
  }, []);

  if (ready === null) return null;
  return <Redirect href={ready ? '/passportcover' : '/onboarding'} />;
}
