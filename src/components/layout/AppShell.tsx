// Marco autenticado de la app: puerta de sesión (spinner mientras carga, redirige a /login si no hay
// sesión) + topbar de navegación + área de contenido (Outlet). Todas las rutas privadas cuelgan de aquí.
import { Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/contexto';
import { Topbar } from './Topbar';
import './appshell.css';

export function AppShell() {
  const { identidad, cargando } = useAuth();
  const { t } = useTranslation();

  // Mientras se resuelve la sesión inicial, evitar parpadeo/redirección temprana.
  if (cargando) return <div className="cargando-pantalla">{t('app.cargando')}</div>;
  // Sin sesión -> al login.
  if (!identidad) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <Topbar />
      <main className="app-shell__cuerpo">
        <Outlet />
      </main>
    </div>
  );
}
