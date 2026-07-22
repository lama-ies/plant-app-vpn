// Tablero inicial: bienvenida + acceso a las secciones que ya existen para el rol del usuario. La conexión
// a una PC se hace desde Filtros.tsx (selector real cliente -> PCs, Fase 6.6.3) — el workaround interino
// de pegar un pcId a mano quedó reemplazado por ese listado real.
import { Link } from 'react-router-dom';
import { FileCog, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/contexto';
import { usePermissions } from '../hooks/usePermissions';
import './dashboard.css';

export function Dashboard() {
  const { t } = useTranslation();
  const { identidad } = useAuth();
  const permisos = usePermissions();

  return (
    <div className="panel">
      <p className="panel__titulo">{t('nav.dashboard')}</p>
      <section className="bienvenida">
        <h1 className="bienvenida__titulo">
          {t('dashboard.bienvenida', { nombre: identidad?.nombre || identidad?.email || '' })}
        </h1>
        <p className="bienvenida__sub">{t('dashboard.sub')}</p>
        <div className="bienvenida__acciones">
          {permisos.canConectarVpn && (
            <Link to="/filtros" className="boton-tenue">
              <Filter size={16} aria-hidden />
              {t('nav.filtros')}
            </Link>
          )}
          {permisos.canEditorPerfil && (
            <Link to="/editor-perfil" className="boton-tenue">
              <FileCog size={16} aria-hidden />
              {t('nav.editorPerfil')}
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
