// Provider de autenticación: mantiene la identidad de sesión, la recupera al montar y expone
// iniciar/cerrar sesión. Sesión persistente (Amplify + localStorage), sin expiración por inactividad.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cerrarSesion as authCerrar, iniciarSesion as authIniciar, sesionActual } from './cognito';
import { limpiarSesionNucleo, sincronizarSesionNucleo } from './nucleo';
import { ContextoAuth, type EstadoAuth } from './contexto';
import type { Identidad } from './tipos';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [identidad, setIdentidad] = useState<Identidad | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    void sesionActual().then(async (id) => {
      if (!activo) return;
      // Sesión recuperada al arrancar (persistente): el núcleo Rust también necesita el token para poder
      // autorizar SSH/SFTP por su cuenta. Ver auth/nucleo.ts.
      if (id) await sincronizarSesionNucleo();
      if (!activo) return;
      setIdentidad(id);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, []);

  const iniciarSesion = useCallback(async (correo: string, contrasena: string) => {
    const id = await authIniciar(correo, contrasena);
    await sincronizarSesionNucleo();
    setIdentidad(id);
  }, []);

  const cerrarSesion = useCallback(() => {
    void authCerrar();
    void limpiarSesionNucleo();
    setIdentidad(null);
  }, []);

  const valor = useMemo<EstadoAuth>(
    () => ({ identidad, cargando, iniciarSesion, cerrarSesion }),
    [identidad, cargando, iniciarSesion, cerrarSesion],
  );

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>;
}
