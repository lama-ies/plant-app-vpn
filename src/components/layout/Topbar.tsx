// Barra superior de navegación. Nav declarada como data-array + filtrada por permisos (rol Staff). A la
// derecha: idioma, correo+rol del usuario y cerrar sesión. Ver plant-arquitectura/07-app-vpn.md.
import type { ReactNode } from 'react';
import { ClipboardList, FileCog, LayoutDashboard, LayoutTemplate, LogOut, MapPin, ShieldAlert, UserPlus, Users } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/contexto';
import { usePermissions, type Permisos } from '../../hooks/usePermissions';
import { SelectorIdioma } from '../SelectorIdioma';
import './topbar.css';

// Items de navegación: `perm` es la clave de usePermissions que debe ser true (o null = siempre visible).
interface ItemNav {
  clave: string;
  a: string;
  etiqueta: string;
  icono: ReactNode;
  perm: keyof Permisos | null;
}

const ITEMS: ItemNav[] = [
  { clave: 'dashboard', a: '/dashboard', etiqueta: 'nav.dashboard', icono: <LayoutDashboard size={16} aria-hidden />, perm: null },
  { clave: 'editorPerfil', a: '/editor-perfil', etiqueta: 'nav.editorPerfil', icono: <FileCog size={16} aria-hidden />, perm: 'canEditorPerfil' },
  { clave: 'altaCliente', a: '/alta-cliente', etiqueta: 'nav.altaCliente', icono: <UserPlus size={16} aria-hidden />, perm: 'canAltaCliente' },
  { clave: 'gestionZonas', a: '/gestion-zonas', etiqueta: 'nav.gestionZonas', icono: <MapPin size={16} aria-hidden />, perm: 'canGestionZonas' },
  { clave: 'gestionGerentes', a: '/gestion-gerentes', etiqueta: 'nav.gestionGerentes', icono: <Users size={16} aria-hidden />, perm: 'canGestionZonas' },
  { clave: 'gestionPlantillas', a: '/gestion-plantillas', etiqueta: 'nav.gestionPlantillas', icono: <LayoutTemplate size={16} aria-hidden />, perm: 'canGestionPlantillas' },
  { clave: 'auditoria', a: '/auditoria', etiqueta: 'nav.auditoria', icono: <ClipboardList size={16} aria-hidden />, perm: 'canAuditoria' },
  { clave: 'panelErrores', a: '/panel-errores', etiqueta: 'nav.panelErrores', icono: <ShieldAlert size={16} aria-hidden />, perm: 'canPanelErrores' },
];

export function Topbar() {
  const { t } = useTranslation();
  const { identidad, cerrarSesion } = useAuth();
  const permisos = usePermissions();
  const navegar = useNavigate();

  const visibles = ITEMS.filter((it) => it.perm === null || permisos[it.perm] === true);

  function salir() {
    cerrarSesion();
    navegar('/login', { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar__fila">
        <span className="topbar__marca">
          IES <span className="topbar__acento">Monitor Plant</span>
        </span>
        <div className="topbar__acciones">
          <SelectorIdioma />
          {identidad && (
            <span className="topbar__usuario">
              <span className="topbar__correo">{identidad.email}</span>
              {identidad.rol && <span className="topbar__rol">{t(`rol.${identidad.rol}`)}</span>}
            </span>
          )}
          <button type="button" className="boton-tenue" onClick={salir}>
            <LogOut size={16} aria-hidden />
            {t('nav.cerrarSesion')}
          </button>
        </div>
      </div>

      <nav className="topbar__nav" aria-label={t('nav.dashboard')}>
        {visibles.map((it) => (
          <NavLink key={it.clave} to={it.a} className="topbar__tab">
            {it.icono}
            <span>{t(it.etiqueta)}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
