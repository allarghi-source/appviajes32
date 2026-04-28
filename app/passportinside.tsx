import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image, StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Svg, {
  Circle,
  Path,
  Rect
} from 'react-native-svg';
import NavBar from '../components/NavBar';
import {
  StatsResult,
  Trip,
  calcularStats,
  formatHoras,
  formatKm,
} from '../utils/statsEngine';

// ─── ICONS ────────────────────────────────────────────────────────────────────

const SignalIcon = () => (
  <Svg width={14} height={10} viewBox="0 0 14 10">
    <Rect x={0} y={3} width={2.5} height={7} rx={0.5} fill="white" opacity={0.35} />
    <Rect x={3.5} y={2} width={2.5} height={8} rx={0.5} fill="white" opacity={0.6} />
    <Rect x={7} y={0} width={2.5} height={10} rx={0.5} fill="white" opacity={0.9} />
  </Svg>
);

const WifiIcon = () => (
  <Svg width={14} height={10} viewBox="0 0 16 12">
    <Path d="M8 2C10.5 2 12.7 3 14.2 4.7L15.5 3.3C13.6 1.3 11 0 8 0C5 0 2.4 1.3 0.5 3.3L1.8 4.7C3.3 3 5.5 2 8 2Z" fill="white" />
    <Path d="M8 5C9.7 5 11.2 5.7 12.3 6.8L13.6 5.5C12.1 3.9 10.2 3 8 3C5.8 3 3.9 3.9 2.4 5.5L3.7 6.8C4.8 5.7 6.3 5 8 5Z" fill="white" />
    <Circle cx={8} cy={10} r={2} fill="white" />
  </Svg>
);

const BatteryIcon = () => (
  <Svg width={22} height={10} viewBox="0 0 25 12">
    <Rect x={0} y={1} width={22} height={10} rx={2} fill="none" stroke="white" strokeWidth={1} />
    <Rect x={22.5} y={3.5} width={2} height={5} rx={1} fill="white" opacity={0.5} />
    <Rect x={1.5} y={2.5} width={17} height={7} rx={1} fill="white" />
  </Svg>
);

const GearIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={1.5} strokeLinecap="round" opacity={0.4}>
    <Circle cx={12} cy={12} r={3} />
    <Path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
  </Svg>
);

const UserSilhouette = () => (
  <Svg width={40} height={40} viewBox="0 0 28 28" opacity={0.2}>
    <Circle cx={14} cy={10} r={6} fill="#4a3c28" />
    <Path d="M2 26 Q2 18 14 18 Q26 18 26 26" fill="#4a3c28" />
  </Svg>
);

// ─── STAMP ────────────────────────────────────────────────────────────────────

interface StampProps {
  size: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  rotate: number;
  color: string;
  label: string;
}

const Stamp = ({ size, top, bottom, left, right, rotate, color, label }: StampProps) => {
  const posStyle: any = { position: 'absolute', width: size, height: size };
  if (top !== undefined) posStyle.top = top;
  if (bottom !== undefined) posStyle.bottom = bottom;
  if (left !== undefined) posStyle.left = left;
  if (right !== undefined) posStyle.right = right;
  posStyle.transform = [{ rotate: `${rotate}deg` }];

  return (
    <View style={posStyle} pointerEvents="none">
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        borderStyle: 'solid',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ fontFamily: 'Georgia', fontSize: 5.5, color, textAlign: 'center', lineHeight: 8, textTransform: 'uppercase' }}>
          {label}
        </Text>
      </View>
    </View>
  );
};

// ─── MEDAL DINÁMICA ───────────────────────────────────────────────────────────

type MedalTier = 'bronce' | 'plata' | 'oro';

const MEDAL_COLORS: Record<MedalTier, {
  ribL: string; ribR: string; circle: string; border: string; text: string; icon: string;
}> = {
  bronce: { ribL: '#a0522d', ribR: '#cd7f32', circle: '#cd7f32', border: '#8b4513', text: '#3a1800', icon: '✈' },
  plata:  { ribL: '#6a7580', ribR: '#9eaab5', circle: '#c0c0c0', border: '#808080', text: '#1a1a2e', icon: '◆' },
  oro:    { ribL: '#b8860b', ribR: '#e8c840', circle: '#ffd700', border: '#b8860b', text: '#3a1800', icon: '★' },
};

