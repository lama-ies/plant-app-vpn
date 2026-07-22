// Traduce el código de máquina de un ErrorApi (contrato DOMINIO_RAZON del backend) a un mensaje para el
// usuario. Las cadenas viven en i18n bajo `errores.*`; si no hay una específica, cae en `errores.generico`.
import type { TFunction } from 'i18next';
import { ErrorApi } from './api';

// Códigos que la UI sabe explicar (subconjunto relevante a app-vpn: perfiles, Excel, VPN/SSH, staff/zonas).
const CODIGOS_CONOCIDOS = new Set([
  'AUTH_UNAUTHORIZED',
  'AUTH_ACCESS_DENIED',
  'PERFIL_NOT_FOUND',
  'PERFIL_VALIDATION_FAILED',
  'EXCEL_INVALID_FORMAT',
  'EXCEL_VALIDATION_FAILED',
  'VPN_CONNECT_FAILED',
  'VPN_ALREADY_CONNECTED',
  'SSH_CONNECT_FAILED',
  'SFTP_TRANSFER_FAILED',
  'ZONA_OUT_OF_SCOPE',
  'USUARIO_NOT_FOUND',
  'VALIDATION_INVALID_EMAIL',
]);

/** Devuelve el mensaje localizado para un error (ErrorApi u otro). */
export function codigoAMensaje(t: TFunction, error: unknown): string {
  if (error instanceof ErrorApi && CODIGOS_CONOCIDOS.has(error.code)) {
    return t(`errores.${error.code}`);
  }
  return t('errores.generico');
}
