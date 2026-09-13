import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AUTH_FALLBACK_ROUTE, getAuthErrorMessage, isValidPassword, MIN_PASSWORD_LENGTH } from '../../utils/auth';
import { supabase } from '../../utils/supabase';

const BG = '#01050d';
const GOLD = '#d4af37';
const SURFACE = '#0d1a2e';
const BORDER = '#1e3050';
const TEXT = '#e8e0d0';
const MUTED = '#6b7a8d';
const DANGER = '#c0392b';

type Status = 'verifying' | 'form' | 'success' | 'error';

// Maneja myworldxp://auth/reset-password (?code=...), igual que confirm.tsx:
// Expo Router resuelve el deep link y expone `code` vía useLocalSearchParams,
// sin necesidad de un listener global de Linking.
export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Un solo exchangeCodeForSession por más que el efecto se re-dispare.
  const exchangedRef = useRef(false);

  const [status, setStatus] = useState<Status>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    // Sin `code` no hay nada que intercambiar: ese caso se resuelve como valor
    // derivado en el render (ver `effectiveStatus` más abajo), no acá.
    if (!code || exchangedRef.current) return;
    exchangedRef.current = true;

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (!mountedRef.current) return;
        if (error) {
          setStatus('error');
          setErrorMessage(getAuthErrorMessage(error, 'reset-password'));
          return;
        }
        setStatus('form');
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setStatus('error');
        setErrorMessage(getAuthErrorMessage(err, 'reset-password'));
      });
  }, [code]);

  const effectiveStatus: Status = !code ? 'error' : status;
  const effectiveErrorMessage = !code
    ? 'El enlace no es válido: falta el código de recuperación.'
    : errorMessage;

  async function handleSubmit() {
    if (submitting) return;
    setFormError(null);

    if (!isValidPassword(password)) {
      setFormError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (!mountedRef.current) return;

      if (error) {
        setFormError(getAuthErrorMessage(error, 'reset-password'));
        return;
      }

      setStatus('success');
    } catch (err) {
      if (!mountedRef.current) return;
      setFormError(getAuthErrorMessage(err, 'reset-password'));
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }

  function handleContinue() {
    // updateUser mantiene la sesión ya autenticada: no se hace logout
    // artificial, solo se sale de Auth.
    router.replace(AUTH_FALLBACK_ROUTE);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        {effectiveStatus === 'verifying' && (
          <>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={styles.title}>Verificando el enlace...</Text>
          </>
        )}

        {effectiveStatus === 'error' && (
          <>
            <Text style={[styles.icon, styles.iconError]}>✕</Text>
            <Text style={styles.title}>No pudimos validar el enlace</Text>
            <Text style={styles.body}>{effectiveErrorMessage}</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/auth/forgot-password')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Solicitar un nuevo enlace</Text>
            </TouchableOpacity>
          </>
        )}

        {effectiveStatus === 'form' && (
          <View style={styles.formWrap}>
            <Text style={styles.title}>Elegir nueva contraseña</Text>

            {formError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            )}

            <Text style={styles.label}>Nueva contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={MUTED}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.label}>Repetir contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Repetí tu contraseña"
              placeholderTextColor={MUTED}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{submitting ? 'Guardando...' : 'Guardar contraseña'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {effectiveStatus === 'success' && (
          <>
            <Text style={styles.icon}>✓</Text>
            <Text style={styles.title}>Contraseña actualizada</Text>
            <Text style={styles.body}>Tu contraseña se cambió correctamente.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Continuar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' },
  formWrap: { alignSelf: 'stretch' },

  icon: { fontSize: 48, color: GOLD, marginBottom: 18, fontWeight: '800' },
  iconError: { color: DANGER },

  title: { fontSize: 20, fontWeight: '800', color: TEXT, textAlign: 'center', marginTop: 18, marginBottom: 4 },
  body: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 10, lineHeight: 20 },

  errorBox: {
    backgroundColor: 'rgba(192,57,43,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 4,
  },
  errorText: { color: DANGER, fontSize: 13, lineHeight: 18 },

  label: { fontSize: 12, fontWeight: '700', color: GOLD, letterSpacing: 1, marginBottom: 8, marginTop: 20 },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    color: TEXT,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  primaryBtn: {
    marginTop: 28,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: BG, fontSize: 15, fontWeight: '700' },
});
