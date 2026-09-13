import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { findUserExact, getSocialErrorMessage, normalizeSearchQuery } from '../../utils/social';
import FoundUserActions from './FoundUserActions';

const GOLD = '#d4af37';
const SURFACE = '#0d1a2e';
const BORDER = '#1e3050';
const TEXT = '#e8e0d0';
const MUTED = '#6b7a8d';
const DANGER = '#c0392b';

type SearchResult =
  | { kind: 'found'; id: string; username: string }
  | { kind: 'self' }
  | { kind: 'not_found' };

// Buscador exacto por @username o email. Solo confirma visualmente a quién
// encontró: sin solicitudes, sin scopes, sin acciones sociales todavía.
export default function UserSearch({ myUserId }: { myUserId: string }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSearch() {
    if (searching) return;
    setErrorMessage(null);
    setResult(null);

    const normalized = normalizeSearchQuery(query);
    if (!normalized) {
      setErrorMessage('Ingresá un @usuario o email para buscar.');
      return;
    }

    setSearching(true);
    try {
      const found = await findUserExact(normalized);

      if (!found) {
        setResult({ kind: 'not_found' });
        return;
      }
      if (found.id === myUserId) {
        setResult({ kind: 'self' });
        return;
      }
      setResult({ kind: 'found', id: found.id, username: found.username });
    } catch (err) {
      setErrorMessage(getSocialErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Buscar @usuario o email</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="@usuario o email"
          placeholderTextColor={MUTED}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={[styles.searchBtn, searching && styles.btnDisabled]}
          onPress={handleSearch}
          disabled={searching}
          activeOpacity={0.85}
        >
          <Text style={styles.searchBtnText}>{searching ? '...' : 'BUSCAR'}</Text>
        </TouchableOpacity>
      </View>

      {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {!searching && result?.kind === 'found' && (
        <>
          <View style={styles.resultCard}>
            <Text style={styles.resultUsername}>@{result.username}</Text>
            <Text style={styles.resultTag}>Usuario encontrado</Text>
          </View>
          <FoundUserActions key={result.id} targetId={result.id} targetUsername={result.username} />
        </>
      )}

      {!searching && result?.kind === 'self' && (
        <View style={styles.resultBox}>
          <Text style={styles.resultInfoText}>Ese es tu propio usuario.</Text>
        </View>
      )}

      {!searching && result?.kind === 'not_found' && (
        <View style={styles.resultBox}>
          <Text style={styles.resultInfoText}>Usuario no encontrado.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', marginTop: 28 },
  label: { fontSize: 12, fontWeight: '700', color: GOLD, letterSpacing: 1, marginBottom: 8 },

  searchRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    color: TEXT,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.55 },
  searchBtnText: { color: '#01050d', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  errorBox: {
    backgroundColor: 'rgba(192,57,43,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  errorText: { color: DANGER, fontSize: 12, lineHeight: 17 },

  resultBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  resultInfoText: { color: MUTED, fontSize: 13 },

  resultCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  resultUsername: { color: GOLD, fontSize: 18, fontWeight: '800' },
  resultTag: { color: MUTED, fontSize: 11, marginTop: 4, letterSpacing: 0.5 },
});
