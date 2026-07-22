// Tablero inicial: bienvenida + acceso a las secciones que ya existen para el rol del usuario, y la
// conexión a una PC por ID (interino: Filtros.tsx / 6.6.3 dará un selector real por zona→cliente→PC; hasta
// que exista ese listado, el ID se ingresa a mano contra la Plant_PCs real, sin datos de ejemplo).
import { useState, type FormEvent } from 'react';
import { AlertTriangle, FileCog } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/contexto';
import { usePermissions } from '../hooks/usePermissions';
import { obtenerPc, type PcApi } from '../lib/api';
import { TarjetaEquipo } from '../components/TarjetaEquipo';
import './dashboard.css';

export function Dashboard() {
  const { t } = useTranslation();
  const { identidad } = useAuth();
  const permisos = usePermissions();

  const [pcId, setPcId] = useState('');
  const [pc, setPc] = useState<PcApi | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscar(e: FormEvent) {
    e.preventDefault();
    if (!pcId.trim()) return;
    setError(null);
    setBuscando(true);
    setPc(null);
    try {
      const r = await obtenerPc(pcId.trim());
      setPc(r.pc);
    } catch {
      setError(t('dashboard.pcNoEncontrada'));
    } finally {
      setBuscando(false);
    }
  }

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

      {permisos.canConectarVpn && (
        <section className="bienvenida buscar-pc">
          <h2 className="bienvenida__titulo">{t('dashboard.buscarPc')}</h2>
          <p className="bienvenida__sub">{t('dashboard.buscarPcAyuda')}</p>
          <form className="buscar-pc__fila" onSubmit={buscar}>
            <label className="auth-campo">
              {t('dashboard.pcIdEtiqueta')}
              <input type="text" value={pcId} onChange={(e) => setPcId(e.target.value)} required />
            </label>
            <button type="submit" className="boton-tenue" disabled={buscando}>
              {buscando ? t('dashboard.buscando') : t('dashboard.buscar')}
            </button>
          </form>
          {error && (
            <p className="auth-error" role="alert">
              <AlertTriangle size={14} aria-hidden /> {error}
            </p>
          )}
          {pc && (
            <div className="buscar-pc__resultado">
              <TarjetaEquipo pc={pc} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
