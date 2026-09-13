import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  fetchPendingShareRequests,
  getShareRequestErrorMessage,
  PendingShareRequest,
  respondShareRequest,
  ShareScope,
} from '../../utils/social';

const GOLD = '#d4af37';
const SURFACE = '#0d1a2e';
const BORDER = '#1e3050';
const TEXT = '#e8e0d0';
const MUTED = '#6b7a8d';
const DANGER = '#c0392b';

const SCOPE_OPTIONS: { value: ShareScope; label: string }[] = [
  { value: 'realized', label: 'REALIZADOS' },
  { value: 'wishlist', label: 'WISHLIST' },
  { value: 'both', label: 'AMBOS' },
];

const SCOPE_LABELS: Record<ShareScope, string> = {
  realized: 'Realizados',
  wishlist: 'Wishlist',
  both: 'Ambos',
};

// Bandeja de solicitudes pendientes reales dirigidas a mí. Solo lectura +
// respond_share_request — nunca escribe directo en share_requests ni en
// share_relationships, nunca abre mapas ajenos ni lee shared_trips.
export default function PendingRequests({ myUserId }: { myUserId: string }) {
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [requests, setRequests] = useState<PendingShareRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  // userId para el que ya se resolvió la lista. Mientras no coincida con
  // `myUserId`, todavía está cargando — se deriva en vez de guardar un
  // booleano aparte seteado a mano en el efecto.
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const loading = fetchedFor !== myUserId;

  useEffect(() => {
    fetchPendingShareRequests(myUserId)
      .then((list) => {
        if (!mountedRef.current) return;
        setRequests(list);
        setLoadError(null);
        setFetchedFor(myUserId);
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setRequests([]);
        setLoadError(getShareRequestErrorMessage(err));
        setFetchedFor(myUserId);
      });
    // reloadToken solo existe para forzar una recarga manual; no participa
    // en ninguna lógica más allá de disparar este efecto de nuevo.
  }, [myUserId, reloadToken]);

  function handleRefresh() {
    if (loading) return;
    setFetchedFor(null);
    setReloadToken((t) => t + 1);
  }

  function handleResponded(requestId: string) {
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  const accessRequests = requests.filter((r) => r.requestType === 'request_access');
  const offerRequests = requests.filter((r) => r.requestType === 'offer_share');

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Solicitudes pendientes</Text>
        <TouchableOpacity onPress={handleRefresh} disabled={loading} activeOpacity={0.7}>
          <Text style={styles.refreshText}>{loading ? 'Cargando...' : '↻ Actualizar'}</Text>
        </TouchableOpacity>
      </View>

      {loading && requests.length === 0 && !loadError && (
        <Text style={styles.loadingText}>Cargando solicitudes...</Text>
      )}

      {!loading && loadError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      )}

      {!loading && !loadError && requests.length === 0 && (
        <Text style={styles.emptyText}>No tenés solicitudes pendientes.</Text>
      )}

      {accessRequests.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Quieren ver mi mundo</Text>
          {accessRequests.map((r) => (
            <RequestCard key={r.id} request={r} onResponded={handleResponded} />
          ))}
        </View>
      )}

      {offerRequests.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Me compartieron su mundo</Text>
          {offerRequests.map((r) => (
            <RequestCard key={r.id} request={r} onResponded={handleResponded} />
          ))}
        </View>
      )}
    </View>
  );
}

