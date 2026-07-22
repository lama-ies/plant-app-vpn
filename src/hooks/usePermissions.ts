// Permisos derivados del rol Staff (capa semántica sobre la identidad). Filtra nav/acciones en UI; la
// autorización REAL la hace el backend por JWT + identidadSolicitante. Ver plant-arquitectura/07-app-vpn.md.
import { useMemo } from 'react';
import { useAuth } from '../auth/contexto';
import type { Rol } from '../auth/tipos';

// Roles con acceso total (sin acotar a zonas): solo Administrador.
const ACCESO_TOTAL = new Set<Rol>(['administrador']);
// Roles que pueden ver auditoría de conexiones (dueños de zona hacia arriba).
const VE_AUDITORIA = new Set<Rol>(['administrador', 'gerente', 'coordinador']);

export interface Permisos {
  rol: Rol | null;
  accesoTotal: boolean;
  // Conexión VPN / respaldos: disponibles para todos los roles autenticados.
  canConectarVpn: boolean;
  canRespaldos: boolean;
  // SSH y transferencia de archivos: acceso operativo directo al equipo.
  canSsh: boolean;
  canTransferirArchivos: boolean;
  // Administración: solo Administrador.
  canAltaCliente: boolean;
  canEditorPerfil: boolean;
  canGestionPlantillas: boolean;
  canGestionZonas: boolean;
  canPanelErrores: boolean;
  // Auditoría: Gerente/Coordinador/Administrador (no Técnico).
  canAuditoria: boolean;
}

export function usePermissions(): Permisos {
  const { identidad } = useAuth();
  return useMemo(() => {
    const rol = identidad?.rol ?? null;
    const esAdministrador = rol === 'administrador';
    return {
      rol,
      accesoTotal: rol ? ACCESO_TOTAL.has(rol) : false,
      canConectarVpn: rol !== null,
      canRespaldos: rol !== null,
      canSsh: esAdministrador,
      canTransferirArchivos: esAdministrador,
      canAltaCliente: esAdministrador,
      canEditorPerfil: esAdministrador,
      canGestionPlantillas: esAdministrador,
      canGestionZonas: esAdministrador,
      canPanelErrores: esAdministrador,
      canAuditoria: rol ? VE_AUDITORIA.has(rol) : false,
    };
  }, [identidad]);
}
