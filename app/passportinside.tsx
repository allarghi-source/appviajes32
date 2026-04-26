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
  Line,
  Path,
  Rect
} from 'react-native-svg';

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

// Nav icons
const PassportNavIcon = ({ active }: { active?: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={active ? '#c9a227' : '#666'} strokeWidth={1.5} strokeLinecap="round">
    <Rect x={4} y={2} width={16} height={20} rx={2} />
    <Line x1={4} y1={8} x2={20} y2={8} />
    <Line x1={9} y1={2} x2={9} y2={8} />
  </Svg>
);

const TimelineNavIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth={1.5} strokeLinecap="round">
    <Line x1={12} y1={2} x2={12} y2={22} />
    <Circle cx={12} cy={6} r={2} />
    <Circle cx={12} cy={13} r={2} />
    <Circle cx={12} cy={20} r={2} />
  </Svg>
);

const MapNavIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth={1.5} strokeLinecap="round">
    <Circle cx={12} cy={12} r={10} />
    <Path d="M2 12 Q6 8 12 12 Q18 16 22 12" />
    <Line x1={12} y1={2} x2={12} y2={22} />
  </Svg>
);

const AddNavIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth={1.5} strokeLinecap="round">
    <Line x1={12} y1={5} x2={12} y2={19} />
    <Line x1={5} y1={12} x2={19} y2={12} />
  </Svg>
);

const SettingsNavIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth={1.5} strokeLinecap="round">
    <Circle cx={12} cy={12} r={3} />
    <Path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
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

// ─── MEDAL ────────────────────────────────────────────────────────────────────

const BronzeMedal = () => (
  <View style={styles.medalWrap}>
    {/* Ribbons */}
    <View style={styles.medalRibbons}>
      <View style={styles.medalRibL} />
      <View style={styles.medalRibR} />
    </View>
    {/* Circle */}
    <View style={styles.medalCircle}>
      <View style={styles.medalInner}>
        <Text style={styles.medalIcon}>✈</Text>
        <Text style={styles.medalText}>NOVATO</Text>
      </View>
    </View>
  </View>
);

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

useEffect(() => {
  const loadData = async () => {
    const data = await AsyncStorage.getItem('userData');
    if (data) {
      setUserData(JSON.parse(data));
    }
  };

  loadData();
}, []);
if (!userData) return null;
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
          <Text style={styles.pageTitle}>Mis estadísticas</Text>

          <StatRow label="Continentes" value="0" />
          <StatRow label="Países visitados" value="0" />
          <StatRow label="Ciudades visitadas" value="0" />
          <StatRow label="Quiero visitar" value="0" />
          <StatRow label="Km recorridos" value="—" dim />
          <StatRow label="Horas de vuelo" value="—" dim noBorder />

          <View style={styles.spaceBox}>
            <Text style={styles.spaceBoxText}>✦  Cargá tus viajes para ver{'\n'}    tu dato espacial 🚀</Text>
          </View>
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
    source={{ uri: userData?.foto }}
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

            {/* Medal */}
            <BronzeMedal />
          </View>

          <View style={{ height: 10 }} />
          <View style={styles.divider} />

          {/* XP row */}
          <View style={styles.xpRow}>
            <Text style={styles.xpLabel}>XP</Text>
            <Text style={styles.xpValue}>000</Text>
            <View style={styles.xpBarWrap}>
              <View style={styles.xpBar} />
            </View>
            <Text style={styles.xpNext}>CORSARIO →</Text>
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

      {/* Bottom nav */}
      {/*}
      <View style={styles.bottomNav}>
        <NavItem label="Pasaporte" icon={<PassportNavIcon active />} active />
        <NavItem label="Timeline" icon={<TimelineNavIcon />} />
        <NavItem label="Mapa" icon={<MapNavIcon />} />
        <NavItem label="Cargar" icon={<AddNavIcon />} />
        <NavItem label="Ajustes" icon={<SettingsNavIcon />} />
      </View>
        */}
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

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

const NavItem = ({ label, icon, active }: NavItemProps) => (
  <TouchableOpacity style={[styles.navItem, !active && { opacity: 0.4 }]}>
    {icon}
    <Text style={[styles.navLabel, active && { color: '#c9a227' }]}>{label}</Text>
  </TouchableOpacity>
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

  // Status bar
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

  // Gear
  gearRow: {
    alignItems: 'flex-end',
    paddingRight: 6,
    paddingBottom: 8,
  },

  // Passport wrap
  passportWrap: {
    marginTop: 70,
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

  // Passport page
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

  // Page 1: Stats
  pageTitle: {
    fontFamily: 'Georgia',
    fontSize: 9,
    letterSpacing: 4,
    color: '#1a3a6e',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 14,
    opacity: 0.85,
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(100,80,40,0.13)',
  },
  statLabel: {
    fontFamily: 'Georgia',
    fontSize: 12,
    color: '#4a3c28',
    flex: 1,
  },
  statValue: {
    fontFamily: 'Courier',
    fontSize: 16,
    fontWeight: '700',
    color: '#1a3a6e',
    letterSpacing: 2,
    minWidth: 36,
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
    fontSize: 10,
    color: '#1a3a6e',
    lineHeight: 16,
    letterSpacing: 0.5,
  },

  // Page 2: Identity
  countryHeader: {
    alignItems: 'center',
    marginBottom: 14,
  },
  countryName: {
    fontFamily: 'Georgia',
    fontSize: 11,
    letterSpacing: 2,
    color: '#1a3a6e',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  passportNum: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: '#9a8060',
    letterSpacing: 3,
    marginTop: 3,
  },

  divider: {
    height: 0.5,
    backgroundColor: 'rgba(100,80,40,0.2)',
    marginVertical: 10,
  },

  idSection: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },

  photoBox: {
    width: 88,
    height: 108,
    borderWidth: 1.5,
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
    flex: 1,
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
    flexShrink: 0,
  },
  medalRibbons: {
    flexDirection: 'row',
    marginBottom: -3,
  },
  medalRibL: {
    width: 13,
    height: 16,
    backgroundColor: '#a0522d',
    marginRight: -3,
    // clip-path approximation via skew/shape
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    transform: [{ skewX: '-10deg' }],
  },
  medalRibR: {
    width: 13,
    height: 16,
    backgroundColor: '#cd7f32',
    marginLeft: -3,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    transform: [{ skewX: '10deg' }],
  },
  medalCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#cd7f32',
    borderWidth: 2,
    borderColor: '#8b4513',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  medalInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(139,69,19,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  medalIcon: {
    fontSize: 14,
    lineHeight: 16,
    color: '#3a1800',
  },
  medalText: {
    fontFamily: 'Georgia',
    fontSize: 5.5,
    fontWeight: '700',
    color: '#3a1800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // XP row
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
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
    height: 4,
    backgroundColor: 'rgba(201,162,39,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpBar: {
    height: '100%',
    width: '3%',
    backgroundColor: '#c9a227',
    borderRadius: 2,
  },
  xpNext: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: '#c9a227',
    opacity: 0.6,
    letterSpacing: 1,
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
    marginTop: 10,
    fontFamily: 'Georgia',
    fontSize: 9,
    color: '#c9a227',
    letterSpacing: 2,
    opacity: 0.7,
  },

  // Bottom nav
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
