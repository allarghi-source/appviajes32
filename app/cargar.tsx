import NavBar from '../components/NavBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { AchievementPopup } from '../components/AchievementPopup';
import { LevelUpPopup } from '../components/LevelUpPopup';
import { Achievement, checkAndSaveAchievements } from '../utils/achievementsEngine';
import { calcularStats, getXpRestantes, Trip as StatsTrip } from '../utils/statsEngine';
import { playSound } from '../utils/soundEngine';
import { useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const BG = '#01050d';
const GOLD = '#d4af37';
const SURFACE = '#0d1a2e';
const BORDER = '#1e3050';
const TEXT = '#e8e0d0';
const MUTED = '#6b7a8d';

const { width: SCREEN_W } = Dimensions.get('window');
// On tablets (>540px) the padding grows so the content stays ~540px wide and centered
const SIDE_PAD = Math.max(24, Math.round((SCREEN_W - 540) / 2));
const PICKER_THUMB_SIZE = Math.floor((SCREEN_W - 6) / 3);

type TripType = 'real' | 'wishlist';

interface TripData {
  id: string;
  tipo: TripType;
  ciudad: string;
  pais: string;
  coords: { lat: number; lng: number } | null;
  fechaInicio: string | null;
  fotos: string[];
  portada: string | null;
  nota: string;
  xp: number;
  distancia: number;
  chainId: string | null;
  origenCoords?: { lat: number; lng: number } | null;
}

interface GeoOpcion { display_name: string; lat: string; lon: string; }

interface DestinoState {
  id: string;
  ciudad: string;
  pais: string;
  coords: { lat: number; lng: number } | null;
  geoStatus: 'idle' | 'buscando' | 'encontrada' | 'no_encontrada' | 'error' | 'multiples';
  geoNombre: string;
  geoOpciones: GeoOpcion[];
  geoSoloPais: boolean;
  dia: string;
  mes: string;
  anio: string;
  nota: string;
  fotos: string[];
  portada: string | null;
  ciudadSugs: string[];
  openDropdown: 'dia' | 'mes' | 'anio' | null;
}

type NotifItem =
  | { kind: 'levelup'; prevRango: string; newRango: string; xpRestantes: number | null; userName: string }
  | { kind: 'achievement'; achievement: Achievement };

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildFechaInicio(dia: string, mes: string, anio: string): string {
  return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
}

// Lee la residencia validada del perfil (país elegido de lista + ciudad
// geocodificada, con lat/lng finitos). Es el "kilómetro cero" de todo viaje real
// nuevo. Devuelve null si falta o está incompleta — nunca inventa un origen.
async function getResidenciaValidada(): Promise<{ lat: number; lng: number } | null> {
  const raw = await AsyncStorage.getItem('userData');
  const userData = raw ? JSON.parse(raw) : {};
  const residencia = userData?.residencia;
  const lat = residencia?.lat;
  const lng = residencia?.lng;
  const valida =
    residencia &&
    typeof residencia.countryCode === 'string' &&
    residencia.ciudad &&
    residencia.pais &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);
  return valida ? { lat, lng } : null;
}

// ─── FOTO PERSISTENCE ─────────────────────────────────────────────────────────

