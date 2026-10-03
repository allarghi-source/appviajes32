import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useSession } from '../../contexts/SessionProvider';
import { getSocialLoadErrorMessage } from '../../utils/social';
import { fetchSharedOwners, SharedOwner } from '../../utils/sharedWorld';
import OtherWorldMap from './OtherWorldMap';

const GOLD = '#d4af37';
const SURFACE = '#0d1a2e';
const BORDER = '#1e3050';
const MUTED = '#6b7a8d';
const DANGER = '#c0392b';

// OtrosXP: personas que hoy me comparten su mundo (solo @username) y, al
// tocar una, su mapa de solo lectura dentro de esta misma sección. Sin
// sesión verificada no hay nada que mostrar: mismo estado vacío que sin
// mundos compartidos. Se monta al entrar a la pestaña (mapa.tsx), así que
// cada entrada consulta el estado actual. Sin realtime ni polling.
export default function OtrosXpTab() {
  const { t } = useTranslation(['map', 'social']);
  const { session, loading } = useSession();
  const verified = !!session?.user.email_confirmed_at;
  const userId = session?.user.id;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.mutedText}>{t('social:loading')}</Text>
      </View>
    );
  }

  if (!verified || !userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{t('map:othersSection.empty')}</Text>
      </View>
    );
  }

  // `key`: si cambia la cuenta, se descarta todo (lista y owner abierto).
  return <OtrosXpContent key={userId} myUserId={userId} />;
}

function OtrosXpContent({ myUserId }: { myUserId: string }) {
  const { t } = useTranslation(['map', 'social']);

  const [owners, setOwners] = useState<SharedOwner[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SharedOwner | null>(null);
  // Mismo patrón que PendingRequests: la carga se deriva de "para qué token
  // ya se resolvió", sin un booleano seteado a mano dentro del efecto.
  const [reloadToken, setReloadToken] = useState(0);
  const [fetchedToken, setFetchedToken] = useState<number | null>(null);
  const loadingList = fetchedToken !== reloadToken;

  useEffect(() => {
    // Una respuesta vieja (desmontado, o ya se pidió otro refresh) se ignora.
    let stale = false;
    fetchSharedOwners(myUserId)
      .then((list) => {
        if (stale) return;
        setOwners(list);
        setLoadError(null);
        setFetchedToken(reloadToken);
      })
      .catch((err) => {
        if (stale) return;
        setOwners([]);
        setLoadError(getSocialLoadErrorMessage(err));
        setFetchedToken(reloadToken);
      });
    return () => { stale = true; };
  }, [myUserId, reloadToken]);

  function reloadList() {
    setReloadToken((n) => n + 1);
  }

  // Volver a la lista (o que la relación haya dejado de existir mientras
  // miraba ese mundo): se cierra el mundo y se recarga la lista, sin
  // conservar nada de lo que se estaba mostrando. Estable (useCallback)
  // porque OtherWorldMap lo usa como dependencia de su carga.
  const closeWorld = useCallback(() => {
    setSelected(null);
    setReloadToken((n) => n + 1);
  }, []);

  if (selected) {
    return (
      <OtherWorldMap
        key={selected.id}
        myUserId={myUserId}
        owner={selected}
        onBack={closeWorld}
        onRevoked={closeWorld}
      />
    );
  }

  return (
    <View style={styles.listRoot}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{t('map:tabs.others')}</Text>
        <TouchableOpacity onPress={reloadList} disabled={loadingList} activeOpacity={0.7}>
          <Text style={styles.refreshText}>
            {loadingList ? t('social:loading') : t('map:othersSection.refresh')}
          </Text>
        </TouchableOpacity>
      </View>

      {loadError && !loadingList && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      )}

      {!loadError && !loadingList && owners.length === 0 && (
        <Text style={styles.emptyText}>{t('map:othersSection.empty')}</Text>
      )}

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {owners.map((o) => (
          <TouchableOpacity
            key={o.id}
            style={styles.ownerRow}
            onPress={() => setSelected(o)}
            activeOpacity={0.8}
          >
            <Text style={styles.ownerUsername}>@{o.username}</Text>
            <Text style={styles.ownerArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  mutedText: { color: MUTED, fontSize: 13 },
  emptyText: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
    opacity: 0.8,
  },

  listRoot: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 12, fontWeight: '700', color: GOLD, letterSpacing: 1 },
  refreshText: { fontSize: 11, color: MUTED, fontWeight: '600' },

  errorBox: {
    backgroundColor: 'rgba(192,57,43,0.12)',
    borderColor: 'rgba(192,57,43,0.4)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  errorText: { color: DANGER, fontSize: 12, textAlign: 'center' },

  listContent: { paddingBottom: 24 },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  ownerUsername: { fontSize: 15, fontWeight: '700', color: GOLD, letterSpacing: 0.3 },
  ownerArrow: { fontSize: 18, color: GOLD, opacity: 0.6 },
});
