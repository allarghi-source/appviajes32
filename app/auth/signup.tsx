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

import {
  AUTH_FALLBACK_ROUTE,
  getAuthErrorMessage,
  isValidEmail,
  isValidPassword,
  isValidUsername,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  normalizeUsername,
} from '../../utils/auth';
import { supabase } from '../../utils/supabase';

const BG = '#01050d';
const GOLD = '#d4af37';
const SURFACE = '#0d1a2e';
const BORDER = '#1e3050';
const TEXT = '#e8e0d0';
const MUTED = '#6b7a8d';
const DANGER = '#c0392b';

export default function Signup() {
  const router = useRouter();
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace(AUTH_FALLBACK_ROUTE);
  }

  async function handleSubmit() {
    if (submitting) return;
    setErrorMessage(null);

    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = normalizeEmail(email);

    if (!isValidUsername(normalizedUsername)) {
      setErrorMessage('El usuario debe tener 5 a 15 caracteres: minúsculas, números, punto o guion bajo.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage('Ingresá un email válido.');
      return;
    }
    if (!isValidPassword(password)) {
      setErrorMessage(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { username: normalizedUsername },
          emailRedirectTo: 'myworldxp://auth/confirm',
        },
      });

      if (!mountedRef.current) return;

      if (error) {
        setErrorMessage(getAuthErrorMessage(error, 'signup'));
        return;
      }

      // Con "Confirm email" ON, Supabase responde 200 con `identities: []`
      // cuando el email ya pertenece a una cuenta confirmada (protección
      // anti-enumeración), en vez de un error explícito.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setErrorMessage('Ese email ya está registrado. Iniciá sesión o recuperá tu contraseña.');
        return;
      }

      router.push({ pathname: '/auth/check-email', params: { email: normalizedEmail } });
    } catch (err) {
      if (!mountedRef.current) return;
      setErrorMessage(getAuthErrorMessage(err, 'signup'));
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
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Necesaria solo para CompartirXP.</Text>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <Text style={styles.label}>Usuario</Text>
        <TextInput
          style={styles.input}
          placeholder="tu_usuario"
          placeholderTextColor={MUTED}
          value={username}
          onChangeText={(t) => setUsername(normalizeUsername(t))}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
        <Text style={styles.hint}>5–15 caracteres: minúsculas, números, punto o guion bajo.</Text>

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
          <Text style={styles.primaryBtnText}>{submitting ? 'Creando cuenta...' : 'Crear cuenta'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/auth/login')}
          activeOpacity={0.7}
          style={styles.linkWrap}
        >
          <Text style={styles.linkText}>¿Ya tenés cuenta? <Text style={styles.linkTextGold}>Iniciar sesión</Text></Text>
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
  hint: { fontSize: 11, color: MUTED, marginBottom: 16 },

  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: BG, fontSize: 15, fontWeight: '700' },

  linkWrap: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 13, color: MUTED },
  linkTextGold: { color: GOLD, fontWeight: '700' },
});
