import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

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

const cache: Partial<Record<SoundName, AudioPlayer>> = {};

async function getPlayer(name: SoundName): Promise<AudioPlayer> {
  if (cache[name]) {
    await cache[name]!.seekTo(0);
    return cache[name]!;
  }
  const player = createAudioPlayer(soundSources[name]);
  cache[name] = player;
  return player;
}

export async function preloadSounds() {
  for (const name of Object.keys(soundSources) as SoundName[]) {
    await getPlayer(name);
  }
}

export async function playSound(name: SoundName) {
  try {
    const player = await getPlayer(name);
    player.play();
  } catch (e) {
    console.log('Error reproduciendo sonido:', e);
  }
}
