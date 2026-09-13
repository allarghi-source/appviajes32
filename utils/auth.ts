import { AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';

// ─── USERNAME ─────────────────────────────────────────────────────────────────
// 5–15 caracteres, minúsculas, dígitos, punto y guion bajo. Sin @ guardado.

export const USERNAME_REGEX = /^[a-z0-9._]{5,15}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// ─── PASSWORD ─────────────────────────────────────────────────────────────────

export const MIN_PASSWORD_LENGTH = 8;

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

// ─── NAVEGACIÓN ───────────────────────────────────────────────────────────────
// Salida estable cuando una pantalla de auth no tiene historial propio al que
// volver (ver app/auth/login.tsx). No es una pantalla nueva: ya es la home
// actual de la app tras el onboarding.
export const AUTH_FALLBACK_ROUTE = '/passportinside' as const;

// ─── ERRORES ──────────────────────────────────────────────────────────────────
// Los AuthError de Supabase traen `code` estructurado para la mayoría de los
// casos (ver @supabase/auth-js/lib/error-codes.ts), pero un fallo dentro del
// trigger que crea `profiles` (ej: username duplicado) no tiene código propio:
// GoTrue lo envuelve como un error genérico de servidor. Por eso este mapeo
// prioriza siempre `code` cuando existe, y solo cae a heurísticas por texto
// (varias palabras clave, nunca una sola) como último recurso.
export type AuthErrorContext = 'signup' | 'login' | 'forgot-password' | 'reset-password' | 'confirm' | 'resend';

export function getAuthErrorMessage(error: unknown, context: AuthErrorContext): string {
  if (!(error instanceof Error)) {
    return 'Ocurrió un error inesperado. Intentá de nuevo.';
  }

  const isAuthError = error instanceof AuthError;
  const code = isAuthError ? error.code : undefined;
  const status = isAuthError ? error.status : undefined;
  const msg = error.message.toLowerCase();

  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('fetch failed')) {
    return 'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
  }

  switch (code) {
    case 'user_already_exists':
    case 'email_exists':
    case 'identity_already_exists':
      return 'Ese email ya está registrado. Iniciá sesión o recuperá tu contraseña.';
    case 'weak_password':
      return `La contraseña es demasiado débil. Usá al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    case 'email_address_invalid':
      return 'El email ingresado no es válido.';
    case 'invalid_credentials':
      return 'Email o contraseña incorrectos.';
    case 'email_not_confirmed':
      return 'Todavía no confirmaste tu email. Revisá tu casilla de entrada.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Hiciste demasiados intentos. Esperá unos minutos y volvé a intentar.';
    case 'bad_code_verifier':
    case 'flow_state_not_found':
    case 'flow_state_expired':
      return 'Este enlace ya no es válido o expiró. Solicitá uno nuevo.';
    case 'same_password':
      return 'La nueva contraseña debe ser distinta a la actual.';
    case 'signup_disabled':
      return 'El registro no está disponible en este momento.';
    case 'validation_failed':
      return 'Revisá los datos ingresados.';
  }

  // Sin código reconocido: en signup, un error de servidor (5xx) suele venir
  // del trigger que crea `profiles` (típicamente username duplicado), pero no
  // podemos confirmarlo con certeza desde el cliente.
  if (context === 'signup' && typeof status === 'number' && status >= 500) {
    return 'No pudimos crear la cuenta. Es posible que el nombre de usuario ya esté en uso, o hubo un problema temporal. Probá con otro usuario o intentá de nuevo en unos minutos.';
  }
  if (msg.includes('username')) {
    return 'Ese nombre de usuario ya está en uso o no es válido.';
  }
  if (msg.includes('password')) {
    return 'La contraseña ingresada no es válida.';
  }
  if (msg.includes('email')) {
    return 'Revisá el email ingresado.';
  }

  return 'Ocurrió un error. Intentá de nuevo en unos minutos.';
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
// El SessionProvider actualiza `session` solo mediante onAuthStateChange; este
// helper solo dispara el signOut real, sin lógica de UI.
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
