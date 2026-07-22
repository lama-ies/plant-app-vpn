// Gestión de plantillas de perfil de dispositivo (Fase 6.6.10), rol Administrador. Dos secciones: las
// BASE por tipo de planta (número fijo y conocido: osmosis/ptar/hidroneumatico, no necesitan listado) y
// las PERSONALIZADAS por equipo — desbloqueadas por Plant_Equipos/AltaEquipo.tsx (antes no existía ningún
// alta de planta/equipo individual; ver plan-de-trabajo.md Fase 6.6.13).
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, FileCog, Plus, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listarEquipos, obtenerPerfilBase, type EquipoApi } from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import type { TipoPlanta } from '../perfiles/tipos';
import './lista.css';

const TIPOS_PLANTA: TipoPlanta[] = ['osmosis', 'ptar', 'hidroneumatico'];

export function GestionPlantillas() {
  const { t } = useTranslation();
  const [estado, setEstado] = useState<Record<TipoPlanta, boolean | null>>({
    osmosis: null,
    ptar: null,
    hidroneumatico: null,
  });

  const [familiaId, setFamiliaId] = useState('');
  const [equipos, setEquipos] = useState<EquipoApi[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    for (const tipo of TIPOS_PLANTA) {
      void obtenerPerfilBase(tipo).then(
        (r) => activo && setEstado((prev) => ({ ...prev, [tipo]: r.perfil !== null })),
        () => activo && setEstado((prev) => ({ ...prev, [tipo]: false })),
      );
    }
    return () => {
      activo = false;
    };
  }, []);

  const buscarEquipos = useCallback(async (id: string) => {
    setCargando(true);
    setError(null);
    try {
      const r = await listarEquipos(id);
      setEquipos(r.equipos);
    } catch (e) {
      setError(codigoAMensaje(t, e));
      setEquipos(null);
    } finally {
      setCargando(false);
    }
  }, [t]);

  function buscar(e: FormEvent) {
    e.preventDefault();
    if (familiaId.trim()) void buscarEquipos(familiaId.trim());
  }

  return (
    <div className="panel">
      <p className="panel__titulo">{t('gestionPlantillas.titulo')}</p>
      <p className="vacio">{t('gestionPlantillas.sub')}</p>

      <ul className="lista">
        {TIPOS_PLANTA.map((tipo) => (
          <li className="fila-lista" key={tipo}>
            <div className="fila-lista__cab">
              <span className="fila-lista__principal">{t(`tipoPlanta.${tipo}`)}</span>
              {estado[tipo] === null ? (
                <span className="fila-lista__meta">{t('app.cargando')}</span>
              ) : estado[tipo] ? (
                <span className="fila-lista__meta">
                  <CheckCircle2 size={14} aria-hidden /> {t('gestionPlantillas.existe')}
                </span>
              ) : (
                <span className="fila-lista__meta">
                  <XCircle size={14} aria-hidden /> {t('gestionPlantillas.noExiste')}
                </span>
              )}
            </div>
            <Link to="/editor-perfil" className="boton-tenue">
              <FileCog size={15} aria-hidden />
              {t('nav.editorPerfil')}
            </Link>
          </li>
        ))}
      </ul>

      <p className="panel__titulo panel__titulo--secundario">{t('gestionPlantillas.tituloPersonalizadas')}</p>

      <form className="panel-acciones" onSubmit={buscar}>
        <label className="auth-campo">
          {t('altaCliente.numeroCliente')} / familiaId
          <input type="text" value={familiaId} onChange={(e) => setFamiliaId(e.target.value)} required />
        </label>
        <button type="submit" className="boton-tenue" disabled={cargando}>
          {cargando ? t('dashboard.buscando') : t('dashboard.buscar')}
        </button>
        <Link to="/alta-equipo" className="boton-tenue">
          <Plus size={15} aria-hidden />
          {t('nav.altaEquipo')}
        </Link>
      </form>

      {error && (
        <p className="auth-error" role="alert">
          <AlertTriangle size={15} aria-hidden /> {error}
        </p>
      )}

      {equipos && (
        <>
          {equipos.length === 0 && <p className="vacio">{t('altaEquipo.sinEquipos')}</p>}
          <ul className="lista">
            {equipos.map((eq) => (
              <li className="fila-lista" key={eq.equipoId}>
                <div className="fila-lista__cab">
                  <span className="fila-lista__principal">{eq.nombre}</span>
                  <span className="fila-lista__meta">{t(`tipoPlanta.${eq.tipoPlanta}`)}</span>
                </div>
                <Link to={`/editor-perfil?equipoId=${eq.equipoId}`} className="boton-tenue">
                  <FileCog size={15} aria-hidden />
                  {t('nav.editorPerfil')}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
