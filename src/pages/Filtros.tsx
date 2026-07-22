// Filtros (Fase 6.6.3): selector real cliente -> PCs, en reemplazo del workaround interino de Dashboard
// (que hacía buscar una PC pegando su pcId a mano). Ahora que Plant_ListFamilias existe, se puede listar
// las Familias (con filtro de texto/tipo del lado del cliente — el universo es modesto) y, al elegir una,
// mostrar sus PCs de sitio para conectar (misma TarjetaEquipo que ya usaba Dashboard).
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listarFamilias, listarPcs, type FamiliaApi, type PcApi } from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import { TarjetaEquipo } from '../components/TarjetaEquipo';
import './lista.css';

export function Filtros() {
  const { t } = useTranslation();

  const [familias, setFamilias] = useState<FamiliaApi[] | null>(null);
  const [cargandoFamilias, setCargandoFamilias] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<'todos' | 'cliente' | 'so'>('todos');

  const [familiaSel, setFamiliaSel] = useState<FamiliaApi | null>(null);
  const [pcs, setPcs] = useState<PcApi[] | null>(null);
  const [cargandoPcs, setCargandoPcs] = useState(false);

  useEffect(() => {
    let activo = true;
    setCargandoFamilias(true);
    void listarFamilias()
      .then((r) => activo && setFamilias(r.familias))
      .catch((e) => activo && setError(codigoAMensaje(t, e)))
      .finally(() => activo && setCargandoFamilias(false));
    return () => {
      activo = false;
    };
  }, [t]);

  const filtradas = useMemo(() => {
    if (!familias) return [];
    const q = texto.trim().toLowerCase();
    return familias.filter((f) => {
      if (tipo !== 'todos' && f.familyType !== tipo) return false;
      if (!q) return true;
      return f.nombre.toLowerCase().includes(q) || f.numeroCliente.toLowerCase().includes(q);
    });
  }, [familias, texto, tipo]);

  async function elegirFamilia(f: FamiliaApi) {
    setFamiliaSel(f);
    setPcs(null);
    setCargandoPcs(true);
    setError(null);
    try {
      const r = await listarPcs(f.familiaId);
      setPcs(r.pcs);
    } catch (e) {
      setError(codigoAMensaje(t, e));
    } finally {
      setCargandoPcs(false);
    }
  }

  return (
    <div className="panel">
      <p className="panel__titulo">{t('filtros.titulo')}</p>
      <p className="vacio">{t('filtros.sub')}</p>

      <div className="panel-acciones">
        <label className="auth-campo">
          {t('filtros.buscar')}
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={t('filtros.buscarPlaceholder')}
          />
        </label>
        <label className="auth-campo">
          {t('filtros.tipo')}
          <select value={tipo} onChange={(e) => setTipo(e.target.value as 'todos' | 'cliente' | 'so')}>
            <option value="todos">{t('filtros.tipoTodos')}</option>
            <option value="cliente">{t('altaCliente.tipoCliente')}</option>
            <option value="so">{t('altaCliente.tipoSo')}</option>
          </select>
        </label>
      </div>

      {error && (
        <p className="auth-error" role="alert">
          <AlertTriangle size={15} aria-hidden /> {error}
        </p>
      )}

      {cargandoFamilias ? (
        <p className="vacio">{t('app.cargando')}</p>
      ) : filtradas.length === 0 ? (
        <p className="vacio">{t('filtros.sinFamilias')}</p>
      ) : (
        <ul className="lista">
          {filtradas.map((f) => (
            <li
              className={`fila-lista fila-lista--clicable${familiaSel?.familiaId === f.familiaId ? ' fila-lista--activa' : ''}`}
              key={f.familiaId}
            >
              <button type="button" className="fila-lista__boton" onClick={() => void elegirFamilia(f)}>
                <div className="fila-lista__cab">
                  <span className="fila-lista__principal">
                    <Building2 size={14} aria-hidden /> {f.nombre}
                  </span>
                  <span className="fila-lista__meta">{f.numeroCliente}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {familiaSel && (
        <>
          <p className="panel__titulo panel__titulo--secundario">
            <Search size={13} aria-hidden /> {t('filtros.pcsDe', { nombre: familiaSel.nombre })}
          </p>
          {cargandoPcs ? (
            <p className="vacio">{t('app.cargando')}</p>
          ) : pcs && pcs.length === 0 ? (
            <p className="vacio">{t('filtros.sinPcs')}</p>
          ) : (
            <div className="tarjetas-equipo">
              {pcs?.map((pc) => <TarjetaEquipo key={pc.pcId} pc={pc} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
