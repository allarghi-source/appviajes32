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

export default function Login() {
  const router = useRouter();
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (!password) {
      setErrorMessage('Ingresá tu contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!mountedRef.current) return;

      if (error) {
        setErrorMessage(getAuthErrorMessage(error, 'login'));
        return;
      }

      // Éxito: todavía no hay un destino social al que entrar (CompartirXP no
      // está conectado en este bloque), así que solo se sale de Auth.
      if (router.canGoBack()) router.back();
      else router.replace(AUTH_FALLBACK_ROUTE);
    } catch (err) {
      if (!mountedRef.current) return;
      setErrorMessage(getAuthErrorMessage(err, 'login'));
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
        <Text style={styles.title}>Iniciar sesión</Text>
        <Text style={styles.subtitle}>Para usar CompartirXP.</Text>

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

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu contraseña"
          placeholderTextColor={MUTED}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          onPress={() => router.push('/auth/forgot-password')}
          activeOpacity={0.7}
          style={styles.forgotWrap}
        >
          <Text style={styles.linkTextGold}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, submitting && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{submitting ? 'Ingresando...' : 'Iniciar sesión'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/auth/signup')}
          activeOpacity={0.7}
          style={styles.linkWrap}
        >
          <Text style={styles.linkText}>¿No tenés cuenta? <Text style={styles.linkTextGold}>Crear cuenta</Text></Text>
        </TouchableOpacity>
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
  subtitle: { fontSize: 13, color: MUTED, marginTop: 6, marginBottom: 24 },

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

  forgotWrap: { alignSelf: 'flex-end', marginTop: 10 },

  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: BG, fontSize: 15, fontWeight: '700' },

  linkWrap: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 13, color: MUTED },
  linkTextGold: { color: GOLD, fontWeight: '700', fontSize: 13 },
});
