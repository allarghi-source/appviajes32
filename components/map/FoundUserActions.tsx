import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { createShareRequest, getShareRequestErrorMessage, ShareScope } from '../../utils/social';

const GOLD = '#d4af37';
const SURFACE = '#0d1a2e';
const BORDER = '#1e3050';
const TEXT = '#e8e0d0';
const MUTED = '#6b7a8d';
const DANGER = '#c0392b';

const SCOPE_VALUES: ShareScope[] = ['real', 'wishlist', 'both'];

// Acciones reales sobre un usuario encontrado: pedir acceso a su mundo u
// ofrecerle el propio. Solo dispara create_share_request — no crea relación
// local, no asume aceptación, no lee share_requests/share_relationships.
export default function FoundUserActions({
  targetId,
  targetUsername,
}: {
  targetId: string;
  targetUsername: string;
}) {
  const { t } = useTranslation('social');
  const [sendingAccess, setSendingAccess] = useState(false);
  const [accessSent, setAccessSent] = useState(false);

  const [choosingScope, setChoosingScope] = useState(false);
  const [selectedScope, setSelectedScope] = useState<ShareScope | null>(null);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [offerSent, setOfferSent] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRequestAccess() {
    if (sendingAccess || accessSent || choosingScope) return;
    setErrorMessage(null);
    setSendingAccess(true);
    try {
      await createShareRequest({ targetId, requestType: 'request_access' });
      setAccessSent(true);
    } catch (err) {
      setErrorMessage(getShareRequestErrorMessage(err, 'send'));
    } finally {
      setSendingAccess(false);
    }
  }

  function handleStartOffer() {
    if (offerSent || sendingAccess) return;
    setErrorMessage(null);
    setChoosingScope(true);
  }

  function handleCancelOffer() {
    setChoosingScope(false);
    setSelectedScope(null);
  }

  async function handleSendOffer() {
    if (sendingOffer || offerSent || !selectedScope) return;
    setErrorMessage(null);
    setSendingOffer(true);
    try {
      await createShareRequest({ targetId, requestType: 'offer_share', scope: selectedScope });
      setOfferSent(true);
      setChoosingScope(false);
    } catch (err) {
      setErrorMessage(getShareRequestErrorMessage(err, 'send'));
    } finally {
      setSendingOffer(false);
    }
  }

  return (
    <View style={styles.wrap}>
      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {accessSent ? (
        <View style={styles.doneBox}>
          <Text style={styles.doneText}>{t('foundUserActions.accessSentMessage')}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.actionBtn, (sendingAccess || choosingScope) && styles.btnDisabled]}
          onPress={handleRequestAccess}
          disabled={sendingAccess || choosingScope}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>
            {sendingAccess ? t('common.sending') : t('foundUserActions.requestAccess')}
          </Text>
        </TouchableOpacity>
      )}

      {offerSent ? (
        <View style={styles.doneBox}>
          <Text style={styles.doneText}>{t('foundUserActions.offerSentMessage')}</Text>
        </View>
      ) : !choosingScope ? (
        <TouchableOpacity
          style={[styles.actionBtnSecondary, sendingAccess && styles.btnDisabled]}
          onPress={handleStartOffer}
          disabled={sendingAccess}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnSecondaryText}>{t('foundUserActions.shareMyWorld')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.scopeWrap}>
          <Text style={styles.scopeLabel}>{t('foundUserActions.chooseScopeWith', { username: targetUsername })}</Text>
          <View style={styles.scopeRow}>
            {SCOPE_VALUES.map((value) => {
              const isSelected = selectedScope === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.scopeOption, isSelected && styles.scopeOptionSelected]}
                  onPress={() => setSelectedScope(value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.scopeOptionText, isSelected && styles.scopeOptionTextSelected]}>
                    {t(`scopes.options.${value}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.scopeActions}>
            <TouchableOpacity
              style={styles.scopeCancelBtn}
              onPress={handleCancelOffer}
              disabled={sendingOffer}
              activeOpacity={0.7}
            >
              <Text style={styles.scopeCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.scopeSendBtn, (!selectedScope || sendingOffer) && styles.btnDisabled]}
              onPress={handleSendOffer}
              disabled={!selectedScope || sendingOffer}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>
                {sendingOffer ? t('common.sending') : t('foundUserActions.sendInvite')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', marginTop: 14, gap: 10 },

  errorBox: {
    backgroundColor: 'rgba(192,57,43,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { color: DANGER, fontSize: 12, lineHeight: 17 },

  actionBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  actionBtnText: { color: '#01050d', fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },

  actionBtnSecondary: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  actionBtnSecondaryText: { color: TEXT, fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },

  btnDisabled: { opacity: 0.55 },

  doneBox: {
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  doneText: { color: GOLD, fontSize: 13, fontWeight: '700' },

  scopeWrap: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  scopeLabel: { color: TEXT, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  scopeRow: { flexDirection: 'row', gap: 8 },
  scopeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#0b1525',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scopeOptionSelected: {
    borderColor: 'rgba(212,175,55,0.6)',
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  scopeOptionText: { color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  scopeOptionTextSelected: { color: GOLD },

  scopeActions: { flexDirection: 'row', gap: 8 },
  scopeCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  scopeCancelText: { color: MUTED, fontSize: 13, fontWeight: '600' },
  scopeSendBtn: { flex: 1.4 },
});
