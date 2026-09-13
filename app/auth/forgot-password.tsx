import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AUTH_FALLBACK_ROUTE, getAuthErrorMessage, isValidEmail, normalizeEmail } from '../../utils/auth';
import { supabase } from '../../utils/supabase';

const BG = '#01050d';
const GOLD = '#d4af37';
const SURFACE = '#0d1a2e';
const BORDER = '#1e3050';
const TEXT = '#e8e0d0';
const MUTED = '#6b7a8d';
const DANGER = '#c0392b';

export default function ForgotPassword() {
  const router = useRouter();
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace(AUTH_FALLBACK_ROUTE);
  }

  async function handleSubmit() {
    if (submitting) return;
    setErrorMessage(null);

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage('Ingresá un email válido.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: 'myworldxp://auth/reset-password',
      });

      if (!mountedRef.current) return;

      // Supabase tiene un comportamiento neutro acá: no confirma ni niega si
      // el email existe. Solo se maneja como error real un fallo de verdad
      // (red, rate limit, etc.), nunca "email no encontrado".
      if (error) {
        setErrorMessage(getAuthErrorMessage(error, 'forgot-password'));
        return;
      }

      setSent(true);
    } catch (err) {
      if (!mountedRef.current) return;
      setErrorMessage(getAuthErrorMessage(err, 'forgot-password'));
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backLabel}>Volver</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Recuperar contraseña</Text>

        {sent ? (
          <>
            <Text style={styles.subtitle}>
              Si ese email tiene una cuenta, te enviamos un enlace para recuperar tu contraseña.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={goBack} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Volver</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Te enviamos un enlace para recuperar tu contraseña.</Text>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor={MUTED}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{submitting ? 'Enviando...' : 'Enviar enlace'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backIcon: { fontSize: 32, color: GOLD, lineHeight: 34, marginTop: -2 },
  backLabel: { fontSize: 15, color: GOLD, fontWeight: '600' },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 48 },

  title: { fontSize: 26, fontWeight: '800', color: TEXT, marginTop: 8 },
  subtitle: { fontSize: 13, color: MUTED, marginTop: 6, marginBottom: 24, lineHeight: 19 },

  errorBox: {
    backgroundColor: 'rgba(192,57,43,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  errorText: { color: DANGER, fontSize: 13, lineHeight: 18 },

  label: { fontSize: 12, fontWeight: '700', color: GOLD, letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    color: TEXT,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 4,
  },

  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: BG, fontSize: 15, fontWeight: '700' },
});