const Medal = ({ tier, rank }: { tier: MedalTier; rank: string }) => {
  const c = MEDAL_COLORS[tier];
  return (
    <View style={styles.medalWrap}>
      <View style={styles.medalRibbons}>
        <View style={[styles.medalRibL, { backgroundColor: c.ribL }]} />
        <View style={[styles.medalRibR, { backgroundColor: c.ribR }]} />
      </View>
      <View style={[styles.medalCircle, { backgroundColor: c.circle, borderColor: c.border }]}>
        <View style={styles.medalInner}>
          <Text style={[styles.medalIcon, { color: c.text }]}>{c.icon}</Text>
          <Text style={[styles.medalText, { color: c.text }]}>{rank.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

interface UserData {
  foto?: string;
  apellido?: string;
  nombre?: string;
  nacionalidad?: string;
}

export default function PassportOpen() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const data = await AsyncStorage.getItem('userData');
      if (data) setUserData(JSON.parse(data));

      const raw = await AsyncStorage.getItem('trips');
      const allTrips: Trip[] = raw ? JSON.parse(raw) : [];
      setWishlistCount(allTrips.filter((t) => t.tipo === 'wishlist').length);
      setStats(calcularStats(allTrips));
    };
    loadData();
  }, []);

  if (!userData) return null;

  const xpProgress = Math.max(2, Math.round((stats?.progresoRango ?? 0) * 100));
  const xpLabel = stats?.siguienteRango ? `${stats.siguienteRango} →` : 'MÁXIMO ★';
  const hasKm = stats && stats.kmTotales > 0;

const formatOneDecimal = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
};