const FOTOS_DIR = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}fotos/`
  : null;

async function copiarAalmacenamientoPersistente(uris: string[]): Promise<string[]> {
  console.log('[Fotos] Iniciando copia —', uris.length, 'foto(s)');

  if (uris.length === 0) return [];

  if (!FOTOS_DIR || !FileSystem.documentDirectory) {
    const err = new Error('FileSystem.documentDirectory no disponible');
    console.error('[Fotos] ERROR:', err.message);
    throw err;
  }

  // Crear el directorio sólo si todavía no existe
  try {
    const dirInfo = await FileSystem.getInfoAsync(FOTOS_DIR);
    console.log('[Fotos] Directorio fotos/', dirInfo.exists ? 'ya existe' : 'no existe — creando');
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(FOTOS_DIR, { intermediates: true });
      console.log('[Fotos] Directorio creado OK');
    }
  } catch (dirErr) {
    console.error('[Fotos] ERROR al crear directorio:', FOTOS_DIR, dirErr);
    throw dirErr;
  }

  const resultados: string[] = [];
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    console.log(`[Fotos] Foto ${i + 1}/${uris.length}:`, uri ? uri.slice(0, 100) : '⚠ URI VACÍA');

    if (!uri) {
      console.warn(`[Fotos] Foto ${i + 1}: URI nula/vacía, saltando`);
      continue;
    }

    // Ya está en documentDirectory → no necesita copiarse
    if (uri.startsWith(FileSystem.documentDirectory)) {
      console.log(`[Fotos] Foto ${i + 1}: ya persistida, usando directa`);
      resultados.push(uri);
      continue;
    }

    const cleanUri = uri.split('?')[0];
    const rawExt = cleanUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(rawExt) ? rawExt : 'jpg';
    const dest = `${FOTOS_DIR}${genId()}.${safeExt}`;

    try {
      console.log(`[Fotos] Foto ${i + 1}: copyAsync →`, dest.slice(-50));
      await FileSystem.copyAsync({ from: uri, to: dest });
      console.log(`[Fotos] Foto ${i + 1}: copiada OK`);
      resultados.push(dest);
    } catch (copyErr) {
      console.error(`[Fotos] Foto ${i + 1}: ERROR en copyAsync — uri: ${uri.slice(0, 100)}`, copyErr);
      throw copyErr;
    }
  }

  console.log('[Fotos] Copia completa —', resultados.length, 'foto(s) persistida(s)');
  return resultados;
}

// ─── DATE DROPDOWN DATA ───────────────────────────────────────────────────────

interface DropItem { label: string; value: string; }

const DAYS: DropItem[] = Array.from({ length: 31 }, (_, i) => ({
  label: String(i + 1).padStart(2, '0'),
  value: String(i + 1),
}));

const MONTHS: DropItem[] = [
  { label: 'ENE', value: '1'  }, { label: 'FEB', value: '2'  },
  { label: 'MAR', value: '3'  }, { label: 'ABR', value: '4'  },
  { label: 'MAY', value: '5'  }, { label: 'JUN', value: '6'  },
  { label: 'JUL', value: '7'  }, { label: 'AGO', value: '8'  },
  { label: 'SEP', value: '9'  }, { label: 'OCT', value: '10' },
  { label: 'NOV', value: '11' }, { label: 'DIC', value: '12' },
];

// Newest first so recent years are at the top; capped at current year
const _CURRENT_YEAR  = new Date().getFullYear();
const _CURRENT_MONTH = new Date().getMonth() + 1;
const _CURRENT_DAY   = new Date().getDate();
const YEARS: DropItem[] = Array.from({ length: _CURRENT_YEAR - 1980 + 1 }, (_, i) => ({
  label: String(_CURRENT_YEAR - i),
  value: String(_CURRENT_YEAR - i),
}));

function isFutureDate(dia: string, mes: string, anio: string): boolean {
  const d     = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
  const today = new Date(_CURRENT_YEAR, _CURRENT_MONTH - 1, _CURRENT_DAY);
  return d > today;
}

// Detecta fechas que no existen en el calendario (ej: 31 de febrero),
// que JS normalizaría silenciosamente en vez de rechazar.
function isValidCalendarDate(dia: string, mes: string, anio: string): boolean {
  const d = parseInt(dia, 10);
  const m = parseInt(mes, 10);
  const y = parseInt(anio, 10);
  if (!d || !m || !y) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// ¿Hay más de 30 días entre algún par de destinos consecutivos de un viaje multidestino?
function hayBrechaExcesiva(destinos: DestinoState[]): boolean {
  const DIA_MS = 24 * 60 * 60 * 1000;
  for (let i = 0; i < destinos.length - 1; i++) {
    const a = destinos[i];
    const b = destinos[i + 1];
    const fechaA = new Date(parseInt(a.anio), parseInt(a.mes) - 1, parseInt(a.dia)).getTime();
    const fechaB = new Date(parseInt(b.anio), parseInt(b.mes) - 1, parseInt(b.dia)).getTime();
    if (Math.abs(fechaB - fechaA) > 30 * DIA_MS) return true;
  }
  return false;
}

// ─── CITY AUTOCOMPLETE DATA ───────────────────────────────────────────────────

interface CityEntry { name: string; country: string; }

const CIUDADES: CityEntry[] = [
  { name: 'Abu Dhabi',           country: 'Emiratos Árabes Unidos' },
  { name: 'Abiyán',              country: 'Costa de Marfil' },
  { name: 'Accra',               country: 'Ghana' },
  { name: 'Addis Abeba',         country: 'Etiopía' },
  { name: 'Adelaide',            country: 'Australia' },
  { name: 'Alejandría',          country: 'Egipto' },
  { name: 'Almaty',              country: 'Kazajistán' },
  { name: 'Ámsterdam',           country: 'Países Bajos' },
  { name: 'Amsterdam',           country: 'Países Bajos' },
  { name: 'Ankara',              country: 'Turquía' },
  { name: 'Asunción',            country: 'Paraguay' },
  { name: 'Atenas',              country: 'Grecia' },
  { name: 'Athens',              country: 'Grecia' },
  { name: 'Auckland',            country: 'Nueva Zelanda' },
  { name: 'Bagdad',              country: 'Irak' },
  { name: 'Baghdad',             country: 'Irak' },
  { name: 'Baku',                country: 'Azerbaiyán' },
  { name: 'Bangkok',             country: 'Tailandia' },
  { name: 'Barcelona',           country: 'España' },
  { name: 'Barranquilla',        country: 'Colombia' },
  { name: 'Beirut',              country: 'Líbano' },
  { name: 'Belgrado',            country: 'Serbia' },
  { name: 'Belgrade',            country: 'Serbia' },
  { name: 'Berlín',              country: 'Alemania' },
  { name: 'Berlin',              country: 'Alemania' },
  { name: 'Berna',               country: 'Suiza' },
  { name: 'Bogotá',              country: 'Colombia' },
  { name: 'Bratislava',          country: 'Eslovaquia' },
  { name: 'Brisbane',            country: 'Australia' },
  { name: 'Bruselas',            country: 'Bélgica' },
  { name: 'Brussels',            country: 'Bélgica' },
  { name: 'Bucarest',            country: 'Rumania' },
  { name: 'Bucharest',           country: 'Rumania' },
  { name: 'Budapest',            country: 'Hungría' },
  { name: 'Buenos Aires',        country: 'Argentina' },
  { name: 'El Cairo',            country: 'Egipto' },
  { name: 'Cairo',               country: 'Egipto' },
  { name: 'Calcuta',             country: 'India' },
  { name: 'Calgary',             country: 'Canadá' },
  { name: 'Cancún',              country: 'México' },
  { name: 'Cape Town',           country: 'Sudáfrica' },
  { name: 'Caracas',             country: 'Venezuela' },
  { name: 'Cartagena',           country: 'Colombia' },
  { name: 'Casablanca',          country: 'Marruecos' },
  { name: 'Chennai',             country: 'India' },
  { name: 'Chicago',             country: 'Estados Unidos' },
  { name: 'Ciudad de Guatemala', country: 'Guatemala' },
  { name: 'Ciudad de México',    country: 'México' },
  { name: 'Ciudad del Cabo',     country: 'Sudáfrica' },
  { name: 'Colombo',             country: 'Sri Lanka' },
  { name: 'Copenhague',          country: 'Dinamarca' },
  { name: 'Copenhagen',          country: 'Dinamarca' },
  { name: 'Córdoba',             country: 'Argentina' },
  { name: 'Córdoba',             country: 'España' },
  { name: 'Dakar',               country: 'Senegal' },
  { name: 'Damasco',             country: 'Siria' },
  { name: 'Damascus',            country: 'Siria' },
  { name: 'Delhi',               country: 'India' },
  { name: 'Denver',              country: 'Estados Unidos' },
  { name: 'Doha',                country: 'Catar' },
  { name: 'Dubái',               country: 'Emiratos Árabes Unidos' },
  { name: 'Dubai',               country: 'Emiratos Árabes Unidos' },
  { name: 'Dublín',              country: 'Irlanda' },
  { name: 'Dublin',              country: 'Irlanda' },
  { name: 'Durban',              country: 'Sudáfrica' },
  { name: 'Düsseldorf',          country: 'Alemania' },
  { name: 'Edmonton',            country: 'Canadá' },
  { name: 'Estambul',            country: 'Turquía' },
  { name: 'Istanbul',            country: 'Turquía' },
  { name: 'Filadelfia',          country: 'Estados Unidos' },
  { name: 'Philadelphia',        country: 'Estados Unidos' },
  { name: 'Florencia',           country: 'Italia' },
  { name: 'Florence',            country: 'Italia' },
  { name: 'Frankfurt',           country: 'Alemania' },
  { name: 'Ginebra',             country: 'Suiza' },
  { name: 'Geneva',              country: 'Suiza' },
  { name: 'Glasgow',             country: 'Reino Unido' },
  { name: 'Guadalajara',         country: 'México' },
  { name: 'Guadalajara',         country: 'España' },
  { name: 'Guayaquil',           country: 'Ecuador' },
  { name: 'La Habana',           country: 'Cuba' },
  { name: 'Havana',              country: 'Cuba' },
  { name: 'Hamburgo',            country: 'Alemania' },
  { name: 'Hamburg',             country: 'Alemania' },
  { name: 'Hanói',               country: 'Vietnam' },
  { name: 'Hanoi',               country: 'Vietnam' },
  { name: 'Helsinki',            country: 'Finlandia' },
  { name: 'Hong Kong',           country: 'China' },
  { name: 'Houston',             country: 'Estados Unidos' },
  { name: 'Hyderabad',           country: 'India' },
  { name: 'Islamabad',           country: 'Pakistán' },
  { name: 'Jacarta',             country: 'Indonesia' },
  { name: 'Jakarta',             country: 'Indonesia' },
  { name: 'Johannesburgo',       country: 'Sudáfrica' },
  { name: 'Johannesburg',        country: 'Sudáfrica' },
  { name: 'Kabul',               country: 'Afganistán' },
  { name: 'Karachi',             country: 'Pakistán' },
  { name: 'Katmandú',            country: 'Nepal' },
  { name: 'Kathmandu',           country: 'Nepal' },
  { name: 'Kiev',                country: 'Ucrania' },
  { name: 'Kinshasa',            country: 'Congo' },
  { name: 'Kuala Lumpur',        country: 'Malasia' },
  { name: 'Lagos',               country: 'Nigeria' },
  { name: 'La Paz',              country: 'Bolivia' },
  { name: 'Lima',                country: 'Perú' },
  { name: 'Lisboa',              country: 'Portugal' },
  { name: 'Lisbon',              country: 'Portugal' },
  { name: 'Ljubljana',           country: 'Eslovenia' },
  { name: 'Londres',             country: 'Reino Unido' },
  { name: 'London',              country: 'Reino Unido' },
  { name: 'Los Ángeles',         country: 'Estados Unidos' },
  { name: 'Los Angeles',         country: 'Estados Unidos' },
  { name: 'Luanda',              country: 'Angola' },
  { name: 'Luxemburgo',          country: 'Luxemburgo' },
  { name: 'Luxembourg',          country: 'Luxemburgo' },
  { name: 'Madrid',              country: 'España' },
  { name: 'Managua',             country: 'Nicaragua' },
  { name: 'Manila',              country: 'Filipinas' },
  { name: 'Marrakech',           country: 'Marruecos' },
  { name: 'Medellín',            country: 'Colombia' },
  { name: 'Melbourne',           country: 'Australia' },
  { name: 'Mexico City',         country: 'México' },
  { name: 'Miami',               country: 'Estados Unidos' },
  { name: 'Milán',               country: 'Italia' },
  { name: 'Milan',               country: 'Italia' },
  { name: 'Minsk',               country: 'Bielorrusia' },
  { name: 'Montevideo',          country: 'Uruguay' },
  { name: 'Montreal',            country: 'Canadá' },
  { name: 'Moscú',               country: 'Rusia' },
  { name: 'Moscow',              country: 'Rusia' },
  { name: 'Mumbai',              country: 'India' },
  { name: 'Múnich',              country: 'Alemania' },
  { name: 'Munich',              country: 'Alemania' },
  { name: 'Nairobi',             country: 'Kenia' },
  { name: 'Nápoles',             country: 'Italia' },
  { name: 'Naples',              country: 'Italia' },
  { name: 'Nashville',           country: 'Estados Unidos' },
  { name: 'Nueva Delhi',         country: 'India' },
  { name: 'New Delhi',           country: 'India' },
  { name: 'Nueva Orleans',       country: 'Estados Unidos' },
  { name: 'New Orleans',         country: 'Estados Unidos' },
  { name: 'Nueva York',          country: 'Estados Unidos' },
  { name: 'New York',            country: 'Estados Unidos' },
  { name: 'Osaka',               country: 'Japón' },
  { name: 'Oslo',                country: 'Noruega' },
  { name: 'Ottawa',              country: 'Canadá' },
  { name: 'Panamá',              country: 'Panamá' },
  { name: 'París',               country: 'Francia' },
  { name: 'Paris',               country: 'Francia' },
  { name: 'Pekín',               country: 'China' },
  { name: 'Beijing',             country: 'China' },
  { name: 'Perth',               country: 'Australia' },
  { name: 'Porto Alegre',        country: 'Brasil' },
  { name: 'Praga',               country: 'República Checa' },
  { name: 'Prague',              country: 'República Checa' },
  { name: 'Quito',               country: 'Ecuador' },
  { name: 'Riga',                country: 'Letonia' },
  { name: 'Río de Janeiro',      country: 'Brasil' },
  { name: 'Rio de Janeiro',      country: 'Brasil' },
  { name: 'Roma',                country: 'Italia' },
  { name: 'Rome',                country: 'Italia' },
  { name: 'Rosario',             country: 'Argentina' },
  { name: 'Rotterdam',           country: 'Países Bajos' },
  { name: 'Saint Petersburg',    country: 'Rusia' },
  { name: 'San Francisco',       country: 'Estados Unidos' },
  { name: 'San José',            country: 'Costa Rica' },
  { name: 'San Juan',            country: 'Puerto Rico' },
  { name: 'San Petersburgo',     country: 'Rusia' },
  { name: 'San Salvador',        country: 'El Salvador' },
  { name: 'Santiago',            country: 'Chile' },
  { name: 'Santiago de Chile',   country: 'Chile' },
  { name: 'Santo Domingo',       country: 'República Dominicana' },
  { name: 'São Paulo',           country: 'Brasil' },
  { name: 'Seattle',             country: 'Estados Unidos' },
  { name: 'Seúl',                country: 'Corea del Sur' },
  { name: 'Seoul',               country: 'Corea del Sur' },
  { name: 'Shanghái',            country: 'China' },
  { name: 'Shanghai',            country: 'China' },
  { name: 'Singapur',            country: 'Singapur' },
  { name: 'Singapore',           country: 'Singapur' },
  { name: 'Sofía',               country: 'Bulgaria' },
  { name: 'Sofia',               country: 'Bulgaria' },
  { name: 'Sídney',              country: 'Australia' },
  { name: 'Sydney',              country: 'Australia' },
  { name: 'Taipéi',              country: 'Taiwán' },
  { name: 'Taipei',              country: 'Taiwán' },
  { name: 'Tallin',              country: 'Estonia' },
  { name: 'Tallinn',             country: 'Estonia' },
  { name: 'Tbilisi',             country: 'Georgia' },
  { name: 'Tegucigalpa',         country: 'Honduras' },
  { name: 'Teherán',             country: 'Irán' },
  { name: 'Tehran',              country: 'Irán' },
  { name: 'Tel Aviv',            country: 'Israel' },
  { name: 'Tokio',               country: 'Japón' },
  { name: 'Tokyo',               country: 'Japón' },
  { name: 'Toronto',             country: 'Canadá' },
  { name: 'Túnez',               country: 'Túnez' },
  { name: 'Tunis',               country: 'Túnez' },
  { name: 'Valencia',            country: 'España' },
  { name: 'Valencia',            country: 'Venezuela' },
  { name: 'Vancouver',           country: 'Canadá' },
  { name: 'Varsovia',            country: 'Polonia' },
  { name: 'Warsaw',              country: 'Polonia' },
  { name: 'Venecia',             country: 'Italia' },
  { name: 'Venice',              country: 'Italia' },
  { name: 'Viena',               country: 'Austria' },
  { name: 'Vienna',              country: 'Austria' },
  { name: 'Vilna',               country: 'Lituania' },
  { name: 'Vilnius',             country: 'Lituania' },
  { name: 'Washington D.C.',     country: 'Estados Unidos' },
  { name: 'Yereván',             country: 'Armenia' },
  { name: 'Yerevan',             country: 'Armenia' },
  { name: 'Zagreb',              country: 'Croacia' },
  { name: 'Zúrich',              country: 'Suiza' },
  { name: 'Zurich',              country: 'Suiza' },
];

function normalizarTexto(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function getPaisesPorCiudad(cityName: string, extra: CityEntry[] = []): string[] {
  const norm = normalizarTexto(cityName);
  return [...new Set(
    [...CIUDADES, ...extra]
      .filter(c => normalizarTexto(c.name) === norm)
      .map(c => c.country)
  )];
}

// ─── GEOCODING (Nominatim) ────────────────────────────────────────────────────

async function geocodeNominatim(query: string, limit: number): Promise<GeoOpcion[]> {
  const q = encodeURIComponent(query);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=${limit}`,
    { headers: { 'User-Agent': 'MyWorldXP/1.0', 'Accept-Language': 'es' } }
  );
  return res.json();
}

