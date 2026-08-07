// Selector de Familia por lista filtrable — reemplaza pegar un `familiaId`/número de cliente a mano
// (el Administrador no tiene por qué conocerlo de memoria): siempre se ve la lista completa de familias,
// el buscador solo la filtra en el cliente (mismo patrón que Filtros.tsx, universo modesto). `tipo` fija
// el tipo de familia cuando la pantalla solo opera sobre uno (ej. GestionGerentes es solo S&O); si no se
// pasa, el propio selector de tipo queda visible para que el usuario elija.
import { useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listarFamilias, type FamiliaApi } from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import { GotaCargando } from './GotaCargando';
import './selectorFamilia.css';

interface PropiedadesSelectorFamilia {
  valor: string;
  onSeleccionar: (familia: FamiliaApi) => void;
  tipo?: 'cliente' | 'so';
}

export function SelectorFamilia({ valor, onSeleccionar, tipo: tipoFijo }: PropiedadesSelectorFamilia) {
  const { t } = useTranslation();
  const [familias, setFamilias] = useState<FamiliaApi[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<'todos' | 'cliente' | 'so'>('todos');

  useEffect(() => {
    let activo = true;
    setCargando(true);
    void listarFamilias()
      .then((r) => activo && setFamilias(r.familias))
      .catch((e) => activo && setError(codigoAMensaje(t, e)))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [t]);

  const filtradas = useMemo(() => {
    if (!familias) return [];
    const tipoActivo = tipoFijo ?? tipo;
    const q = texto.trim().toLowerCase();
    return familias.filter((f) => {
      if (tipoActivo !== 'todos' && f.familyType !== tipoActivo) return false;
      if (!q) return true;
      return f.nombre.toLowerCase().includes(q) || f.numeroCliente.toLowerCase().includes(q);
    });
  }, [familias, texto, tipo, tipoFijo]);

  const seleccionada = familias?.find((f) => f.familiaId === valor) ?? null;

  return (
    <div className="selector-familia">
      {seleccionada && (
        <p className="selector-familia__actual">
          <Building2 size={14} aria-hidden />
          {seleccionada.nombre} ({seleccionada.numeroCliente})
        </p>
      )}

      <div className="panel-acciones">
        <label className="auth-campo">
          {t('selectorFamilia.buscar')}
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={t('selectorFamilia.buscarPlaceholder')}
          />
        </label>
        {!tipoFijo && (
          <label className="auth-campo">
            {t('filtros.tipo')}
            <select value={tipo} onChange={(e) => setTipo(e.target.value as 'todos' | 'cliente' | 'so')}>
              <option value="todos">{t('filtros.tipoTodos')}</option>
              <option value="cliente">{t('altaCliente.tipoCliente')}</option>
              <option value="so">{t('altaCliente.tipoSo')}</option>
            </select>
          </label>
        )}
      </div>

      {cargando ? (
        <p className="vacio">
          <GotaCargando tamano="inline" texto={t('app.cargando')} />
        </p>
      ) : error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : filtradas.length === 0 ? (
        <p className="vacio">{t('selectorFamilia.sinResultados')}</p>
      ) : (
        <ul className="lista selector-familia__lista">
          {filtradas.map((f) => (
            <li
              className={`fila-lista fila-lista--clicable${f.familiaId === valor ? ' fila-lista--activa' : ''}`}
              key={f.familiaId}
            >
              <button type="button" className="fila-lista__boton" onClick={() => onSeleccionar(f)}>
                <div className="fila-lista__cab">
                  <span className="fila-lista__principal">
                    <Building2 size={14} aria-hidden /> {f.nombre}
                  </span>
                  <span className="fila-lista__meta">
                    {f.numeroCliente} · {t(f.familyType === 'so' ? 'altaCliente.tipoSo' : 'altaCliente.tipoCliente')}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
