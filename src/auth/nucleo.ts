// Puente de identidad hacia el NÚCLEO Rust.
//
// El núcleo (src-tauri/src/sesion.rs) necesita el ID token para poder verificar por su cuenta, contra el
// backend, si el usuario es Administrador antes de abrir SSH o SFTP. No se le manda el rol: el frontend no
// es una fuente confiable para eso (el inspector está habilitado a propósito también en release, así que
// quien puede invocar `ssh_conectar` también podría invocar cualquier comando que fijara un rol). El token
// firmado por Cognito, en cambio, no se puede falsificar.
//
// Ver la nota de cabecera de `src-tauri/src/sesion.rs` para el hallazgo completo (auditoría 2026-08-07).
import { invoke } from '@tauri-apps/api/core';
import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Entrega al núcleo el ID token de la sesión actual. Silencioso si algo falla: no debe impedir el uso de
 * la app: si el núcleo se queda sin token, los comandos sensibles simplemente devuelven AUTH_ACCESS_DENIED
 * (falla cerrado, que es el comportamiento correcto).
 */
export async function sincronizarSesionNucleo(): Promise<void> {
  try {
    const sesion = await fetchAuthSession();
    const token = sesion.tokens?.idToken?.toString();
    if (!token) {
      await invoke('sesion_cerrar');
      return;
    }
    await invoke('sesion_establecer', { token });
  } catch {
    // Entorno sin Tauri (navegador plano en `pnpm dev`) o sesión no disponible: nada que sincronizar.
  }
}

/** Limpia la identidad del núcleo al cerrar sesión. */
export async function limpiarSesionNucleo(): Promise<void> {
  try {
    await invoke('sesion_cerrar');
  } catch {
    // Igual que arriba: fuera de Tauri no hay núcleo al que avisarle.
  }
}
