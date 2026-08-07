// Guarda de ruta por permiso (hallazgo de la auditoría 2026-08-07).
//
// Hasta ahora `AppShell` solo comprobaba que EXISTIERA sesión, y el filtrado por rol vivía únicamente en el
// array `ITEMS` del Topbar — que se limita a ocultar pestañas. Verificado: `AltaCliente`, `AltaEquipo`,
// `EditorPerfil`, `GestionZonas`, `GestionGerentes`, `GestionPlantillas`, `PanelErrores`, `Auditoria`,
// `TerminalSSH` y `TransferenciaArchivos` no consultaban `usePermissions` en absoluto, así que un Técnico
// que navegara directo a `/panel-errores` o `/gestion-staff` montaba la pantalla y disparaba sus consultas
// a la API. La autorización REAL sigue siendo la del backend; esto evita exponer pantallas que no
// corresponden y que la UI dependa de que ningún lambda tenga un hueco.
//
// Se reusan las MISMAS claves de `Permisos` que filtran el menú, para que no haya dos matrices de permisos
// que puedan divergir.
import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions, type Permisos } from '../hooks/usePermissions';

/** Claves de `Permisos` que son banderas booleanas (excluye `rol`, que no lo es). */
type ClavePermiso = {
  [K in keyof Permisos]: Permisos[K] extends boolean ? K : never;
}[keyof Permisos];

export function RutaProtegida({ perm, children }: { perm: ClavePermiso; children: ReactElement }) {
  const permisos = usePermissions();
  // Al tablero, no al login: hay sesión válida, lo que falta es el permiso.
  if (!permisos[perm]) return <Navigate to="/dashboard" replace />;
  return children;
}
