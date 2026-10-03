import { AuthError } from '@supabase/supabase-js';
import i18n from '../i18n';
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
    return i18n.t('auth:errors.unexpected');
  }

  const isAuthError = error instanceof AuthError;
  const code = isAuthError ? error.code : undefined;
  const status = isAuthError ? error.status : undefined;
  const msg = error.message.toLowerCase();

  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('fetch failed')) {
    return i18n.t('auth:errors.connection');
  }

  switch (code) {
    case 'user_already_exists':
    case 'email_exists':
    case 'identity_already_exists':
      return i18n.t('auth:errors.emailAlreadyRegistered');
    case 'weak_password':
      return i18n.t('auth:errors.weakPassword', { count: MIN_PASSWORD_LENGTH });
    case 'email_address_invalid':
      return i18n.t('auth:errors.invalidEmailAddress');
    case 'invalid_credentials':
      return i18n.t('auth:errors.invalidCredentials');
    case 'email_not_confirmed':
      return i18n.t('auth:errors.emailNotConfirmed');
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return i18n.t('auth:errors.rateLimited');
    case 'bad_code_verifier':
    case 'flow_state_not_found':
    case 'flow_state_expired':
      return i18n.t('auth:errors.linkExpired');
    case 'same_password':
      return i18n.t('auth:errors.samePassword');
    case 'signup_disabled':
      return i18n.t('auth:errors.signupDisabled');
    case 'validation_failed':
      return i18n.t('auth:errors.validationFailed');
  }

  // Sin código reconocido: en signup, un error de servidor (5xx) suele venir
  // del trigger que crea `profiles` (típicamente username duplicado), pero no
  // podemos confirmarlo con certeza desde el cliente.
  if (context === 'signup' && typeof status === 'number' && status >= 500) {
    return i18n.t('auth:errors.signupServerError');
  }
  if (msg.includes('username')) {
    return i18n.t('auth:errors.usernameTaken');
  }
  if (msg.includes('password')) {
    return i18n.t('auth:errors.invalidPassword');
  }
  if (msg.includes('email')) {
    return i18n.t('auth:errors.checkEmailField');
  }

  return i18n.t('auth:errors.generic');
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
// El SessionProvider actualiza `session` solo mediante onAuthStateChange; este
// helper solo dispara el signOut real, sin lógica de UI.
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
