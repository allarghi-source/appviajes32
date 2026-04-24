import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';

export default function RootLayout() {
  const [loaded] = useFonts({
    ShareTechMono: require('../assets/fonts/ShareTechMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return <Slot />;
}