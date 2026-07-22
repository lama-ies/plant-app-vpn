// Panel de monitoreo de infraestructura (Fase 6.6.12), rol Administrador: últimos errores no esperados
// registrados por la capa de errores de plant-lambdas (tabla Plant_Errores).
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listarErrores, type ErrorRegistradoApi } from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import './lista.css';

export function PanelErrores() {
  const { t } = useTranslation();
  const [errores, setErrores] = useState<ErrorRegistradoApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await listarErrores(50);
      setErrores(r.errores);
    } catch (e) {
      setError(codigoAMensaje(t, e));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="panel">
      <p className="panel__titulo">{t('nav.panelErrores')}</p>
      <div className="panel-acciones">
        <button type="button" className="boton-tenue" onClick={() => void cargar()} disabled={cargando}>
          <RefreshCw size={16} aria-hidden />
          {t('panelErrores.recargar')}
        </button>
      </div>

      {cargando && <p className="vacio">{t('app.cargando')}</p>}
      {error && (
        <p className="auth-error" role="alert">
          <AlertTriangle size={15} aria-hidden /> {error}
        </p>
      )}
      {!cargando && !error && errores.length === 0 && <p className="vacio">{t('panelErrores.sinErrores')}</p>}

      {!cargando && !error && errores.length > 0 && (
        <ul className="lista">
          {errores.map((e) => (
            <li className="fila-lista" key={e.uuidError}>
              <div className="fila-lista__cab">
                <span className="fila-lista__principal">{e.origen}</span>
                <span className="fila-lista__meta">
                  {e.timestamp} · v{e.versionCodigo} · {e.uuidError}
                </span>
              </div>
              <p className="fila-lista__detalle">{e.descripcion}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
