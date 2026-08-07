// Auditoría de conexiones VPN (Fase 6.6.7), rol Administrador/Gerente/Coordinador: consulta sesiones por PC
// o por técnico (Plant_SesionesVPN). No hay todavía un listado global (la tabla se consulta por clave), así
// que se busca por uno de los dos criterios. Por PC: se elige familia (SelectorFamilia) y luego la PC de
// una lista real (2026-08-06, pedido del usuario — antes había que conocer el pcId de memoria y pegarlo).
import { useState, type FormEvent } from 'react';
import { AlertTriangle, Building2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listarPcs, listarSesionesPorPc, listarSesionesPorTecnico, type PcApi, type SesionVpnApi } from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import { SelectorFamilia } from '../components/SelectorFamilia';
import { GotaCargando } from '../components/GotaCargando';
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

  // Selector de PC por familia (criterio 'pcId'): se elige la familia, se listan sus PCs reales y se hace
  // clic en una — nunca hay que conocer/pegar el pcId.
  const [familiaId, setFamiliaId] = useState('');
  const [pcs, setPcs] = useState<PcApi[] | null>(null);
  const [pcNombre, setPcNombre] = useState('');
  const [cargandoPcs, setCargandoPcs] = useState(false);

  async function elegirFamilia(f: { familiaId: string }) {
    setFamiliaId(f.familiaId);
    setValor('');
    setPcNombre('');
    setPcs(null);
    setCargandoPcs(true);
    try {
      const r = await listarPcs(f.familiaId);
      setPcs(r.pcs);
    } catch (err) {
      setError(codigoAMensaje(t, err));
    } finally {
      setCargandoPcs(false);
    }
  }

  async function buscarPorPc(pc: PcApi) {
    setValor(pc.pcId);
    setPcNombre(pc.nombre);
    setError(null);
    setBuscando(true);
    setSesiones(null);
    try {
      const r = await listarSesionesPorPc(pc.pcId);
      setSesiones(r.sesiones);
    } catch (err) {
      setError(codigoAMensaje(t, err));
    } finally {
      setBuscando(false);
    }
  }

  async function buscar(e: FormEvent) {
    e.preventDefault();
    if (!valor.trim()) return;
    setError(null);
    setBuscando(true);
    setSesiones(null);
    try {
      const r = await listarSesionesPorTecnico(valor.trim());
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

      <div className="panel-acciones">
        <label className="auth-campo">
          {t('auditoria.criterio')}
          <select
            value={criterio}
            onChange={(e) => {
              setCriterio(e.target.value as 'pcId' | 'tecnicoEmail');
              setValor('');
              setError(null);
              setSesiones(null);
            }}
          >
            <option value="pcId">{t('auditoria.porPc')}</option>
            <option value="tecnicoEmail">{t('auditoria.porTecnico')}</option>
          </select>
        </label>
      </div>

      {criterio === 'pcId' ? (
        <>
          <SelectorFamilia valor={familiaId} onSeleccionar={(f) => void elegirFamilia(f)} />
          {cargandoPcs && (
            <p className="vacio">
              <GotaCargando tamano="inline" texto={t('dashboard.buscando')} />
            </p>
          )}
          {pcs && pcs.length === 0 && <p className="vacio">{t('filtros.sinPcs')}</p>}
          {pcs && pcs.length > 0 && (
            <ul className="lista">
              {pcs.map((pc) => (
                <li
                  className={`fila-lista fila-lista--clicable${pc.pcId === valor ? ' fila-lista--activa' : ''}`}
                  key={pc.pcId}
                >
                  <button type="button" className="fila-lista__boton" onClick={() => void buscarPorPc(pc)}>
                    <div className="fila-lista__cab">
                      <span className="fila-lista__principal">
                        <Building2 size={14} aria-hidden /> {pc.nombre}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pcNombre && <p className="vacio">{t('auditoria.pc')}: {pcNombre}</p>}
        </>
      ) : (
        <form className="panel-acciones" onSubmit={buscar}>
          <label className="auth-campo">
            {t('auditoria.correoTecnico')}
            <input type="text" value={valor} onChange={(e) => setValor(e.target.value)} required />
          </label>
          <button type="submit" className="boton-tenue" disabled={buscando}>
            <Search size={16} aria-hidden />
            {buscando ? t('dashboard.buscando') : t('dashboard.buscar')}
          </button>
        </form>
      )}

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
