// Traduce errores reales de Amplify/Cognito (signIn, resetPassword, confirmResetPassword) a mensajes
// específicos para el usuario. Nunca cae en un mensaje adivinado: si el nombre del error no se reconoce,
// usa un mensaje genérico que dice explícitamente que no se pudo determinar la causa (no inventa una).
import type { TFunction } from 'i18next';

/** Extrae `.name` de un error de forma segura (Amplify lanza objetos tipo Error). */
function nombreError(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error) {
    return String((error as { name: unknown }).name);
  }
  return '';
}

function mensajeError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return '';
}

/** true si el error es de red (sin conexión, fetch nunca llegó a Cognito), no una respuesta de Cognito. */
function esErrorDeRed(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const nombre = nombreError(error);
  const mensaje = mensajeError(error);
  return nombre === 'NetworkError' || /network|fetch/i.test(mensaje);
}

/**
 * Mensaje para el intento de inicio de sesión (`Login.tsx`). Distingue credenciales incorrectas de
 * problemas de cuenta, de red o del servidor — nunca los mezcla en un solo "incorrectos" genérico.
 */
export function mensajeErrorLogin(t: TFunction, error: unknown): string {
  if (esErrorDeRed(error)) return t('authErrores.sinInternet');

  switch (nombreError(error)) {
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      return t('authErrores.credenciales');
    case 'UserNotConfirmedException':
      return t('authErrores.cuentaNoConfirmada');
    case 'PasswordResetRequiredException':
      return t('authErrores.restablecerRequerido');
    case 'TooManyFailedAttemptsException':
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return t('authErrores.demasiadosIntentos');
    default:
      return t('authErrores.servidor');
  }
}

/** Mensaje para el paso 2 (código + nueva contraseña) de `RecuperarStaff.tsx`. */
export function mensajeErrorRecuperacion(t: TFunction, error: unknown): string {
  if (esErrorDeRed(error)) return t('authErrores.sinInternet');

  switch (nombreError(error)) {
    case 'CodeMismatchException':
      return t('authErrores.codigoInvalido');
    case 'ExpiredCodeException':
      return t('authErrores.codigoExpirado');
    case 'InvalidPasswordException':
      // Cognito ya describe el requisito exacto que falta (ej. "must have lowercase characters");
      // se muestra tal cual junto al prefijo traducido en vez de adivinar cuál fue.
      return t('authErrores.contrasenaPolitica', { detalle: mensajeError(error) });
    case 'InvalidParameterException':
      return t('authErrores.contrasenaPolitica', { detalle: mensajeError(error) });
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return t('authErrores.demasiadosIntentos');
    default:
      return t('authErrores.servidor');
  }
}
