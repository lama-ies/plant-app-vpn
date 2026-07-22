// Acceso a la sesión vía AWS Amplify (pool Staff). Cognito solo autentica; el perfil de sesión (rol/zonas)
// lo resuelve el backend (`staffLogin`, real — ver lib/api.ts) a partir del email del JWT.
import { fetchAuthSession, getCurrentUser, signIn, signOut, signUp } from 'aws-amplify/auth';
import { staffLogin } from '../lib/api';
import type { Identidad } from './tipos';

function mapear(perfil: Record<string, unknown>): Identidad {
  return {
    email: String(perfil.email ?? ''),
    nombre: (perfil.nombre as string) ?? null,
    rol: (perfil.rol as Identidad['rol']) ?? null,
    zonaIds: (perfil.zonaIds as string[] | null) ?? null,
  };
}

/** Inicia sesión (Amplify) y resuelve el perfil de rol/zonas. Lanza si las credenciales fallan. */
export async function iniciarSesion(correo: string, contrasena: string): Promise<Identidad> {
  try {
    await signOut();
  } catch {
    // sin sesión previa: ignorar
  }
  const { isSignedIn } = await signIn({ username: correo, password: contrasena });
  if (!isSignedIn) throw new Error('Autenticación incompleta');
  return mapear((await staffLogin()) as Record<string, unknown>);
}

/** Devuelve la identidad si hay sesión válida; null si no. */
export async function sesionActual(): Promise<Identidad | null> {
  try {
    await getCurrentUser();
    const s = await fetchAuthSession();
    if (!s.tokens?.idToken) return null;
  } catch {
    return null;
  }
  try {
    return mapear((await staffLogin()) as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Cierra la sesión (borra los tokens locales). */
export async function cerrarSesion(): Promise<void> {
  try {
    await signOut();
  } catch {
    // ignorar
  }
}

/**
 * Registra al invitado Staff en Cognito con la contraseña que eligió (usuario UNCONFIRMED). Mismo patrón
 * que el portal: el pool usa email como ALIAS, así que el `username` es un UUID aleatorio y el correo va
 * como atributo. El backend (`Plant_StaffConsumeActivation`) confirma la cuenta al consumir el código.
 * Idempotente ante "usuario ya existe" (reintento de activación).
 */
export async function registrarActivacionStaff(email: string, contrasena: string): Promise<void> {
  try {
    await signOut();
  } catch {
    // sin sesión previa
  }
  try {
    await signUp({ username: crypto.randomUUID(), password: contrasena, options: { userAttributes: { email } } });
  } catch (e) {
    if ((e as { name?: string })?.name !== 'UsernameExistsException') throw e;
  }
}
