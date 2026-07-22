// Contexto de autenticación y su hook. Separado del provider (AuthProvider.tsx) por la regla react-refresh.
import { createContext, useContext } from 'react';
import type { Identidad } from './tipos';

export interface EstadoAuth {
  identidad: Identidad | null;
  cargando: boolean;
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>;
  cerrarSesion: () => void;
}

export const ContextoAuth = createContext<EstadoAuth | null>(null);

/** Hook para consumir el estado de autenticación. Debe usarse dentro de <AuthProvider>. */
export function useAuth(): EstadoAuth {
  const ctx = useContext(ContextoAuth);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