const getSpaceReference = (km: number) => {
  if (!km || km <= 0) return null;
const icon = '◉ ';
  const references = [
    { name: 'la Luna', emoji: '🌙', km: 10900 },
    { name: 'Marte', emoji: '🔴', km: 21000 },
    { name: 'la Tierra', emoji: '🌍', km: 40075 },
    { name: 'Neptuno', emoji: '🔵', km: 154000 },
  ];

  for (const ref of references) {
    const turns = km / ref.km;

    if (turns < 2) {
      if (turns < 1) {
        return `${icon}Recorriste el ${Math.round(turns * 100)}% de una vuelta a ${ref.name}`;
      }

      return `${icon}Le diste ${formatOneDecimal(turns)} vueltas a ${ref.name}`;
    }
  }

  const moonTrip = km / 384000;

  if (moonTrip < 1) {
    return `${icon}Recorriste el ${Math.round(moonTrip * 100)}% del viaje a la Luna`;
  }

  const jupiterTurns = km / 440000;

  if (jupiterTurns < 1) {
    return `${icon}Le diste ${formatOneDecimal(jupiterTurns)} vueltas a Júpiter`;
  }

  return `Le diste ${formatOneDecimal(jupiterTurns)} vueltas a Júpiter 🟠`;
};



  return (
   <View style={{ flex: 1, backgroundColor: '#01050d' }}>

      {/* Passport wrap */}
      <View style={styles.passportWrap}>

        {/* ── PAGE 1: STATS ── */}
        <View style={styles.passportPage}>
          {/* Background stamps */}
          <Stamp size={80} top={-20} right={10} rotate={12} color="rgba(26,80,180,0.10)" label={'PARIS\nDEPARTURE\n15.08.2019'} />
          <Stamp size={65} top={50} left={-10} rotate={-18} color="rgba(180,40,40,0.10)" label={'TOKYO\nARRIVAL\n2022'} />
          <Stamp size={90} bottom={-25} left={30} rotate={-8} color="rgba(20,120,60,0.08)" label={'NEW YORK\nARRIVAL\n25 APR 2020'} />
          <Stamp size={60} bottom={20} right={20} rotate={22} color="rgba(160,80,20,0.09)" label={'LONDON\nTRANSIT\n2021'} />
          <Stamp size={70} top={120} right={-15} rotate={5} color="rgba(100,30,140,0.08)" label={'DUBAI\nARRIVAL\n2023'} />

          {/* Content */}
          <Text style={styles.pageTitle}>Mi recorrido</Text>

          <StatRow label="Continentes" value={stats ? String(stats.continentesVisitados) : '0'} />
          <StatRow label="Países visitados" value={stats ? String(stats.paisesVisitados) : '0'} />
          <StatRow label="Ciudades visitadas" value={stats ? String(stats.ciudadesVisitadas) : '0'} />
          <StatRow label="Quiero visitar" value={String(wishlistCount)} />
          <StatRow
            label="Km recorridos"
            value={hasKm ? formatKm(stats!.kmTotales) : '—'}
            dim={!hasKm}
          />
          <StatRow
            label="Horas de vuelo"
            value={hasKm ? formatHoras(stats!.horasVuelo) : '—'}
            dim={!hasKm}
            noBorder
          />
          {stats && stats.kmTotales > 0 ? (
  <View style={styles.spaceBox}>
    <Text style={styles.spaceBoxText}>
      {getSpaceReference(stats.kmTotales)}
    </Text>
  </View>
) : (
  <View style={styles.spaceBox}>
    <Text style={styles.spaceBoxText}>
      ✦  Cargá tus viajes para ver{'\n'}    tu dato espacial 🚀
    </Text>
  </View>
)}

        </View>

        {/* ── PAGE 2: IDENTITY ── */}
        <View style={[styles.passportPage, styles.passportPage2]}>
          {/* Background stamps */}
          <Stamp size={85} top={-20} left={10} rotate={-14} color="rgba(26,80,180,0.10)" label={'SINGAPORE\nARRIVAL\n19.07.2018'} />
          <Stamp size={70} top={40} right={-10} rotate={16} color="rgba(180,40,40,0.09)" label={'BUENOS AIRES\nDEPARTURE\nJAN 2019'} />
          <Stamp size={75} bottom={-15} left={20} rotate={-10} color="rgba(20,120,60,0.08)" label={'AMSTERDAM\nTRANSIT\n25.02.2019'} />
          <Stamp size={60} bottom={80} right={15} rotate={20} color="rgba(100,30,140,0.09)" label={'BANGKOK\nARR\n2017'} />

          {/* Country header */}
          <View style={styles.countryHeader}>
            <Text style={styles.countryName}>MyWorldXP</Text>
            <Text style={styles.passportNum}>MWX · 263524</Text>
          </View>

          <View style={styles.divider} />

          {/* ID section */}
          <View style={styles.idSection}>
            {/* Photo box */}
            <View style={styles.photoBox}>
              <View style={[styles.photoCorner, { top: 4, left: 4, borderTopWidth: 2, borderLeftWidth: 2 }]} />
              <View style={[styles.photoCorner, { top: 4, right: 4, borderTopWidth: 2, borderRightWidth: 2 }]} />
              <View style={[styles.photoCorner, { bottom: 4, left: 4, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
              <View style={[styles.photoCorner, { bottom: 4, right: 4, borderBottomWidth: 2, borderRightWidth: 2 }]} />
              {userData?.foto ? (
                <Image
                  source={{ uri: userData.foto }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <UserSilhouette />
              )}
            </View>

            {/* Data col */}
            <View style={styles.dataCol}>
              <Text style={styles.fieldLabel}>Apellido</Text>
              <Text style={styles.fieldValue}>{userData?.apellido}</Text>
              <Text style={styles.fieldLabel}>Nombre</Text>
              <Text style={styles.fieldValue}>{userData?.nombre}</Text>
              <Text style={styles.fieldLabel}>Nacionalidad</Text>
              <Text style={[styles.fieldValue, { fontSize: 13 }]}>{userData?.nacionalidad}</Text>
            </View>

            {/* Medalla dinámica según rango */}
            <Medal
              tier={stats?.rangoTier ?? 'bronce'}
              rank={stats?.rangoActual ?? 'Novato'}
            />
          </View>

          
          <View style={styles.divider} />

          {/* XP row */}
          <View style={styles.xpRow}>
            <Text style={styles.xpLabel}>XP</Text>
            <Text style={styles.xpValue}>{stats?.xpTotal ?? 0}</Text>
            <View style={styles.xpBarWrap}>
              <View style={[styles.xpBar, { width: `${xpProgress}%` }]} />
            </View>
            <Text style={styles.rankText}>{xpLabel}</Text>
          </View>

          {/* MRZ */}
          <View style={styles.mrz}>
            <Text style={styles.mrzLine}>P&lt;MWXLARGHI&lt;&lt;ANGEL&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</Text>
            <Text style={styles.mrzLine}>MWX263524&lt;ARG9901014M3012315&lt;&lt;&lt;&lt;</Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/passportcover')}>
            <Text style={styles.closeHint}>Tocar para cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <NavBar />
    </View>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

interface StatRowProps {
  label: string;
  value: string;
  dim?: boolean;
  noBorder?: boolean;
}

const StatRow = ({ label, value, dim, noBorder }: StatRowProps) => (
  <View style={[styles.statRow, noBorder && { borderBottomWidth: 0 }]}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, dim && { fontSize: 13, opacity: 0.5 }]}>{value}</Text>
  </View>
);

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  phone: {
    backgroundColor: '#0a1628',
    borderRadius: 40,
    width: 340,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 20,
    borderWidth: 1.5,
    borderColor: '#1e3458',
  },

  statusbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  time: {
    fontFamily: 'Courier',
    fontSize: 13,
    color: '#fff',
    letterSpacing: 1,
  },
  statusicons: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },

  gearRow: {
    alignItems: 'flex-end',
    paddingRight: 6,
    paddingBottom: 8,
  },

  passportWrap: {
    marginTop: 40,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#c8b48a',
  },

  passportPage: {
    backgroundColor: '#f0e8d0',
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  passportPage2: {
    borderTopWidth: 2,
    borderTopColor: '#c8b48a',
  },

  pageTitle: {
  fontFamily: 'Georgia',
  fontSize: 16,
  letterSpacing: 2,
  color: '#1a3a6e',
  fontWeight: '700',
  textTransform: 'uppercase',
  textAlign: 'center',
  marginBottom: 18,
},

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(100,80,40,0.13)',
  },
  statLabel: {
  fontFamily: 'ShareTechMono-regular',
  fontSize: 16,
  color: '#4a3c28',
  flex: 1,
  letterSpacing: 0.5,
},
  statValue: {
    fontFamily: 'ShareTechMono-regular',
    fontSize: 16,
    fontWeight: '700',
    color: '#1a3a6e',
    letterSpacing: 2,
    minWidth: 50,
    textAlign: 'right',
  },

  spaceBox: {
    marginTop: 14,
    backgroundColor: 'rgba(26,58,110,0.06)',
    borderLeftWidth: 3,
    borderLeftColor: '#c9a227',
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  spaceBoxText: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#1a3a6e',
    fontWeight: '600',
lineHeight: 18,
    
    letterSpacing: 0.5,
  },

  countryHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  countryName: {
    fontFamily: 'Georgia',
    fontSize: 15,
    letterSpacing: 2,
    color: '#1a3a6e',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  passportNum: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#9a8060',
    letterSpacing: 3,
    marginTop: 3,
  },

  divider: {
    height: 0.5,
    backgroundColor: 'rgba(100,80,40,0.2)',
    marginVertical: 6,
  },

  idSection: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'flex-start',
  },

  photoBox: {
    width: 110,
    height: 140,
    borderWidth: 2.5,
    borderColor: '#c9a227',
    borderRadius: 4,
    flexShrink: 0,
    backgroundColor: '#e0d8c0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  photoCorner: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderColor: '#c9a227',
  },

  dataCol: {
    flex: 0.75,
  },
  fieldLabel: {
    fontFamily: 'Georgia',
    fontSize: 8,
    letterSpacing: 2.5,
    color: '#9a8060',
    textTransform: 'uppercase',
    marginBottom: 2,
    marginTop: 8,
  },
  fieldValue: {
    fontFamily: 'Courier',
    fontSize: 15,
    fontWeight: '700',
    color: '#1a3a6e',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Medal
 medalWrap: {
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginLeft: 2,
},
  medalRibbons: {
    flexDirection: 'row',
    marginBottom: -3,
  },
  medalRibL: {
    width: 13,
    height: 16,
    marginRight: -3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    transform: [{ skewX: '-10deg' }],
  },
  medalRibR: {
    width: 13,
    height: 16,
    marginLeft: -3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    transform: [{ skewX: '10deg' }],
  },
  medalCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  medalInner: {
    width: 60,
    height: 60,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(139,69,19,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  medalIcon: {
    fontSize: 24,
    lineHeight: 16,
  },
  medalText: {
    fontFamily: 'Georgia',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // XP row
  xpRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  marginTop: 8,
  backgroundColor: '#0a1f44',
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: 'rgba(80,140,255,0.25)',

  shadowColor: '#4da3ff',
shadowOffset: { width: 0, height: 0 },
shadowOpacity: 0.6,
shadowRadius: 8,
elevation: 6,
},
  xpLabel: {
    fontFamily: 'Georgia',
    fontSize: 9,
    letterSpacing: 3,
    color: '#c9a227',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  xpValue: {
    fontFamily: 'Courier',
    fontSize: 18,
    fontWeight: '700',
    color: '#c9a227',
    letterSpacing: 2,
  },
xpBarWrap: {
  flex: 1,
  height: 6,
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderRadius: 3,
  overflow: 'hidden',
},
  xpBar: {
    height: '100%',
    backgroundColor: '#c9a227',
    borderRadius: 3,
  },
  xpNext: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: '#c9a227',
    opacity: 0.6,
    letterSpacing: 1,
  },
  rankText: {
  fontFamily: 'ShareTechMono',
  fontSize: 12,
  color: '#ffffff',
  letterSpacing: 1.5,
  marginLeft: 4,
},

  // MRZ
  mrz: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(100,80,40,0.15)',
  },
  mrzLine: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: 'rgba(58,48,32,0.28)',
    letterSpacing: 1.5,
    lineHeight: 16,
  },

 closeHint: {
  textAlign: 'center',
  marginTop: 6,
  fontFamily: 'Georgia',
  fontSize: 11,
  fontWeight: '600',
  color: '#8fbfff',
  letterSpacing: 1,
  opacity: 1,
},

  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 14,
  },
  navItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    fontFamily: 'Georgia',
    fontSize: 8,
    letterSpacing: 0.5,
    color: '#888',
    textTransform: 'uppercase',
  },
});
