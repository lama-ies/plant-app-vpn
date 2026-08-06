// Traduce errores reales de Amplify/Cognito (signIn, resetPassword, confirmResetPassword) a mensajes
// específicos para el usuario. Nunca cae en un mensaje adivinado: "sin internet" solo se muestra cuando
// `navigator.onLine` lo confirma; cualquier otro fallo de conexión muestra el nombre/mensaje real del
// error tal cual lo lanzó Cognito/el navegador, en vez de diagnosticar una causa que no se puede verificar.
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

/** Nombre y mensaje reales del error, para mostrar cuando no hay una causa Cognito reconocida. */
function detalleTecnico(error: unknown): string {
  const nombre = nombreError(error) || 'Error';
  const mensaje = mensajeError(error);
  return mensaje ? `${nombre}: ${mensaje}` : nombre;
}

/** true solo si el navegador confirma que no hay conexión — nunca se infiere del texto del error. */
function sinConexionConfirmada(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Mensaje para el intento de inicio de sesión (`Login.tsx`). Distingue credenciales incorrectas de
 * problemas de cuenta o de conexión — nunca los mezcla en un solo "incorrectos" genérico.
 */
export function mensajeErrorLogin(t: TFunction, error: unknown): string {
  if (sinConexionConfirmada()) return t('authErrores.sinInternet');

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
      return t('authErrores.servidor', { detalle: detalleTecnico(error) });
  }
}

/** Mensaje para el paso 2 (código + nueva contraseña) de `RecuperarStaff.tsx`. */
export function mensajeErrorRecuperacion(t: TFunction, error: unknown): string {
  if (sinConexionConfirmada()) return t('authErrores.sinInternet');

  switch (nombreError(error)) {
    case 'CodeMismatchException':
      return t('authErrores.codigoInvalido');
    case 'ExpiredCodeException':
      return t('authErrores.codigoExpirado');
    case 'InvalidPasswordException':
    case 'InvalidParameterException':
      // Cognito ya describe el requisito exacto que falta (ej. "must have lowercase characters");
      // se muestra tal cual junto al prefijo traducido en vez de adivinar cuál fue.
      return t('authErrores.contrasenaPolitica', { detalle: mensajeError(error) });
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return t('authErrores.demasiadosIntentos');
    default:
      return t('authErrores.servidor', { detalle: detalleTecnico(error) });
  }
}
