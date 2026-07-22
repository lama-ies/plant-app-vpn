// Tablero inicial: bienvenida + acceso a las secciones que ya existen para el rol del usuario. Las tarjetas
// de equipo con conexión VPN (6.6.2-6.6.4) se construyen cuando exista el listado real de equipos/Familias
// desde el backend (alta de cliente/planta, Fase 6.6.8-6.6.9 primero da de alta los perfiles a mostrar aquí).
import { FileCog } from 'lucide-react';
import { Link } from 'react-router-dom';
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