function RequestCard({
  request,
  onResponded,
}: {
  request: PendingShareRequest;
  onResponded: (id: string) => void;
}) {
  const isAccessRequest = request.requestType === 'request_access';

  const [choosingScope, setChoosingScope] = useState(false);
  const [selectedScope, setSelectedScope] = useState<ShareScope | null>(null);
  const [responding, setResponding] = useState<'accept' | 'reject' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function doRespond(accept: boolean, scope?: ShareScope) {
    setErrorMessage(null);
    setResponding(accept ? 'accept' : 'reject');
    try {
      await respondShareRequest({ requestId: request.id, accept, scope });
      onResponded(request.id);
    } catch (err) {
      setErrorMessage(getShareRequestErrorMessage(err));
    } finally {
      setResponding(null);
    }
  }

  function handleAcceptPress() {
    if (responding) return;
    setErrorMessage(null);
    if (isAccessRequest) {
      // El dueño del mundo soy yo: elijo el scope recién acá, no antes.
      setChoosingScope(true);
      return;
    }
    // offer_share: el scope ya lo eligió quien ofreció, no se toca desde acá.
    void doRespond(true);
  }

  function handleCancelScope() {
    setChoosingScope(false);
    setSelectedScope(null);
  }

  async function handleConfirmScope() {
    if (!selectedScope || responding) return;
    await doRespond(true, selectedScope);
  }

  async function handleReject() {
    if (responding) return;
    await doRespond(false);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardUsername}>@{request.senderUsername}</Text>
      <Text style={styles.cardSubtitle}>
        {isAccessRequest
          ? 'Quiere ver tu mundo'
          : `Te ofrece compartir: ${SCOPE_LABELS[request.scope ?? 'both']}`}
      </Text>

      {errorMessage && (
        <View style={styles.cardErrorBox}>
          <Text style={styles.cardErrorText}>{errorMessage}</Text>
        </View>
      )}

      {choosingScope ? (
        <View style={styles.scopeWrap}>
          <Text style={styles.scopeLabel}>¿Qué le vas a compartir?</Text>
          <View style={styles.scopeRow}>
            {SCOPE_OPTIONS.map((opt) => {
              const isSelected = selectedScope === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.scopeOption, isSelected && styles.scopeOptionSelected]}
                  onPress={() => setSelectedScope(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.scopeOptionText, isSelected && styles.scopeOptionTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancelScope}
              disabled={responding !== null}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, (!selectedScope || responding !== null) && styles.btnDisabled]}
              onPress={handleConfirmScope}
              disabled={!selectedScope || responding !== null}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>
                {responding === 'accept' ? 'Enviando...' : 'CONFIRMAR'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.rejectBtn, responding !== null && styles.btnDisabled]}
            onPress={handleReject}
            disabled={responding !== null}
            activeOpacity={0.8}
          >
            <Text style={styles.rejectBtnText}>{responding === 'reject' ? '...' : 'RECHAZAR'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptBtn, responding !== null && styles.btnDisabled]}
            onPress={handleAcceptPress}
            disabled={responding !== null}
            activeOpacity={0.85}
          >
            <Text style={styles.acceptBtnText}>{responding === 'accept' ? 'Enviando...' : 'ACEPTAR'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', marginTop: 28 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: GOLD, letterSpacing: 1 },
  refreshText: { fontSize: 11, color: MUTED, fontWeight: '600' },

  loadingText: { fontSize: 12, color: MUTED },
  emptyText: { fontSize: 12, color: MUTED, fontStyle: 'italic', opacity: 0.85 },

  errorBox: {
    backgroundColor: 'rgba(192,57,43,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { color: DANGER, fontSize: 12, lineHeight: 17 },

  group: { marginTop: 16 },
  groupTitle: { fontSize: 12, fontWeight: '700', color: TEXT, marginBottom: 8, opacity: 0.85 },

  card: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 4,
  },
  cardUsername: { color: GOLD, fontSize: 15, fontWeight: '800' },
  cardSubtitle: { color: MUTED, fontSize: 12 },

  cardErrorBox: {
    backgroundColor: 'rgba(192,57,43,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.4)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  cardErrorText: { color: DANGER, fontSize: 11, lineHeight: 15 },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.4)',
    backgroundColor: 'rgba(192,57,43,0.08)',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  rejectBtnText: { color: DANGER, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  acceptBtn: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  acceptBtnText: { color: '#01050d', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.55 },

  scopeWrap: { marginTop: 6, gap: 10 },
  scopeLabel: { color: TEXT, fontSize: 12, fontWeight: '600' },
  scopeRow: { flexDirection: 'row', gap: 8 },
  scopeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#0b1525',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  scopeOptionSelected: {
    borderColor: 'rgba(212,175,55,0.6)',
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  scopeOptionText: { color: MUTED, fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  scopeOptionTextSelected: { color: GOLD },

  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  cancelBtnText: { color: MUTED, fontSize: 12, fontWeight: '600' },
  confirmBtn: {
    flex: 1.4,
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#01050d', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
});