// ─── DROPDOWN LIST COMPONENT ──────────────────────────────────────────────────

const DropdownList = ({
  items,
  selected,
  onSelect,
}: {
  items: DropItem[];
  selected: string;
  onSelect: (value: string) => void;
}) => {
  const listRef = useRef<ScrollView>(null);

  useEffect(() => {
    const idx = items.findIndex((item) => item.value === selected);
    if (idx > 1) {
      setTimeout(() => {
        listRef.current?.scrollTo({ y: (idx - 1) * 47, animated: false });
      }, 60);
    }
  }, []);

  return (
    <View style={styles.dropList}>
      <ScrollView
        ref={listRef}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item) => {
          const isSel = item.value === selected;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.dropListItem, isSel && styles.dropListItemSelected]}
              onPress={() => onSelect(item.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropListText, isSel && styles.dropListTextSelected]}>
                {item.label}
              </Text>
              {isSel && <Text style={styles.dropListCheck}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// ─── FOTO PICKER MODAL ────────────────────────────────────────────────────────

function FotoPickerModal({
  visible,
  fotosDisponibles,
  huboFotosPreseleccionadas = true,
  fotosActuales,
  maxSeleccion,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  fotosDisponibles: string[];
  huboFotosPreseleccionadas?: boolean;
  fotosActuales: string[];
  maxSeleccion: number;
  onConfirm: (uris: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setSelected(fotosActuales.filter(u => fotosDisponibles.includes(u)));
    }
  }, [visible]);

  function toggleFoto(uri: string) {
    setSelected(prev => {
      if (prev.includes(uri)) return prev.filter(u => u !== uri);
      if (prev.length >= maxSeleccion) return prev;
      return [...prev, uri];
    });
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerModal}>
        <View style={styles.pickerHeader}>
          <TouchableOpacity onPress={onClose} style={styles.pickerHeaderBtn}>
            <Text style={styles.pickerCancelText}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.pickerTitle}>Fotos del viaje</Text>
          <TouchableOpacity onPress={() => onConfirm(selected)} style={styles.pickerHeaderBtn}>
            <Text style={[styles.pickerConfirmText, selected.length === 0 && { opacity: 0.45 }]}>
              Listo ({selected.length})
            </Text>
          </TouchableOpacity>
        </View>

        {fotosDisponibles.length === 0 ? (
          <View style={styles.pickerEmpty}>
            <Text style={styles.pickerEmptyText}>
              {huboFotosPreseleccionadas
                ? 'Todas las fotos preseleccionadas ya están asignadas a otros destinos de este viaje.'
                : 'Todavía no preseleccionaste fotos para este viaje.\nUsá "Seleccionar fotos del viaje" para agregar.'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.pickerHint}>
              Seleccioná hasta {maxSeleccion} foto{maxSeleccion !== 1 ? 's' : ''} para este destino
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.pickerGrid}>
                {fotosDisponibles.map((uri) => {
                  const isSel = selected.includes(uri);
                  const atLimit = !isSel && selected.length >= maxSeleccion;
                  return (
                    <TouchableOpacity
                      key={uri}
                      onPress={() => { if (!atLimit) toggleFoto(uri); }}
                      activeOpacity={atLimit ? 1 : 0.85}
                      style={[
                        styles.pickerThumbWrap,
                        { width: PICKER_THUMB_SIZE, height: PICKER_THUMB_SIZE },
                        isSel && styles.pickerThumbWrapSelected,
                      ]}
                    >
                      <Image
                        source={{ uri }}
                        style={[styles.pickerThumb, atLimit && { opacity: 0.35 }]}
                      />
                      {isSel && (
                        <View style={styles.pickerCheckBadge}>
                          <Text style={styles.pickerCheckText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
}

// ─── DESTINO HELPERS ─────────────────────────────────────────────────────────

function toRoman(n: number): string {
  const r = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
  return r[n - 1] ?? String(n);
}

function createDestino(): DestinoState {
  const today = new Date();
  return {
    id: genId(),
    ciudad: '', pais: '',
    coords: null,
    geoStatus: 'idle', geoNombre: '', geoOpciones: [], geoSoloPais: false,
    dia: String(today.getDate()),
    mes: String(today.getMonth() + 1),
    anio: String(today.getFullYear()),
    nota: '', fotos: [], portada: null,
    ciudadSugs: [],
    openDropdown: null,
  };
}

// ─── DESTINO BLOCK COMPONENT ──────────────────────────────────────────────────

function DestinoBlock({
  destino, index, tipo, learnedCities, onChange, onLearnCity, scrollRef, fotosViaje, fotosUsadasPorOtros,
}: {
  destino: DestinoState;
  index: number;
  tipo: TripType;
  learnedCities: CityEntry[];
  onChange: (patch: Partial<DestinoState>) => void;
  onLearnCity: (nombre: string, pais: string) => void;
  scrollRef: React.RefObject<any>;
  fotosViaje?: string[];
  fotosUsadasPorOtros?: string[];
}) {
  const dateSectionY = useRef(0);
  const blockY = useRef(0);
  const [pickerVisible, setPickerVisible] = useState(false);
  // Fotos del pool del viaje que todavía no fueron asignadas a NINGÚN OTRO destino de la cadena.
  const fotosDisponiblesPickerBlock = fotosViaje
    ? fotosViaje.filter((uri) => !(fotosUsadasPorOtros ?? []).includes(uri))
    : undefined;

  function handleCiudadChange(t: string) {
    const patch: Partial<DestinoState> = { ciudad: t };
    if (destino.geoStatus !== 'idle' && destino.geoStatus !== 'buscando') {
      patch.coords = null; patch.geoStatus = 'idle'; patch.geoNombre = ''; patch.geoOpciones = []; patch.geoSoloPais = false;
    }
    if (t.trim().length > 0) {
      const lower = t.trim().toLowerCase();
      const seen = new Set<string>();
      const matches: string[] = [];
      for (const c of [...CIUDADES, ...learnedCities]) {
        if (c.name.toLowerCase().includes(lower) && !seen.has(c.name)) {
          seen.add(c.name); matches.push(c.name);
          if (matches.length === 8) break;
        }
      }
      patch.ciudadSugs = matches;
    } else {
      patch.ciudadSugs = [];
    }
    onChange(patch);
  }

  function selectCiudad(name: string) {
    const patch: Partial<DestinoState> = { ciudad: name, ciudadSugs: [] };
    if (destino.geoStatus !== 'idle' && destino.geoStatus !== 'buscando') {
      patch.coords = null; patch.geoStatus = 'idle'; patch.geoNombre = ''; patch.geoOpciones = []; patch.geoSoloPais = false;
    }
    const paises = getPaisesPorCiudad(name, learnedCities);
    if (paises.length === 1 && !destino.pais.trim()) patch.pais = paises[0];
    onChange(patch);
  }

  function handlePaisChange(t: string) {
    const patch: Partial<DestinoState> = { pais: t };
    if (destino.geoStatus !== 'idle' && destino.geoStatus !== 'buscando') {
      patch.coords = null; patch.geoStatus = 'idle'; patch.geoNombre = ''; patch.geoOpciones = []; patch.geoSoloPais = false;
    }
    onChange(patch);
  }

  async function buscarUbicacion() {
    if (!destino.ciudad.trim() || !destino.pais.trim()) {
      Alert.alert('Faltan datos', 'Ingresá ciudad y país antes de validar el destino.');
      return;
    }
    onChange({ geoStatus: 'buscando', coords: null, geoNombre: '', geoOpciones: [], geoSoloPais: false });
    try {
      const data = await geocodeNominatim(`${destino.ciudad.trim()}, ${destino.pais.trim()}`, 5);
      if (data.length === 1) {
        onChange({
          coords: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) },
          geoNombre: data[0].display_name,
          geoStatus: 'encontrada',
          geoOpciones: [],
        });
        onLearnCity(destino.ciudad.trim(), destino.pais.trim());
      } else if (data.length > 1) {
        onChange({ geoStatus: 'multiples', geoOpciones: data });
      } else {
        onChange({ geoStatus: 'no_encontrada', geoOpciones: [] });
      }
    } catch {
      onChange({ geoStatus: 'error', geoOpciones: [] });
    }
  }

  function elegirOtraCiudad() {
    onChange({ geoStatus: 'idle', coords: null, geoNombre: '', geoOpciones: [], geoSoloPais: false });
  }

  async function confirmarSoloPais() {
    onChange({ geoStatus: 'buscando' });
    try {
      const data = await geocodeNominatim(destino.pais.trim(), 1);
      if (data.length > 0) {
        onChange({
          coords: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) },
          geoNombre: `${destino.ciudad.trim()}, ${destino.pais.trim()}`,
          geoStatus: 'encontrada',
          geoOpciones: [],
          geoSoloPais: true,
        });
      } else {
        Alert.alert('País no encontrado', 'No pudimos validar el país ingresado. Revisalo e intentá de nuevo.');
        onChange({ geoStatus: 'no_encontrada' });
      }
    } catch {
      onChange({ geoStatus: 'error' });
    }
  }

  function toggleDrop(key: 'dia' | 'mes' | 'anio') {
    Keyboard.dismiss();
    const patch: Partial<DestinoState> = {};
    if (destino.openDropdown !== key && !destino.dia && !destino.mes && !destino.anio) {
      const today = new Date();
      patch.dia = String(today.getDate());
      patch.mes = String(today.getMonth() + 1);
      patch.anio = String(today.getFullYear());
    }
    const opening = destino.openDropdown !== key;
    patch.openDropdown = opening ? key : null;
    onChange(patch);
    if (opening) {
      setTimeout(() => {
        scrollRef.current?.scrollToPosition?.(0, blockY.current + dateSectionY.current - 20, true);
      }, 80);
    }
  }

  async function handleCargarFotosBlock() {
    if (destino.fotos.length >= 4) {
      Alert.alert('Máximo 4 fotos', 'Ya cargaste el máximo de fotos permitidas.');
      return;
    }
    if (fotosViaje !== undefined) {
      setPickerVisible(true);
      return;
    }
    Alert.alert('Cargar fotos', '', [
      { text: 'Elegir de galería', onPress: pickImagesBlock },
      { text: 'Tomar foto', onPress: takePhotoBlock },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function pickImagesBlock() {
    if (destino.fotos.length >= 4) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.'); return; }
    const remaining = 4 - destino.fotos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8, allowsMultipleSelection: true, selectionLimit: remaining,
    });
    if (!result.canceled && result.assets.length > 0) {
      onChange({ fotos: [...destino.fotos, ...result.assets.map((a) => a.uri)].slice(0, 4) });
      setTimeout(() => { scrollRef.current?.scrollToPosition?.(0, blockY.current - 20, true); }, 80);
    }
  }

  async function takePhotoBlock() {
    if (destino.fotos.length >= 4) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso necesario', 'Necesitamos acceso a tu cámara.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      onChange({ fotos: [...destino.fotos, result.assets[0].uri] });
      setTimeout(() => { scrollRef.current?.scrollToPosition?.(0, blockY.current - 20, true); }, 80);
    }
  }

  const diaLabel = destino.dia ? destino.dia.padStart(2, '0') : '';
  const mesLabel = destino.mes ? (MONTHS.find((m) => m.value === destino.mes)?.label ?? '') : '';
  const anioLabel = destino.anio || '';

  return (
    <>
    <View style={styles.destinoBlock} onLayout={(e) => { blockY.current = e.nativeEvent.layout.y; }}>
      <Text style={styles.destinoBlockTitle}>Destino {toRoman(index + 1)}</Text>

      {/* Destino */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Destino</Text>
        <View style={styles.sugContainer}>
          <TextInput
            style={[styles.input, { marginBottom: destino.ciudadSugs.length > 0 ? 0 : 10 }]}
            placeholder="Ciudad"
            placeholderTextColor={MUTED}
            value={destino.ciudad}
            onChangeText={handleCiudadChange}
            onBlur={() => setTimeout(() => onChange({ ciudadSugs: [] }), 150)}
            returnKeyType="next"
          />
          {destino.ciudadSugs.length > 0 && (
            <View style={styles.sugList}>
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {destino.ciudadSugs.map((item) => (
                  <TouchableOpacity key={item} style={styles.sugItem} onPress={() => selectCiudad(item)} activeOpacity={0.7}>
                    <Text style={styles.sugText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
        <View style={styles.sugContainer}>
          <TextInput
            style={styles.input}
            placeholder="País"
            placeholderTextColor={MUTED}
            value={destino.pais}
            onChangeText={handlePaisChange}
            returnKeyType="done"
          />
        </View>
        <TouchableOpacity
          style={[
            styles.outlineBtn,
            destino.geoStatus === 'buscando' && styles.outlineBtnDisabled,
            destino.geoStatus === 'encontrada' && styles.outlineBtnValidated,
          ]}
          onPress={buscarUbicacion}
          activeOpacity={0.8}
          disabled={destino.geoStatus === 'buscando'}
        >
          <Text style={[
            styles.outlineBtnText,
            destino.geoStatus === 'encontrada' && styles.outlineBtnTextValidated,
            (destino.geoStatus === 'no_encontrada' || destino.geoStatus === 'error') && styles.outlineBtnTextError,
          ]}>
            {destino.geoStatus === 'buscando' ? 'Validando...'
              : destino.geoStatus === 'encontrada' ? 'OK'
              : destino.geoStatus === 'no_encontrada' ? 'No encontrada — intentá de nuevo'
              : destino.geoStatus === 'error' ? 'Error al validar — intentá de nuevo'
              : destino.geoStatus === 'multiples' ? 'Varias coincidencias — elegí una'
              : 'VALIDAR'}
          </Text>
        </TouchableOpacity>
        {destino.geoStatus === 'error' && (
          <View style={styles.geoNotFound}>
            <Text style={styles.geoNotFoundText}>
              Error al conectar. Verificá tu conexión e intentá de nuevo.
            </Text>
          </View>
        )}
        {destino.geoStatus === 'no_encontrada' && (
          <View style={styles.geoNotFound}>
            <Text style={styles.geoNotFoundText}>No encontramos la ciudad ingresada.</Text>
            <View style={styles.geoNotFoundActions}>
              <TouchableOpacity style={styles.geoActionBtn} onPress={elegirOtraCiudad} activeOpacity={0.8}>
                <Text style={styles.geoActionBtnText}>Elegir otra ciudad</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.geoActionBtn, styles.geoActionBtnPrimary]}
                onPress={confirmarSoloPais}
                activeOpacity={0.8}
              >
                <Text style={[styles.geoActionBtnText, styles.geoActionBtnTextPrimary]}>
                  Confirmar solo con el país
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {destino.geoStatus === 'multiples' && destino.geoOpciones.length > 0 && (
          <View style={styles.sugList}>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {destino.geoOpciones.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.sugItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    onChange({
                      coords: { lat: parseFloat(opt.lat), lng: parseFloat(opt.lon) },
                      geoNombre: opt.display_name,
                      geoStatus: 'encontrada',
                      geoOpciones: [],
                    });
                    onLearnCity(destino.ciudad.trim(), destino.pais.trim());
                  }}
                >
                  <Text style={styles.sugText}>{opt.display_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Fotos */}
      {tipo === 'real' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Fotos ({destino.fotos.length}/4)</Text>
          {destino.fotos.length < 4 && (
            <TouchableOpacity style={styles.photoCard} onPress={handleCargarFotosBlock} activeOpacity={0.8}>
              <Text style={styles.photoCardIcon}>✦</Text>
              <Text style={styles.photoCardText}>Agregar fotos</Text>
              <Text style={styles.photoCardHint}>{fotosViaje !== undefined ? 'Del viaje' : 'Galería · Cámara'}</Text>
            </TouchableOpacity>
          )}
          {destino.fotos.length > 0 && (
            <View style={styles.photosRow}>
              {destino.fotos.map((uri, i) => {
                const isPortada = destino.portada ? uri === destino.portada : i === 0;
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.9}
                    onLongPress={() => {
                      Alert.alert(
                        '¿Portada?',
                        '¿Deseás asignar esta foto como portada?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Asignar', onPress: () => onChange({ portada: uri }) },
                        ]
                      );
                    }}
                    style={styles.photoWrapper}
                  >
                    <Image source={{ uri }} style={styles.photoThumb} />
                    {isPortada && (
                      <View style={styles.photoCoverBadge}>
                        <Text style={styles.photoCoverText}>Portada</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => {
                        onChange({
                          fotos: destino.fotos.filter((_, fi) => fi !== i),
                          ...(destino.portada === uri ? { portada: null } : {}),
                        });
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.photoRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {destino.fotos.length === 0 && (
            <Text style={styles.photoHint}>La primera foto será la portada del viaje.</Text>
          )}
        </View>
      )}

      {/* Fecha */}
      {tipo === 'real' && (
        <View style={styles.section} onLayout={(e) => { dateSectionY.current = e.nativeEvent.layout.y; }}>
          <Text style={styles.sectionLabel}>Fecha de inicio</Text>
          <View style={styles.dropRow}>
            <TouchableOpacity
              style={[styles.dropBtn, destino.openDropdown === 'dia' && styles.dropBtnOpen, { flex: 1 }]}
              onPress={() => toggleDrop('dia')}
              activeOpacity={0.8}
            >
              <Text style={[styles.dropBtnText, !diaLabel && styles.dropBtnPlaceholder]}>{diaLabel || 'DD'}</Text>
              <Text style={styles.dropChevron}>{destino.openDropdown === 'dia' ? '▴' : '▾'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropBtn, destino.openDropdown === 'mes' && styles.dropBtnOpen, { flex: 2 }]}
              onPress={() => toggleDrop('mes')}
              activeOpacity={0.8}
            >
              <Text style={[styles.dropBtnText, !mesLabel && styles.dropBtnPlaceholder]}>{mesLabel || 'Mes'}</Text>
              <Text style={styles.dropChevron}>{destino.openDropdown === 'mes' ? '▴' : '▾'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dropBtn, destino.openDropdown === 'anio' && styles.dropBtnOpen, { flex: 1.5 }]}
              onPress={() => toggleDrop('anio')}
              activeOpacity={0.8}
            >
              <Text style={[styles.dropBtnText, !anioLabel && styles.dropBtnPlaceholder]}>{anioLabel || 'AAAA'}</Text>
              <Text style={styles.dropChevron}>{destino.openDropdown === 'anio' ? '▴' : '▾'}</Text>
            </TouchableOpacity>
          </View>
          {destino.openDropdown === 'dia' && (
            <DropdownList
              items={DAYS}
              selected={destino.dia}
              onSelect={(v) => { onChange({ dia: v, openDropdown: null }); playSound('tic'); }}
            />
          )}
          {destino.openDropdown === 'mes' && (
            <DropdownList
              items={MONTHS}
              selected={destino.mes}
              onSelect={(v) => { onChange({ mes: v, openDropdown: null }); playSound('tic'); }}
            />
          )}
          {destino.openDropdown === 'anio' && (
            <DropdownList
              items={YEARS}
              selected={destino.anio}
              onSelect={(v) => { onChange({ anio: v, openDropdown: null }); playSound('tic'); }}
            />
          )}
        </View>
      )}

      {/* Nota */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Nota <Text style={styles.optional}>(opcional)</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Contá algo de este destino..."
          placeholderTextColor={MUTED}
          value={destino.nota}
          onChangeText={(t) => onChange({ nota: t })}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.notaCounter}>{destino.nota.length}/1000</Text>
      </View>
    </View>
    {fotosViaje !== undefined && (
      <FotoPickerModal
        visible={pickerVisible}
        fotosDisponibles={fotosDisponiblesPickerBlock ?? []}
        huboFotosPreseleccionadas={fotosViaje.length > 0}
        fotosActuales={destino.fotos}
        maxSeleccion={Math.max(0, 4 - destino.fotos.length)}
        onConfirm={(uris) => {
          const newPortada = destino.portada && uris.includes(destino.portada) ? destino.portada : null;
          onChange({ fotos: uris, portada: newPortada });
          setPickerVisible(false);
          setTimeout(() => { scrollRef.current?.scrollToPosition?.(0, blockY.current - 20, true); }, 80);
        }}
        onClose={() => { setPickerVisible(false); setTimeout(() => { scrollRef.current?.scrollToPosition?.(0, blockY.current - 20, true); }, 80); }}
      />
    )}
    </>
  );
}

// ─── TOGGLE CONSTANTS ─────────────────────────────────────────────────────────

const TRACK_W = 64;
const THUMB_D = 28;
const THUMB_TRAVEL = TRACK_W - THUMB_D - 4;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function CargarViaje() {
  // Parámetros opcionales cuando se llega desde el mapa (pin wishlist)
  const {
    ciudad: pCiudad = '',
    pais: pPais = '',
    lat: pLat = '',
    lng: pLng = '',
    wishlistId: pWishlistId = '',
  } = useLocalSearchParams<{
    ciudad?: string;
    pais?: string;
    lat?: string;
    lng?: string;
    wishlistId?: string;
  }>();
  const hasParamCoords = !!(pLat && pLng);

  const [tipo, setTipo] = useState<TripType>('real');
  const [ciudad, setCiudad] = useState(pCiudad);
  const [pais, setPais] = useState(pPais);
  const _today = new Date();
  const [dia, setDia] = useState(String(_today.getDate()));
  const [mes, setMes] = useState(String(_today.getMonth() + 1));
  const [anio, setAnio] = useState(String(_today.getFullYear()));
  const [openDropdown, setOpenDropdown] = useState<'dia' | 'mes' | 'anio' | null>(null);
  const [nota, setNota] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [portadaUri, setPortadaUri] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    hasParamCoords ? { lat: parseFloat(pLat), lng: parseFloat(pLng) } : null
  );
  const [geoStatus, setGeoStatus] = useState<'idle' | 'buscando' | 'encontrada' | 'no_encontrada' | 'error' | 'multiples'>(
    hasParamCoords ? 'encontrada' : 'idle'
  );
  const [geoNombre, setGeoNombre] = useState('');
  const [geoOpciones, setGeoOpciones] = useState<GeoOpcion[]>([]);
  const [geoSoloPais, setGeoSoloPais] = useState(false);
  const [ciudadSugs, setCiudadSugs] = useState<string[]>([]);
  const [learnedCities, setLearnedCities] = useState<CityEntry[]>([]);
  const [cantCiudades, setCantCiudades] = useState<'una' | 'mas'>('una');
  const [destinos, setDestinos] = useState<DestinoState[]>(() => [createDestino(), createDestino()]);
  const [fotosViaje, setFotosViaje] = useState<string[]>([]);
  const [notifQueue, setNotifQueue] = useState<NotifItem[]>([]);
  const notifHeadRef = useRef<NotifItem | null>(null);
  const chainIdRef = useRef<string | null>(null);
  const scrollRef = useRef<any>(null);
  const dateSectionY = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem('learned_cities').then(raw => {
      if (raw) setLearnedCities(JSON.parse(raw));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const head = notifQueue[0] ?? null;
    if (head === notifHeadRef.current) return;
    notifHeadRef.current = head;
    if (!head) return;
    playSound(head.kind === 'levelup' ? 'subir_nivel' : 'anuncio_2');
  }, [notifQueue]);

  const toggleAnim = useRef(new Animated.Value(0)).current;

  function animateToggle(to: number) {
    Animated.spring(toggleAnim, {
      toValue: to,
      useNativeDriver: false,
      friction: 7,
      tension: 130,
    }).start();
  }

  function handleToggle(newTipo: TripType) {
    setTipo(newTipo);
    setOpenDropdown(null);
    animateToggle(newTipo === 'real' ? 0 : 1);
  }

  const thumbLeft = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, THUMB_TRAVEL],
  });

  const cantCiudadesAnim = useRef(new Animated.Value(0)).current;

  function handleToggleCantCiudades(val: 'una' | 'mas') {
    setCantCiudades(val);
    Animated.spring(cantCiudadesAnim, {
      toValue: val === 'una' ? 0 : 1,
      useNativeDriver: false,
      friction: 7,
      tension: 130,
    }).start();
  }

  const thumbLeftCant = cantCiudadesAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, THUMB_TRAVEL],
  });

  function updateDestino(idx: number, patch: Partial<DestinoState>) {
    setDestinos(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  }

  // URIs del pool de fotos del viaje ya asignadas a otros destinos de la misma cadena
  // (evita elegir por error la misma foto en dos destinos).
  function fotosUsadasPorOtrosDestinos(idx: number): string[] {
    const usadas: string[] = [];
    destinos.forEach((d, j) => { if (j !== idx) usadas.push(...d.fotos); });
    return usadas;
  }

  function agregarCiudad() {
    setDestinos(prev => {
      const last = prev[prev.length - 1];
      const next = createDestino();
      if (last?.dia && last?.mes && last?.anio) {
        next.dia = last.dia;
        next.mes = last.mes;
        next.anio = last.anio;
      }
      return [...prev, next];
    });
  }

  async function seleccionarFotosDelViaje() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 50,
    });
    if (!result.canceled && result.assets.length > 0) {
      setFotosViaje(result.assets.map(a => a.uri));
    }
  }

  async function handleFinalizarViaje() {
    for (let i = 0; i < destinos.length; i++) {
      const d = destinos[i];
      if (!d.ciudad.trim()) {
        Alert.alert('Falta información', `Destino ${toRoman(i + 1)}: la ciudad es obligatoria.`);
        return;
      }
      if (!d.pais.trim()) {
        Alert.alert('Falta información', `Destino ${toRoman(i + 1)}: el país es obligatorio.`);
        return;
      }
      if (!d.coords) {
        Alert.alert('Destino sin validar', `Destino ${toRoman(i + 1)}: presioná "VALIDAR" antes de guardar.`);
        return;
      }
      if (tipo === 'real' && (!d.dia.trim() || !d.mes.trim() || !d.anio.trim())) {
        Alert.alert('Falta información', `Destino ${toRoman(i + 1)}: la fecha es obligatoria.`);
        return;
      }
      if (tipo === 'real' && !isValidCalendarDate(d.dia, d.mes, d.anio)) {
        Alert.alert('Fecha inválida', `Destino ${toRoman(i + 1)}: la fecha ingresada no existe. Revisala e intentá de nuevo.`);
        return;
      }
      if (tipo === 'real' && isFutureDate(d.dia, d.mes, d.anio)) {
        Alert.alert('Fecha inválida', `Destino ${toRoman(i + 1)}: un viaje realizado no puede tener una fecha posterior a hoy.`);
        return;
      }
    }

    if (tipo === 'real' && destinos.length > 1 && hayBrechaExcesiva(destinos)) {
      Alert.alert(
        'Viaje multidestino',
        'Hay más de 30 días entre algunos destinos de este viaje multidestino. ¿Querés revisar las fechas o guardar igualmente?',
        [
          { text: 'Revisar', style: 'cancel' },
          { text: 'Guardar igualmente', onPress: () => guardarMultidestino() },
        ]
      );
      return;
    }
    await guardarMultidestino();
  }

  async function guardarMultidestino() {
    Keyboard.dismiss();
    // Misma residencia (si aplica) para todos los destinos de esta cadena: representa
    // el kilómetro cero vigente al momento de crear el viaje completo.
    const origen = tipo === 'real' ? await getResidenciaValidada() : null;
    if (tipo === 'real' && !origen) {
      Alert.alert(
        'Residencia requerida',
        'Para calcular correctamente tus distancias, primero confirmá tu ciudad de residencia en Configuración.'
      );
      return;
    }
    try {
      console.log('[FinalizarViaje] Step 1: leyendo trips existentes');
      const rawBefore = await AsyncStorage.getItem('trips');
      const prevStats = calcularStats((rawBefore ? JSON.parse(rawBefore) : []) as StatsTrip[]);
      const chainId = genId();
      for (let di = 0; di < destinos.length; di++) {
        const d = destinos[di];
        console.log(`[FinalizarViaje] Step 2: copiando fotos del destino ${di + 1}/${destinos.length}`);
        const finalFotos = tipo === 'real' ? await copiarAalmacenamientoPersistente(d.fotos) : [];
        console.log(`[FinalizarViaje] Step 3: armando trip del destino ${di + 1}`);
        const portadaIdxMulti = d.portada ? d.fotos.indexOf(d.portada) : -1;
        const portadaMulti = finalFotos.length > 0
          ? (portadaIdxMulti >= 0 && portadaIdxMulti < finalFotos.length ? finalFotos[portadaIdxMulti] : finalFotos[0])
          : null;
        const trip: TripData = {
          id: genId(),
          tipo,
          ciudad: d.ciudad.trim(),
          pais: d.pais.trim(),
          coords: d.coords,
          fechaInicio: tipo === 'real' ? buildFechaInicio(d.dia, d.mes, d.anio) : null,
          fotos: finalFotos,
          portada: portadaMulti,
          nota: d.nota.trim(),
          xp: 0,
          distancia: 0,
          chainId,
          origenCoords: tipo === 'real' ? origen : undefined,
        };
        console.log(`[FinalizarViaje] Step 4: guardando en AsyncStorage destino ${di + 1}`);
        await saveTrip(trip);
        console.log(`[FinalizarViaje] Destino ${di + 1} guardado OK`);
      }
      if (pWishlistId) await deleteWishlistTrip(pWishlistId);
      setDestinos([createDestino(), createDestino()]);
      setFotosViaje([]);
      setCantCiudades('una');
      setTipo('real');
      Animated.spring(cantCiudadesAnim, { toValue: 0, useNativeDriver: false, friction: 7, tension: 130 }).start();
      Animated.spring(toggleAnim, { toValue: 0, useNativeDriver: false, friction: 7, tension: 130 }).start();
      setTimeout(() => {
        scrollRef.current?.scrollToPosition?.(0, 0, false);
        scrollRef.current?.scrollTo?.({ x: 0, y: 0, animated: false });
      }, 50);
      playSound('cargar');
      Alert.alert('¡Guardado!', `Tu viaje con ${destinos.length} ciudades fue guardado correctamente.`);
      _checkAchievements(prevStats.rangoActual);
    } catch (err) {
      console.error('[FinalizarViaje] ERROR COMPLETO al guardar:', err);
      Alert.alert('Error', 'No se pudo guardar. Intentá de nuevo.');
    }
  }

  function handleCiudadChange(t: string) {
    setCiudad(t);
    if (geoStatus !== 'idle' && geoStatus !== 'buscando') resetGeo();
    if (t.trim().length > 0) {
      const lower = t.trim().toLowerCase();
      const seen = new Set<string>();
      const matches: string[] = [];
      for (const c of [...CIUDADES, ...learnedCities]) {
        if (c.name.toLowerCase().includes(lower) && !seen.has(c.name)) {
          seen.add(c.name);
          matches.push(c.name);
          if (matches.length === 8) break;
        }
      }
      setCiudadSugs(matches);
    } else {
      setCiudadSugs([]);
    }
  }

  function selectCiudad(name: string) {
    setCiudad(name);
    setCiudadSugs([]);
    if (geoStatus !== 'idle' && geoStatus !== 'buscando') resetGeo();
    const paises = getPaisesPorCiudad(name, learnedCities);
    if (paises.length === 1 && !pais.trim()) {
      setPais(paises[0]);
    }
  }

  function handlePaisChange(t: string) {
    setPais(t);
    if (geoStatus !== 'idle' && geoStatus !== 'buscando') resetGeo();
  }

  function resetForm() {
    setCiudad('');
    setCiudadSugs([]);
    setPais('');
    setDia('');
    setMes('');
    setAnio('');
    setOpenDropdown(null);
    setNota('');
    setFotos([]);
    setPortadaUri(null);
    setCoords(null);
    setGeoStatus('idle');
    setGeoNombre('');
    setGeoOpciones([]);
    setGeoSoloPais(false);
    setTimeout(() => {
      scrollRef.current?.scrollToPosition?.(0, 0, false);
      scrollRef.current?.scrollTo?.({ x: 0, y: 0, animated: false });
    }, 50);
  }

  async function guardarCiudadAprendida(nombre: string, paisNombre: string) {
    const normNombre = normalizarTexto(nombre);
    const normPais = normalizarTexto(paisNombre);
    const yaExiste = [...CIUDADES, ...learnedCities].some(
      c => normalizarTexto(c.name) === normNombre && normalizarTexto(c.country) === normPais
    );
    if (yaExiste) return;
    const nueva: CityEntry = { name: nombre.trim(), country: paisNombre.trim() };
    const nuevaLista = [...learnedCities, nueva];
    setLearnedCities(nuevaLista);
    try {
      await AsyncStorage.setItem('learned_cities', JSON.stringify(nuevaLista));
    } catch {
      // best-effort — no bloquea el flujo principal
    }
  }

  function resetGeo() {
    setCoords(null);
    setGeoStatus('idle');
    setGeoNombre('');
    setGeoOpciones([]);
    setGeoSoloPais(false);
  }

  async function buscarUbicacion() {
    if (!ciudad.trim() || !pais.trim()) {
      Alert.alert('Faltan datos', 'Ingresá ciudad y país antes de validar el destino.');
      return;
    }
    setGeoStatus('buscando');
    setCoords(null);
    setGeoNombre('');
    setGeoOpciones([]);
    setGeoSoloPais(false);
    try {
      const data = await geocodeNominatim(`${ciudad.trim()}, ${pais.trim()}`, 5);
      if (data.length === 1) {
        setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        setGeoNombre(data[0].display_name);
        setGeoStatus('encontrada');
        guardarCiudadAprendida(ciudad.trim(), pais.trim());
      } else if (data.length > 1) {
        setGeoStatus('multiples');
        setGeoOpciones(data);
      } else {
        setGeoStatus('no_encontrada');
      }
    } catch {
      setGeoStatus('error');
    }
  }

  function elegirOtraCiudad() {
    resetGeo();
  }

  async function confirmarSoloPais() {
    setGeoStatus('buscando');
    try {
      const data = await geocodeNominatim(pais.trim(), 1);
      if (data.length > 0) {
        setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        setGeoNombre(`${ciudad.trim()}, ${pais.trim()}`);
        setGeoStatus('encontrada');
        setGeoOpciones([]);
        setGeoSoloPais(true);
      } else {
        Alert.alert('País no encontrado', 'No pudimos validar el país ingresado. Revisalo e intentá de nuevo.');
        setGeoStatus('no_encontrada');
      }
    } catch {
      setGeoStatus('error');
    }
  }

  function handleCargarFotos() {
    if (fotos.length >= 4) {
      Alert.alert('Máximo 4 fotos', 'Ya cargaste el máximo de fotos permitidas.');
      return;
    }
    Alert.alert('Cargar fotos', '', [
      { text: 'Elegir de galería', onPress: pickImages },
      { text: 'Tomar foto', onPress: takePhoto },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function pickImages() {
    if (fotos.length >= 4) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
      return;
    }
    const remaining = 4 - fotos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled && result.assets.length > 0) {
      setFotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
    }
  }

  async function takePhoto() {
    if (fotos.length >= 4) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setFotos((prev) => [...prev, result.assets[0].uri]);
    }
  }

  function removePhoto(index: number) {
    const removedUri = fotos[index];
    setFotos((prev) => prev.filter((_, i) => i !== index));
    if (portadaUri === removedUri) setPortadaUri(null);
  }

  function validate(): boolean {
    if (!ciudad.trim()) {
      Alert.alert('Falta información', 'La ciudad es obligatoria.');
      return false;
    }
    if (!pais.trim()) {
      Alert.alert('Falta información', 'El país es obligatorio.');
      return false;
    }
    if (!coords) {
      Alert.alert('Destino sin validar', 'Presioná "VALIDAR" antes de guardar.');
      return false;
    }
    if (tipo === 'real') {
      if (!dia.trim() || !mes.trim() || !anio.trim()) {
        Alert.alert('Falta información', 'La fecha de inicio es obligatoria para viajes reales.');
        return false;
      }
      if (!isValidCalendarDate(dia, mes, anio)) {
        Alert.alert('Fecha inválida', 'La fecha ingresada no existe. Revisala e intentá de nuevo.');
        return false;
      }
      if (isFutureDate(dia, mes, anio)) {
        Alert.alert('Fecha inválida', 'Un viaje realizado no puede tener una fecha posterior a hoy.');
        return false;
      }
    }
    return true;
  }

  function buildTrip(
    chainId: string | null,
    persistedFotos: string[] | undefined,
    origen: { lat: number; lng: number } | null
  ): TripData {
    const esReal = tipo === 'real';
    const finalFotos = persistedFotos ?? (esReal ? fotos : []);
    let portada: string | null = null;
    if (finalFotos.length > 0) {
      if (portadaUri) {
        const idx = fotos.indexOf(portadaUri);
        portada = (idx >= 0 && idx < finalFotos.length) ? finalFotos[idx] : finalFotos[0];
      } else {
        portada = finalFotos[0];
      }
    }
    return {
      id: genId(),
      tipo,
      ciudad: ciudad.trim(),
      pais: pais.trim(),
      coords,
      fechaInicio: esReal ? buildFechaInicio(dia, mes, anio) : null,
      fotos: finalFotos,
      portada,
      nota: nota.trim(),
      xp: 0,
      distancia: 0,
      chainId,
      origenCoords: esReal ? origen : undefined,
    };
  }

  async function saveTrip(trip: TripData) {
    const raw = await AsyncStorage.getItem('trips');
    const existing: TripData[] = raw ? JSON.parse(raw) : [];
    existing.push(trip);
    await AsyncStorage.setItem('trips', JSON.stringify(existing));
  }

  async function deleteWishlistTrip(id: string) {
    const raw = await AsyncStorage.getItem('trips');
    const all: TripData[] = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem('trips', JSON.stringify(all.filter((t) => t.id !== id)));
  }

  async function _checkAchievements(prevRango: string) {
    try {
      const raw = await AsyncStorage.getItem('trips');
      const allTrips = raw ? JSON.parse(raw) : [];
      const stats = calcularStats(allTrips as StatsTrip[]);
      const newOnes = await checkAndSaveAchievements(allTrips as StatsTrip[], stats);
      const items: NotifItem[] = [];
      if (stats.rangoActual !== prevRango) {
        const rawUser = await AsyncStorage.getItem('userData');
        const userData = rawUser ? JSON.parse(rawUser) : {};
        items.push({
          kind: 'levelup',
          prevRango,
          newRango: stats.rangoActual,
          xpRestantes: getXpRestantes(stats.xpTotal),
          userName: userData.nombre ?? '',
        });
      }
      for (const a of newOnes) {
        items.push({ kind: 'achievement', achievement: a });
      }
      if (items.length > 0) setNotifQueue(prev => [...prev, ...items]);
    } catch {
      // silencioso — los logros no deben bloquear el flujo principal
    }
  }

  function popNotif() {
    setNotifQueue(prev => prev.slice(1));
  }

  async function handleGuardar() {
    if (!validate()) return;
    Keyboard.dismiss();
    let origen: { lat: number; lng: number } | null = null;
    if (tipo === 'real') {
      origen = await getResidenciaValidada();
      if (!origen) {
        Alert.alert(
          'Residencia requerida',
          'Para calcular correctamente tus distancias, primero confirmá tu ciudad de residencia en Configuración.'
        );
        return;
      }
    }
    try {
      console.log('[Guardar] Step 1: leyendo trips existentes');
      const rawBefore = await AsyncStorage.getItem('trips');
      const prevStats = calcularStats((rawBefore ? JSON.parse(rawBefore) : []) as StatsTrip[]);
      console.log('[Guardar] Step 2: copiando fotos (', fotos.length, ')');
      const persistedFotos = tipo === 'real' ? await copiarAalmacenamientoPersistente(fotos) : [];
      console.log('[Guardar] Step 3: armando objeto trip');
      const trip = buildTrip(null, persistedFotos, origen);
      console.log('[Guardar] Step 4: guardando en AsyncStorage');
      await saveTrip(trip);
      console.log('[Guardar] Step 5: OK — trip guardado');
      if (pWishlistId) await deleteWishlistTrip(pWishlistId);
      chainIdRef.current = null;
      resetForm();
      playSound('cargar');
      Alert.alert('¡Guardado!', `Tu ${tipo === 'real' ? 'viaje' : 'destino'} fue guardado correctamente.`);
      _checkAchievements(prevStats.rangoActual);
    } catch (err) {
      console.error('[Guardar] ERROR COMPLETO al guardar:', err);
      Alert.alert('Error', 'No se pudo guardar. Intentá de nuevo.');
    }
  }

  const locationConfirmed = geoStatus === 'encontrada';

  const diaLabel = dia ? dia.padStart(2, '0') : '';
  const mesLabel = mes ? (MONTHS.find((m) => m.value === mes)?.label ?? '') : '';
  const anioLabel = anio || '';

  function toggleDrop(key: 'dia' | 'mes' | 'anio') {
    Keyboard.dismiss();
    if (openDropdown !== key && !dia && !mes && !anio) {
      const today = new Date();
      setDia(String(today.getDate()));
      setMes(String(today.getMonth() + 1));
      setAnio(String(today.getFullYear()));
    }
    const isOpening = openDropdown !== key;
    setOpenDropdown((prev) => (prev === key ? null : key));
    if (isOpening) {
      setTimeout(() => {
        scrollRef.current?.scrollToPosition?.(0, dateSectionY.current - 20, true);
      }, 80);
    }
  }

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Cargar Viaje</Text>
        <Text style={styles.subtitle}>Registrá tu experiencia o tu próximo destino</Text>

        {/* Toggle tipo */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={styles.toggleLabelWrap}
            onPress={() => handleToggle('real')}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleLabel, tipo === 'real' && styles.toggleLabelActive]}>
              Ya lo hice
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleToggle(tipo === 'real' ? 'wishlist' : 'real')}
            activeOpacity={0.85}
          >
            <View style={styles.toggleTrack}>
              <Animated.View style={[styles.toggleThumb, { left: thumbLeft }]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleLabelWrap}
            onPress={() => handleToggle('wishlist')}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleLabel, tipo === 'wishlist' && styles.toggleLabelActive]}>
              Lo quiero hacer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selector cantidad de ciudades */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={styles.toggleLabelWrap}
            onPress={() => handleToggleCantCiudades('una')}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleLabel, cantCiudades === 'una' && styles.toggleLabelActive]}>
              Visité una ciudad
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleToggleCantCiudades(cantCiudades === 'una' ? 'mas' : 'una')}
            activeOpacity={0.85}
          >
            <View style={styles.toggleTrack}>
              <Animated.View style={[styles.toggleThumb, { left: thumbLeftCant }]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleLabelWrap}
            onPress={() => handleToggleCantCiudades('mas')}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleLabel, cantCiudades === 'mas' && styles.toggleLabelActive]}>
              Visité más de una ciudad
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── MODO: UNA CIUDAD ─────────────────────────────────────────── */}
        {cantCiudades === 'una' && (
          <>
            {/* Ubicación */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Destino</Text>
              <View style={styles.sugContainer}>
                <TextInput
                  style={[styles.input, { marginBottom: ciudadSugs.length > 0 ? 0 : 10 }]}
                  placeholder="Ciudad"
                  placeholderTextColor={MUTED}
                  value={ciudad}
                  onChangeText={handleCiudadChange}
                  onBlur={() => setTimeout(() => setCiudadSugs([]), 150)}
                  returnKeyType="next"
                />
                {ciudadSugs.length > 0 && (
                  <View style={styles.sugList}>
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                      {ciudadSugs.map((item) => (
                        <TouchableOpacity key={item} style={styles.sugItem} onPress={() => selectCiudad(item)} activeOpacity={0.7}>
                          <Text style={styles.sugText}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              <View style={styles.sugContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="País"
                  placeholderTextColor={MUTED}
                  value={pais}
                  onChangeText={handlePaisChange}
                  returnKeyType="done"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.outlineBtn,
                  geoStatus === 'buscando' && styles.outlineBtnDisabled,
                  geoStatus === 'encontrada' && styles.outlineBtnValidated,
                ]}
                onPress={buscarUbicacion}
                activeOpacity={0.8}
                disabled={geoStatus === 'buscando'}
              >
                <Text style={[
                  styles.outlineBtnText,
                  geoStatus === 'encontrada' && styles.outlineBtnTextValidated,
                  (geoStatus === 'no_encontrada' || geoStatus === 'error') && styles.outlineBtnTextError,
                ]}>
                  {geoStatus === 'buscando' ? 'Validando...'
                    : geoStatus === 'encontrada' ? 'OK'
                    : geoStatus === 'no_encontrada' ? 'No encontrada — intentá de nuevo'
                    : geoStatus === 'error' ? 'Error al validar — intentá de nuevo'
                    : geoStatus === 'multiples' ? 'Varias coincidencias — elegí una'
                    : 'VALIDAR'}
                </Text>
              </TouchableOpacity>
              {geoStatus === 'error' && (
                <View style={styles.geoNotFound}>
                  <Text style={styles.geoNotFoundText}>
                    Error al conectar. Verificá tu conexión e intentá de nuevo.
                  </Text>
                </View>
              )}
              {geoStatus === 'no_encontrada' && (
                <View style={styles.geoNotFound}>
                  <Text style={styles.geoNotFoundText}>No encontramos la ciudad ingresada.</Text>
                  <View style={styles.geoNotFoundActions}>
                    <TouchableOpacity style={styles.geoActionBtn} onPress={elegirOtraCiudad} activeOpacity={0.8}>
                      <Text style={styles.geoActionBtnText}>Elegir otra ciudad</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.geoActionBtn, styles.geoActionBtnPrimary]}
                      onPress={confirmarSoloPais}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.geoActionBtnText, styles.geoActionBtnTextPrimary]}>
                        Confirmar solo con el país
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {geoStatus === 'multiples' && geoOpciones.length > 0 && (
                <View style={styles.sugList}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {geoOpciones.map((opt, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.sugItem}
                        activeOpacity={0.7}
                        onPress={() => {
                          setCoords({ lat: parseFloat(opt.lat), lng: parseFloat(opt.lon) });
                          setGeoNombre(opt.display_name);
                          setGeoStatus('encontrada');
                          setGeoOpciones([]);
                          guardarCiudadAprendida(ciudad.trim(), pais.trim());
                        }}
                      >
                        <Text style={styles.sugText}>{opt.display_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Fotos — solo para real */}
            {tipo === 'real' && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Fotos ({fotos.length}/4)</Text>
                {fotos.length < 4 && (
                  <TouchableOpacity style={styles.photoCard} onPress={handleCargarFotos} activeOpacity={0.8}>
                    <Text style={styles.photoCardIcon}>✦</Text>
                    <Text style={styles.photoCardText}>Cargar fotos</Text>
                    <Text style={styles.photoCardHint}>Galería · Cámara</Text>
                  </TouchableOpacity>
                )}
                {fotos.length > 0 && (
                  <View style={styles.photosRow}>
                    {fotos.map((uri, i) => {
                      const isPortada = portadaUri ? uri === portadaUri : i === 0;
                      return (
                        <TouchableOpacity
                          key={i}
                          activeOpacity={0.9}
                          onLongPress={() => {
                            Alert.alert(
                              '¿Portada?',
                              '¿Deseás asignar esta foto como portada?',
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Asignar', onPress: () => setPortadaUri(uri) },
                              ]
                            );
                          }}
                          style={styles.photoWrapper}
                        >
                          <Image source={{ uri }} style={styles.photoThumb} />
                          {isPortada && (
                            <View style={styles.photoCoverBadge}>
                              <Text style={styles.photoCoverText}>Portada</Text>
                            </View>
                          )}
                          <TouchableOpacity
                            style={styles.photoRemoveBtn}
                            onPress={() => removePhoto(i)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.photoRemoveText}>✕</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {fotos.length === 0 && (
                  <Text style={styles.photoHint}>La primera foto será la portada del viaje.</Text>
                )}
              </View>
            )}

            {/* Fecha — solo para real */}
            {tipo === 'real' && (
              <View style={styles.section} onLayout={(e) => { dateSectionY.current = e.nativeEvent.layout.y; }}>
                <Text style={styles.sectionLabel}>Fecha de inicio</Text>
                <View style={styles.dropRow}>
                  <TouchableOpacity
                    style={[styles.dropBtn, openDropdown === 'dia' && styles.dropBtnOpen, { flex: 1 }]}
                    onPress={() => toggleDrop('dia')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dropBtnText, !diaLabel && styles.dropBtnPlaceholder]}>{diaLabel || 'DD'}</Text>
                    <Text style={styles.dropChevron}>{openDropdown === 'dia' ? '▴' : '▾'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dropBtn, openDropdown === 'mes' && styles.dropBtnOpen, { flex: 2 }]}
                    onPress={() => toggleDrop('mes')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dropBtnText, !mesLabel && styles.dropBtnPlaceholder]}>{mesLabel || 'Mes'}</Text>
                    <Text style={styles.dropChevron}>{openDropdown === 'mes' ? '▴' : '▾'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dropBtn, openDropdown === 'anio' && styles.dropBtnOpen, { flex: 1.5 }]}
                    onPress={() => toggleDrop('anio')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dropBtnText, !anioLabel && styles.dropBtnPlaceholder]}>{anioLabel || 'AAAA'}</Text>
                    <Text style={styles.dropChevron}>{openDropdown === 'anio' ? '▴' : '▾'}</Text>
                  </TouchableOpacity>
                </View>
                {openDropdown === 'dia' && (
                  <DropdownList
                    items={DAYS}
                    selected={dia}
                    onSelect={(v) => { setDia(v); setOpenDropdown(null); playSound('tic'); }}
                  />
                )}
                {openDropdown === 'mes' && (
                  <DropdownList
                    items={MONTHS}
                    selected={mes}
                    onSelect={(v) => { setMes(v); setOpenDropdown(null); playSound('tic'); }}
                  />
                )}
                {openDropdown === 'anio' && (
                  <DropdownList
                    items={YEARS}
                    selected={anio}
                    onSelect={(v) => { setAnio(v); setOpenDropdown(null); playSound('tic'); }}
                  />
                )}
              </View>
            )}

            {/* Nota */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Nota <Text style={styles.optional}>(opcional)</Text></Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Contá algo de este viaje..."
                placeholderTextColor={MUTED}
                value={nota}
                onChangeText={setNota}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.notaCounter}>{nota.length}/1000</Text>
            </View>

            {/* Botones — una ciudad */}
            <View style={styles.buttonsSection}>
              <TouchableOpacity
                style={[styles.primaryBtn, !locationConfirmed && styles.primaryBtnDisabled]}
                onPress={handleGuardar}
                activeOpacity={locationConfirmed ? 0.85 : 1}
                disabled={!locationConfirmed}
              >
                <Text style={styles.primaryBtnText}>
                  {tipo === 'real' ? 'Guardar viaje' : 'Guardar destino'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── MODO: MÁS DE UNA CIUDAD ──────────────────────────────────── */}
        {cantCiudades === 'mas' && (
          <>
            {/* Preselección de fotos del viaje */}
            <View style={styles.preseleccionBlock}>
              <Text style={styles.preseleccionTitle}>Preseleccionar fotos de todo el viaje</Text>
              <Text style={styles.preseleccionSubtitle}>
                Seleccioná todas las fotos que podrían formar parte de este viaje. Más adelante podrás asignarlas a cada ciudad.
              </Text>
              <TouchableOpacity style={styles.preseleccionBtn} onPress={seleccionarFotosDelViaje} activeOpacity={0.8}>
                <Text style={styles.preseleccionBtnText}>
                  {fotosViaje.length > 0
                    ? `${fotosViaje.length} foto${fotosViaje.length !== 1 ? 's' : ''} · Cambiar selección`
                    : 'Seleccionar fotos'}
                </Text>
              </TouchableOpacity>
              {fotosViaje.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.preseleccionThumbsRow}>
                  {fotosViaje.slice(0, 10).map((uri, i) => (
                    <Image key={i} source={{ uri }} style={styles.preseleccionThumb} />
                  ))}
                  {fotosViaje.length > 10 && (
                    <View style={styles.preseleccionMoreBadge}>
                      <Text style={styles.preseleccionMoreText}>+{fotosViaje.length - 10}</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>

            {destinos.map((d, i) => (
              <DestinoBlock
                key={d.id}
                destino={d}
                index={i}
                tipo={tipo}
                learnedCities={learnedCities}
                onChange={(patch) => updateDestino(i, patch)}
                onLearnCity={guardarCiudadAprendida}
                scrollRef={scrollRef}
                fotosViaje={fotosViaje}
                fotosUsadasPorOtros={fotosUsadasPorOtrosDestinos(i)}
              />
            ))}

            {/* Botones — más de una ciudad */}
            <View style={styles.buttonsSection}>
              <TouchableOpacity style={styles.agregarCiudadBtn} onPress={agregarCiudad} activeOpacity={0.8}>
                <Text style={styles.agregarCiudadBtnText}>+ Agregar ciudad</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleFinalizarViaje} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Finalizar viaje</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </KeyboardAwareScrollView>
      <NavBar />
      {notifQueue.length > 0 && notifQueue[0].kind === 'levelup' && (
        <LevelUpPopup
          prevRango={notifQueue[0].prevRango}
          newRango={notifQueue[0].newRango}
          xpRestantes={notifQueue[0].xpRestantes}
          userName={notifQueue[0].userName}
          onDone={popNotif}
        />
      )}
      {notifQueue.length > 0 && notifQueue[0].kind === 'achievement' && (
        <AchievementPopup
          achievements={[notifQueue[0].achievement]}
          onDone={popNotif}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    paddingHorizontal: SIDE_PAD,
    paddingTop: 64,
    paddingBottom: 40,
  },

  title: {
    fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 36,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 32,
  },
  toggleLabelWrap: {
    flex: 1,
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'center',
  },
  toggleLabelActive: {
    color: GOLD,
  },
  toggleTrack: {
    width: TRACK_W,
    height: THUMB_D + 4,
    borderRadius: (THUMB_D + 4) / 2,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: 'rgba(212,175,55,0.15)',
    position: 'relative',
  },
  toggleThumb: {
    position: 'absolute',
    top: 1,
    width: THUMB_D,
    height: THUMB_D,
    borderRadius: THUMB_D / 2,
    backgroundColor: GOLD,
  },

  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  optional: {
    fontSize: 11,
    color: MUTED,
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
  },
  notaCounter: {
    fontSize: 11,
    color: MUTED,
    textAlign: 'right',
    marginTop: -6,
  },

  input: {
    width: '100%',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    color: TEXT,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 13,
  },

  photoCard: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 12,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    gap: 5,
  },
  photoCardIcon: { fontSize: 20, color: GOLD },
  photoCardText: { fontSize: 15, fontWeight: '600', color: TEXT, letterSpacing: 0.5 },
  photoCardHint: { fontSize: 12, color: MUTED, letterSpacing: 0.3 },
  photoHint: { fontSize: 12, color: MUTED, marginTop: -4 },

  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'flex-start',
  },
  photoWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GOLD,
  },
  photoThumb: { width: '100%', height: '100%' },
  photoCoverBadge: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(212,175,55,0.85)',
    alignItems: 'center',
    paddingVertical: 2,
  },
  photoCoverText: { fontSize: 9, fontWeight: '700', color: BG, letterSpacing: 0.5 },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4, right: 4,
    backgroundColor: 'rgba(1,5,13,0.75)',
    borderRadius: 10,
    width: 20, height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: TEXT, fontSize: 10, fontWeight: '700' },

  // ── Date dropdowns ──────────────────────────────────────────────────────────
  dropRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dropBtn: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  dropBtnOpen: {
    borderColor: GOLD,
    backgroundColor: 'rgba(212,175,55,0.05)',
  },
  dropBtnText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  dropBtnPlaceholder: {
    color: MUTED,
    fontWeight: '400',
  },
  dropChevron: {
    color: MUTED,
    fontSize: 11,
    marginLeft: 4,
  },
  dropList: {
    marginTop: 6,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: 198,
  },
  dropListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,48,80,0.5)',
  },
  dropListItemSelected: {
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  dropListText: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
  },
  dropListTextSelected: {
    color: GOLD,
    fontWeight: '600',
  },
  dropListCheck: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Outline buttons ─────────────────────────────────────────────────────────
  outlineBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: SURFACE,
  },
  outlineBtnText: { color: MUTED, fontSize: 14, fontWeight: '500' },
  outlineBtnDisabled: { opacity: 0.5 },
  outlineBtnValidated: {
    borderColor: 'rgba(122,168,140,0.5)',
    backgroundColor: 'rgba(122,168,140,0.12)',
  },
  outlineBtnTextValidated: { color: '#8fbf9f', fontWeight: '600' },
  outlineBtnTextError: { color: '#e07070' },

  geoNotFound: {
    backgroundColor: 'rgba(180,40,40,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(180,40,40,0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  geoNotFoundText: { fontSize: 13, color: '#e07070', lineHeight: 18 },
  geoNotFoundActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  geoActionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  geoActionBtnPrimary: {
    backgroundColor: GOLD,
  },
  geoActionBtnText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  geoActionBtnTextPrimary: {
    color: BG,
  },

  // ── Action buttons ──────────────────────────────────────────────────────────
  buttonsSection: {
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.35,
  },
  primaryBtnText: {
    color: BG,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryBtnDisabled: {
    borderColor: BORDER,
    opacity: 0.35,
  },
  secondaryBtnText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryBtnTextDisabled: {
    color: MUTED,
  },

  sugContainer: {
    width: '100%',
  },
  sugList: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: GOLD,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    maxHeight: 240,
    marginBottom: 10,
    overflow: 'hidden',
  },
  sugItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,48,80,0.5)',
  },
  sugText: {
    color: TEXT,
    fontSize: 15,
  },

  // ── Preselección de fotos del viaje ─────────────────────────────────────────
  preseleccionBlock: {
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(212,175,55,0.04)',
  },
  preseleccionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  preseleccionSubtitle: {
    fontSize: 12,
    color: MUTED,
    lineHeight: 17,
    marginBottom: 14,
    textAlign: 'center',
  },
  preseleccionBtn: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  preseleccionBtnText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  preseleccionThumbsRow: {
    marginTop: 12,
  },
  preseleccionThumb: {
    width: 52,
    height: 52,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  preseleccionMoreBadge: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preseleccionMoreText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Foto Picker Modal ────────────────────────────────────────────────────────
  pickerModal: {
    flex: 1,
    backgroundColor: BG,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  pickerHeaderBtn: {
    minWidth: 80,
  },
  pickerCancelText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: '500',
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 0.3,
  },
  pickerConfirmText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  pickerHint: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    padding: 1,
  },
  pickerThumbWrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  pickerThumbWrapSelected: {
    borderWidth: 3,
    borderColor: GOLD,
  },
  pickerThumb: {
    width: '100%',
    height: '100%',
  },
  pickerCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCheckText: {
    color: BG,
    fontSize: 12,
    fontWeight: '900',
  },
  pickerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  pickerEmptyText: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },

  // ── Multi-city ──────────────────────────────────────────────────────────────
  destinoBlock: {
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(13,26,46,0.6)',
  },
  destinoBlockTitle: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  agregarCiudadBtn: {
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  agregarCiudadBtnText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  bottomSpacer: { height: 88 },
});
