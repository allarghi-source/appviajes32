import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AUTH_FALLBACK_ROUTE, getAuthErrorMessage } from '../../utils/auth';
import { supabase } from '../../utils/supabase';

const BG = '#01050d';
const GOLD = '#d4af37';
const SURFACE = '#0d1a2e';
const BORDER = '#1e3050';
const TEXT = '#e8e0d0';
const MUTED = '#6b7a8d';
const DANGER = '#c0392b';

const RESEND_COOLDOWN_SECONDS = 30;

export default function CheckEmail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = Array.isArray(params.email) ? params.email[0] : params.email;

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function goToLogin() {
    router.replace('/auth/login');
  }

  async function handleResend() {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: 'myworldxp://auth/confirm' },
      });

      if (!mountedRef.current) return;

      if (error) {
        setFeedback({ text: getAuthErrorMessage(error, 'resend'), isError: true });
        return;
      }
      setFeedback({ text: 'Te reenviamos el email de confirmación.', isError: false });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      if (!mountedRef.current) return;
      setFeedback({ text: getAuthErrorMessage(err, 'resend'), isError: true });
    } finally {
      if (mountedRef.current) setResending(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace(AUTH_FALLBACK_ROUTE)}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backLabel}>Volver</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.icon}>✉</Text>
        <Text style={styles.title}>Revisá tu email</Text>
        <Text style={styles.body}>
          Te enviamos un enlace para confirmar tu cuenta{email ? ' a' : '.'}
          {email ? <Text style={styles.emailText}>{'\n'}{email}</Text> : null}
        </Text>
        <Text style={styles.bodySecondary}>
          Hasta que confirmes tu email, tu cuenta no queda habilitada para CompartirXP.
        </Text>

        {feedback && (
          <View style={[styles.feedbackBox, feedback.isError && styles.feedbackBoxError]}>
            <Text style={[styles.feedbackText, feedback.isError && styles.feedbackTextError]}>
              {feedback.text}
            </Text>
          </View>
        )}

        {email && (
          <TouchableOpacity
            style={[styles.secondaryBtn, (resending || cooldown > 0) && styles.btnDisabled]}
            onPress={handleResend}
            disabled={resending || cooldown > 0}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>
              {resending ? 'Enviando...' : cooldown > 0 ? `Reenviar (${cooldown}s)` : 'Reenviar email'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.primaryBtn} onPress={goToLogin} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
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

  content: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 44, color: GOLD, marginBottom: 18, opacity: 0.85 },
  title: { fontSize: 22, fontWeight: '800', color: TEXT, textAlign: 'center' },
  body: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 14, lineHeight: 21 },
  emailText: { color: TEXT, fontWeight: '700' },
  bodySecondary: { fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 14, lineHeight: 18, opacity: 0.85 },

  feedbackBox: {
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 20,
    alignSelf: 'stretch',
  },
  feedbackText: { color: GOLD, fontSize: 12, textAlign: 'center' },
  feedbackBoxError: { backgroundColor: 'rgba(192,57,43,0.1)', borderColor: 'rgba(192,57,43,0.4)' },
  feedbackTextError: { color: DANGER },

  secondaryBtn: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  secondaryBtnText: { color: TEXT, fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 15,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryBtnText: { color: BG, fontSize: 15, fontWeight: '700' },
});
