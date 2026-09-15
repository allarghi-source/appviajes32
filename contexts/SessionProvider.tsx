import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { requestSharedWorldSync } from '../utils/socialSync';
import { supabase } from '../utils/supabase';

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

// Infraestructura base de sesión: no redirige, no navega, no muestra Alerts y
// no asume que exista usuario. Solo expone { session, loading } para que las
// futuras pantallas de CompartirXP decidan qué hacer. No bloquea el resto de
// la app: los consumidores deciden si esperan `loading` o no.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
      })
      .catch(() => {
        // Sin sesión válida disponible: se sigue sin cuenta, no es un error fatal.
        if (!active) return;
        setSession(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Oportunidad de primera foto / foto de recuperación: dispara best-effort
  // apenas hay una sesión con email confirmado, sea porque la app arrancó
  // con una sesión ya persistida, porque se acaba de confirmar el email
  // (exchangeCodeForSession dispara este mismo onAuthStateChange más arriba)
  // o por un login nuevo. `syncedForUserRef` evita repetirlo en cada render
  // o en cada refresh de token silencioso -- solo dispara una vez por
  // usuario verificado que pasa a estar activo.
  const syncedForUserRef = useRef<string | null>(null);
  useEffect(() => {
    const verified = !!session?.user.email_confirmed_at;
    const userId = session?.user.id ?? null;
    if (!verified || !userId) return;
    if (syncedForUserRef.current === userId) return;
    syncedForUserRef.current = userId;
    requestSharedWorldSync();
  }, [session]);

  // Recomendación de Supabase para RN: sin esto, el refresh automático de
  // token no corre de forma confiable con la app en background.
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    // Estado inicial: si al montar la app ya está "active", no depender de un
    // cambio posterior de AppState para arrancar el auto-refresh.
    if (AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        supabase.auth.startAutoRefresh();
        requestSharedWorldSync();
      } else if (nextState !== 'active') {
        supabase.auth.stopAutoRefresh();
      }
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
      // No dejar el auto-refresh corriendo huérfano después de desmontar.
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession debe usarse dentro de <SessionProvider>.');
  }
  return context;
}
