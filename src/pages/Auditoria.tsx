// Auditoría de conexiones VPN (Fase 6.6.7), rol Administrador/Gerente/Coordinador: consulta sesiones por PC
// o por técnico (Plant_SesionesVPN). No hay todavía un listado global (la tabla se consulta por clave), así
// que se busca por uno de los dos criterios — igual que Auditoria en el resto del sistema hace con lo que
// hay disponible hoy.
import { useState, type FormEvent } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listarSesionesPorPc, listarSesionesPorTecnico, type SesionVpnApi } from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import './lista.css';

function formatoDuracion(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

export function Auditoria() {
  const { t } = useTranslation();
  const [criterio, setCriterio] = useState<'pcId' | 'tecnicoEmail'>('pcId');
  const [valor, setValor] = useState('');
  const [sesiones, setSesiones] = useState<SesionVpnApi[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscar(e: FormEvent) {
    e.preventDefault();
    if (!valor.trim()) return;
    setError(null);
    setBuscando(true);
    setSesiones(null);
    try {
      const r =
        criterio === 'pcId' ? await listarSesionesPorPc(valor.trim()) : await listarSesionesPorTecnico(valor.trim());
      setSesiones(r.sesiones);
    } catch (err) {
      setError(codigoAMensaje(t, err));
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="panel">
      <p className="panel__titulo">{t('nav.auditoria')}</p>

      <form className="panel-acciones" onSubmit={buscar}>
        <label className="auth-campo">
          {t('auditoria.criterio')}
          <select value={criterio} onChange={(e) => setCriterio(e.target.value as 'pcId' | 'tecnicoEmail')}>
            <option value="pcId">{t('auditoria.porPc')}</option>
            <option value="tecnicoEmail">{t('auditoria.porTecnico')}</option>
          </select>
        </label>
        <label className="auth-campo">
          {criterio === 'pcId' ? t('dashboard.pcIdEtiqueta') : t('auditoria.correoTecnico')}
          <input type="text" value={valor} onChange={(e) => setValor(e.target.value)} required />
        </label>
        <button type="submit" className="boton-tenue" disabled={buscando}>
          <Search size={16} aria-hidden />
          {buscando ? t('dashboard.buscando') : t('dashboard.buscar')}
        </button>
      </form>

      {error && (
        <p className="auth-error" role="alert">
          <AlertTriangle size={15} aria-hidden /> {error}
        </p>
      )}
      {sesiones && sesiones.length === 0 && <p className="vacio">{t('auditoria.sinSesiones')}</p>}

      {sesiones && sesiones.length > 0 && (
        <ul className="lista">
          {sesiones.map((s) => (
            <li className="fila-lista" key={s.sesionId}>
              <div className="fila-lista__cab">
                <span className="fila-lista__principal">{s.tecnicoEmail}</span>
                <span className="fila-lista__meta">{formatoDuracion(s.duracionMs)}</span>
              </div>
              <p className="fila-lista__detalle">
                {t('auditoria.pc')}: {s.pcId} · {t('auditoria.inicio')}: {s.inicio} · {t('auditoria.fin')}: {s.fin}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
