import { Audio } from 'expo-av';

const soundSources = {
  abrir_hoja: require('../assets/sounds/abrir_hoja.mp3'),
  ding: require('../assets/sounds/ding.mp3'),
  borrar_todo: require('../assets/sounds/borrar_todo.mp3'),
  subir_nivel: require('../assets/sounds/subir_nivel.mp3'),
  cargar: require('../assets/sounds/cargar.mp3'),
  giro: require('../assets/sounds/giro.mp3'),
  tic: require('../assets/sounds/tic.mp3'),
  anuncio_2: require('../assets/sounds/anuncio_2.mp3'),
  piloto: require('../assets/sounds/piloto.mp3'),
};

type SoundName = keyof typeof soundSources;

const cache: Partial<Record<SoundName, Audio.Sound>> = {};

async function getSound(name: SoundName): Promise<Audio.Sound> {
  if (cache[name]) {
    await cache[name]!.setPositionAsync(0);
    return cache[name]!;
  }
  const { sound } = await Audio.Sound.createAsync(soundSources[name]);
  cache[name] = sound;
  return sound;
}

export async function preloadSounds() {
  for (const name of Object.keys(soundSources) as SoundName[]) {
    await getSound(name);
  }
}

export async function playSound(name: SoundName) {
  try {
    const sound = await getSound(name);
    await sound.playAsync();
  } catch (e) {
    console.log('Error reproduciendo sonido:', e);
  }
}
