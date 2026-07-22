// Tipos de identidad del usuario autenticado (personal de IES Internacional, pool Staff). La familia/rol/
// zonas NO vienen del JWT: las resuelve el backend a partir del email (mismo patrón anti-IDOR que el
// portal). Ver plant-arquitectura/07-app-vpn.md y 15-saas-multitenant.md §2.
export type Rol = 'administrador' | 'gerente' | 'coordinador' | 'tecnico';

export interface Identidad {
  email: string;
  nombre: string | null;
  rol: Rol | null;
  // Zonas que administra un rol acotado (Gerente/Coordinador); null = acceso total (Administrador).
  zonaIds: string[] | null;
}
