import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const GOLD = '#d4af37';
const BG = '#01050d';
const INACTIVE = '#6b7a8d';

export type MapSection = 'mine' | 'others' | 'share';

const TABS: { key: MapSection; label: string }[] = [
  { key: 'mine', label: 'MyWorldXP' },
  { key: 'others', label: 'OtrosXP' },
  { key: 'share', label: 'CompartirXP' },
];

// Selector tipo carpetas premium para las tres áreas del mapa. Puramente
// visual: no persiste nada, el estado vive en el padre (mapa.tsx).
export default function SocialTabs({
  active,
  onChange,
}: {
  active: MapSection;
  onChange: (section: MapSection) => void;
}) {
  return (
    <View style={styles.wrap}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: BG,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.15)',
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderColor: 'rgba(212,175,55,0.4)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: INACTIVE,
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: GOLD,
  },
});
