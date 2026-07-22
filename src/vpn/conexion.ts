// Orquesta "Establecer conexión" de punta a punta: genera un par de llaves WireGuard efímero (Rust, nunca
// sale de este proceso), pide acceso temporal a la PC (Plant_AccesoVPN) y levanta el túnel (Rust). Todo
// automático — el técnico nunca ve ni ingresa ninguna llave. Ver plant-arquitectura/07-app-vpn.md.
import { invoke } from '@tauri-apps/api/core';
import { obtenerPc, solicitarAccesoVpn } from '../lib/api';

interface ParLlavesWireGuard {
  publicKey: string;
  privateKey: string;
}

interface EstadoTunel {
  nombre: string;
  activo: boolean;
}

/** Resultado de conectar: lo que TerminalSSH/TransferenciaArchivos necesitan para apuntar SIN preguntar nada. */
export interface ConexionEstablecida {
  sesionId: string;
  direccionVirtual: string; // host SSH/SFTP (la PC de sitio)
  /** Huella SHA-256 del host SSH (Plant_PCs) — `null` si esa PC aún no la tiene registrada (Fase 9). */
  llaveHostEsperada: string | null;
}

/** Genera el par de llaves, solicita acceso y levanta el túnel WireGuard hacia la PC dada. */
export async function conectarVpn(pcId: string): Promise<ConexionEstablecida> {
  const par = await invoke<ParLlavesWireGuard>('vpn_generar_par');
  const acceso = await solicitarAccesoVpn(pcId, par.publicKey);

  await invoke('vpn_conectar', {
    cfg: {
      nombreTunel: acceso.sesionId,
      privateKey: par.privateKey,
      direccionLocal: acceso.direccionCliente,
      servidorPublicKey: acceso.servidorPublicKey,
      endpoint: acceso.endpoint,
      allowedIps: acceso.allowedIps.join(','),
    },
  });

  // La huella SSH viene de Plant_PCs (registrada una sola vez durante el alta de la PC), no de esta sesión.
  const pc = await obtenerPc(pcId).catch(() => null);

  return {
    sesionId: acceso.sesionId,
    direccionVirtual: acceso.direccionVirtual,
    llaveHostEsperada: pc?.pc.sshHostKeyFingerprint ?? null,
  };
}

/** Baja el túnel de una sesión. */
export async function desconectarVpn(sesionId: string): Promise<void> {
  await invoke('vpn_desconectar', { nombreTunel: sesionId });
}

/** Consulta si el túnel de una sesión sigue activo. */
export async function estadoVpn(sesionId: string): Promise<EstadoTunel> {
  return invoke<EstadoTunel>('vpn_estado', { nombreTunel: sesionId });
}
