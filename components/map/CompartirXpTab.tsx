import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useSession } from '../../contexts/SessionProvider';
import { signOut } from '../../utils/auth';
import { getMyUsername, getSocialErrorMessage } from '../../utils/social';
import { requestSharedWorldSync } from '../../utils/socialSync';
import PendingRequests from './PendingRequests';
import UserSearch from './UserSearch';

const GOLD = '#d4af37';
const SURFACE = '#0d1a2e';
const BORDER = '#1e3050';
const TEXT = '#e8e0d0';
const MUTED = '#6b7a8d';
const DANGER = '#c0392b';

// Estructura base de CompartirXP: solo estados de sesión (cargando / sin
// cuenta / email sin confirmar / conectado). Sin búsqueda, sin requests, sin
// relaciones, sin RPCs — eso llega en un bloque posterior.
export default function CompartirXpTab() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const verified = !!session?.user.email_confirmed_at;
  const userId = session?.user.id;

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [username, setUsername] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  // userId para el que ya se resolvió username/usernameError. Mientras no
  // coincida con `userId`, todavía está cargando — se deriva en vez de
  // guardarse como booleano aparte (evita un setState síncrono al arrancar
  // el efecto; el estado solo se actualiza desde los callbacks async).
  const [usernameFetchedFor, setUsernameFetchedFor] = useState<string | null>(null);
  const usernameLoading = verified && !!userId && usernameFetchedFor !== userId;

  // Se carga al entrar al estado autenticado/verificado, y de nuevo si
  // cambia el usuario (ej: logout + login con otra cuenta en la misma
  // sesión de la app). Sin polling.
  useEffect(() => {
    if (!verified || !userId) return;

    // Red de seguridad, no el mecanismo principal: entrar a CompartirXP es
    // una oportunidad razonable más para reintentar la foto social si algún
    // sync anterior falló. Best-effort, no bloquea ni afecta esta pantalla.
    requestSharedWorldSync();

    getMyUsername(userId)
      .then((u) => {
        if (!mountedRef.current) return;
        setUsername(u);
        setUsernameError(null);
        setUsernameFetchedFor(userId);
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setUsername(null);
        setUsernameError(getSocialErrorMessage(err));
        setUsernameFetchedFor(userId);
      });
  }, [verified, userId]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      // SessionProvider actualiza `session` solo vía onAuthStateChange; no
      // hace falta navegar ni recargar nada acá.
    } catch {
      Alert.alert('No se pudo cerrar sesión', 'Intentá de nuevo.');
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={GOLD} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.content}>
        <Text style={styles.title}>CompartirXP</Text>
        <Text style={styles.body}>
          Creá una cuenta para compartir tu mundo de viajes con otros usuarios de MyWorldXP y ver
          los mundos que compartan con vos.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/auth/signup')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>CREAR CUENTA</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/auth/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>INICIAR SESIÓN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!session.user.email_confirmed_at) {
    return (
      <View style={styles.content}>
        <Text style={styles.title}>CompartirXP</Text>
        <Text style={styles.body}>Falta confirmar tu email.</Text>
        <Text style={styles.bodySecondary}>
          Revisá tu correo y tocá el enlace de confirmación para activar CompartirXP.
        </Text>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() =>
            router.push({ pathname: '/auth/check-email', params: { email: session.user.email ?? '' } })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>VER INSTRUCCIONES</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.verifiedRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.verifiedContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>CompartirXP</Text>

        {usernameLoading && <Text style={styles.bodySecondary}>Cargando tu usuario...</Text>}

        {!usernameLoading && username && <Text style={styles.myUsername}>@{username}</Text>}

        {!usernameLoading && !username && usernameError && (
          <Text style={styles.bodySecondary}>{usernameError}</Text>
        )}

        {!usernameLoading && !username && !usernameError && (
          <Text style={styles.bodySecondary}>Todavía no tenés un nombre de usuario configurado.</Text>
        )}

        {userId && <PendingRequests myUserId={userId} />}

        {userId && <UserSearch myUserId={userId} />}

        <TouchableOpacity
          style={[styles.dangerBtn, signingOut && styles.btnDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.85}
        >
          <Text style={styles.dangerBtnText}>{signingOut ? 'Cerrando sesión...' : 'CERRAR SESIÓN'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: MUTED, fontSize: 13 },

  content: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: TEXT },
  body: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 14, lineHeight: 21 },
  bodySecondary: { fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 10, lineHeight: 18, opacity: 0.85 },

  verifiedRoot: { flex: 1 },
  verifiedContent: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 32 },
  myUsername: { fontSize: 20, fontWeight: '800', color: GOLD, marginTop: 10 },

  primaryBtn: {
    marginTop: 28,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 15,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryBtnText: { color: '#01050d', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

  secondaryBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingVertical: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  secondaryBtnText: { color: TEXT, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

  dangerBtn: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.4)',
    backgroundColor: 'rgba(192,57,43,0.08)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  dangerBtnText: { color: DANGER, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  btnDisabled: { opacity: 0.55 },
});
