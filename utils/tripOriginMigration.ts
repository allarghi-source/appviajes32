import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip } from './statsEngine';

// Estampa origenCoords en los trips reales que todavía no lo tengan, usando la
// residencia actual validada del perfil. Las wishlist nunca reciben origenCoords
// (no aportan km/horas). Idempotente por estado, no por flag: cada llamada relee
// `trips` y solo actúa si hay reales pendientes, así que puede invocarse tantas
// veces como haga falta (arranque de la app, después de guardar una residencia
// nueva, tras restaurar un backup) sin costo ni riesgo cuando no hay nada que hacer.
export async function runOrigenCoordsMigration(): Promise<void> {
  const rawTrips = await AsyncStorage.getItem('trips');
  const trips: Trip[] = rawTrips ? JSON.parse(rawTrips) : [];
  const pendientes = trips.filter((t) => t.tipo === 'real' && !t.origenCoords);
  if (pendientes.length === 0) return;

  const rawUser = await AsyncStorage.getItem('userData');
  const residencia = rawUser ? JSON.parse(rawUser)?.residencia : null;
  const lat = residencia?.lat;
  const lng = residencia?.lng;
  const residenciaValida =
    residencia &&
    typeof residencia.countryCode === 'string' &&
    residencia.ciudad &&
    residencia.pais &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  // Sin residencia validada no se migra nada ni se inventa un origen; se
  // reintentará en la próxima llamada (próximo boot, o tras guardar residencia).
  if (!residenciaValida) return;

  const migrados = trips.map((t) =>
    t.tipo === 'real' && !t.origenCoords ? { ...t, origenCoords: { lat, lng } } : t
  );
  await AsyncStorage.setItem('trips', JSON.stringify(migrados));
}
