import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

const GOLD = '#d4af37';
const INACTIVE = '#3a4a5a';
const NAV_BG = '#010810';

export const NAV_HEIGHT = 68;

function PassportIcon({ active }: { active: boolean }) {
  const c = active ? GOLD : INACTIVE;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={2} width={16} height={20} rx={2} />
      <Line x1={4} y1={9} x2={20} y2={9} />
      <Circle cx={12} cy={15} r={2} />
    </Svg>
  );
}

function TimelineIcon({ active }: { active: boolean }) {
  const c = active ? GOLD : INACTIVE;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round">
      <Line x1={9} y1={4} x2={9} y2={20} />
      <Circle cx={9} cy={5} r={2} fill={active ? GOLD : 'none'} stroke={c} />
      <Circle cx={9} cy={12} r={2} fill="none" />
      <Circle cx={9} cy={19} r={2} fill="none" />
      <Line x1={9} y1={5} x2={16} y2={5} />
      <Line x1={9} y1={12} x2={16} y2={12} />
      <Line x1={9} y1={19} x2={16} y2={19} />
    </Svg>
  );
}

function MapIcon({ active }: { active: boolean }) {
  const c = active ? GOLD : INACTIVE;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2C8.68 2 6 4.68 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.32-2.68-6-6-6z" />
      <Circle cx={12} cy={8} r={2} />
    </Svg>
  );
}

function AddIcon({ active }: { active: boolean }) {
  const c = active ? GOLD : INACTIVE;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Line x1={12} y1={8} x2={12} y2={16} />
      <Line x1={8} y1={12} x2={16} y2={12} />
    </Svg>
  );
}

function StatsIcon({ active }: { active: boolean }) {
  const c = active ? GOLD : INACTIVE;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={13} width={4} height={8} rx={1} />
      <Rect x={10} y={8} width={4} height={13} rx={1} />
      <Rect x={16} y={3} width={4} height={18} rx={1} />
    </Svg>
  );
}

const ITEMS = [
  { route: '/passportinside', label: 'Pasaporte', Icon: PassportIcon },
  { route: '/timeline',       label: 'Timeline',  Icon: TimelineIcon },
  { route: '/mapa',           label: 'Mapa',      Icon: MapIcon },
  { route: '/cargar',         label: 'Cargar',    Icon: AddIcon },
  { route: '/estadisticas',   label: 'Stats',     Icon: StatsIcon },
] as const;

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.bar}>
      {ITEMS.map(({ route, label, Icon }) => {
        const active = pathname === route;
        return (
          <TouchableOpacity
            key={route}
            style={styles.item}
            onPress={() => { if (!active) router.push(route); }}
            activeOpacity={0.65}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Icon active={active} />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: NAV_BG,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,175,55,0.15)',
    paddingTop: 8,
    paddingBottom: 10,
    height: NAV_HEIGHT,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 40,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(212,175,55,0.10)',
  },
  label: {
    fontSize: 9,
    color: INACTIVE,
    letterSpacing: 0.3,
    fontWeight: '500',
  },
  labelActive: {
    color: GOLD,
    fontWeight: '700',
  },
});
