import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AUTH_FALLBACK_ROUTE, getAuthErrorMessage } from '../../utils/auth';
import { supabase } from '../../utils/supabase';

const BG = '#01050d';
const GOLD = '#d4af37';
const TEXT = '#e8e0d0';
const MUTED = '#6b7a8d';
const DANGER = '#c0392b';

type Status = 'verifying' | 'success' | 'error';

// Maneja myworldxp://auth/confirm (?code=...). Expo Router ya resuelve este
// deep link -- tanto en frío como con la app abierta -- y expone `code` acá
// mismo vía useLocalSearchParams; no hace falta un listener global de Linking.
export default function Confirm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Evita un segundo exchangeCodeForSession si el efecto se vuelve a disparar
  // (re-render, fast refresh). El código PKCE es de un solo uso: un segundo
  // intento fallaría igual, pero no queremos ni intentarlo.
  const exchangedRef = useRef(false);

  const [status, setStatus] = useState<Status>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Sin `code` no hay nada que intercambiar: ese caso se resuelve como valor
    // derivado en el render (ver `effectiveStatus` más abajo), no acá.
    if (!code || exchangedRef.current) return;
    exchangedRef.current = true;

    // Si exchangeCodeForSession falla, puede ser porque perdió la carrera
    // contra otro canje del mismo `code` que sí tuvo éxito (el link se
    // procesó dos veces). getSession() no adivina: solo hay sesión acá si el
    // SDK ya la persistió de verdad, así que es prueba real de éxito, no una
    // suposición. No se reintenta exchangeCodeForSession en ningún caso.
    async function handleExchangeFailure(err: unknown) {
      const { data } = await supabase.auth.getSession();
      if (!mountedRef.current) return;
      if (data.session) {
        setStatus('success');
        return;
      }
      setStatus('error');
      setErrorMessage(getAuthErrorMessage(err, 'confirm'));
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (!mountedRef.current) return;
        if (error) {
          handleExchangeFailure(error);
          return;
        }
        setStatus('success');
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        handleExchangeFailure(err);
      });
  }, [code]);

  const effectiveStatus: Status = !code ? 'error' : status;
  const effectiveErrorMessage = !code
    ? 'El enlace no es válido: falta el código de confirmación.'
    : errorMessage;

  function handleContinue() {
    // exchangeCodeForSession ya deja la sesión iniciada si tuvo éxito: no se
    // hace logout artificial acá, solo se sale de Auth.
    router.replace(AUTH_FALLBACK_ROUTE);
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {effectiveStatus === 'verifying' && (
          <>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={styles.title}>Verificando tu email...</Text>
          </>
        )}

        {effectiveStatus === 'success' && (
          <>
            <Text style={styles.icon}>✓</Text>
            <Text style={styles.title}>Email confirmado</Text>
            <Text style={styles.body}>Tu cuenta ya está lista.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Continuar</Text>
            </TouchableOpacity>
          </>
        )}

        {effectiveStatus === 'error' && (
          <>
            <Text style={[styles.icon, styles.iconError]}>✕</Text>
            <Text style={styles.title}>No pudimos confirmar tu email</Text>
            <Text style={styles.body}>{effectiveErrorMessage}</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/auth/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Ir a iniciar sesión</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' },

  icon: { fontSize: 48, color: GOLD, marginBottom: 18, fontWeight: '800' },
  iconError: { color: DANGER },

  title: { fontSize: 20, fontWeight: '800', color: TEXT, textAlign: 'center', marginTop: 18 },
  body: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 10, lineHeight: 20 },

  primaryBtn: {
    marginTop: 28,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryBtnText: { color: BG, fontSize: 15, fontWeight: '700' },
});
