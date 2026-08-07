// Tablero inicial: bienvenida + tarjetas de TODOS los equipos visibles (agregado de todas las familias,
// "universo modesto" — mismo criterio que Filtros.tsx) con buscador rápido (nombre/zona/cliente/equipoId).
// La conexión a una PC se hace desde Filtros.tsx (selector real cliente -> PCs, Fase 6.6.3); estas tarjetas
// llevan al Editor de perfil de cada equipo (2026-08-06, pedido real del usuario).
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Factory, FileCog, Filter, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/contexto';
import { usePermissions } from '../hooks/usePermissions';
import { listarEquipos, listarFamilias, listarZonas, type EquipoApi } from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import { GotaCargando } from '../components/GotaCargando';
import './lista.css';
import './dashboard.css';

interface EquipoConContexto extends EquipoApi {
  clienteNombre: string;
  clienteNumero: string;
  zonaNombre: string | null;
}

export function Dashboard() {
  const { t } = useTranslation();
  const { identidad } = useAuth();
  const permisos = usePermissions();

  const [equipos, setEquipos] = useState<EquipoConContexto[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const { familias } = await listarFamilias();
        const porFamilia = await Promise.all(
          familias.map(async (f) => {
            const [{ equipos: eqs }, { zonas }] = await Promise.all([listarEquipos(f.familiaId), listarZonas(f.familiaId)]);
            const nombrePorZona = Object.fromEntries(zonas.map((z) => [z.zonaId, z.nombre]));
            return eqs.map((e) => ({
              ...e,
              clienteNombre: f.nombre,
              clienteNumero: f.numeroCliente,
              zonaNombre: e.zonaId ? (nombrePorZona[e.zonaId] ?? null) : null,
            }));
          }),
        );
        if (activo) setEquipos(porFamilia.flat());
      } catch (e) {
        if (activo) setError(codigoAMensaje(t, e));
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [t]);

  const filtrados = useMemo(() => {
    if (!equipos) return [];
    const q = texto.trim().toLowerCase();
    if (!q) return equipos;
    return equipos.filter(
      (e) =>
        e.nombre.toLowerCase().includes(q) ||
        e.equipoId.toLowerCase().includes(q) ||
        e.clienteNombre.toLowerCase().includes(q) ||
        e.clienteNumero.toLowerCase().includes(q) ||
        (e.zonaNombre?.toLowerCase().includes(q) ?? false),
    );
  }, [equipos, texto]);

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

      <p className="panel__titulo panel__titulo--secundario">{t('dashboard.equipos.titulo')}</p>

      <div className="panel-acciones">
        <label className="auth-campo">
          {t('dashboard.equipos.buscar')}
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={t('dashboard.equipos.buscarPlaceholder')}
          />
        </label>
      </div>

      {error && (
        <p className="auth-error" role="alert">
          <AlertTriangle size={15} aria-hidden /> {error}
        </p>
      )}
      {cargando && (
        <p className="vacio">
          <GotaCargando tamano="inline" texto={t('app.cargando')} />
        </p>
      )}
      {!cargando && !error && equipos?.length === 0 && <p className="vacio">{t('dashboard.equipos.sinEquipos')}</p>}
      {!cargando && !error && (equipos?.length ?? 0) > 0 && filtrados.length === 0 && (
        <p className="vacio">{t('dashboard.equipos.sinCoincidencias')}</p>
      )}

      {filtrados.length > 0 && (
        <div className="tarjetas-equipo">
          {filtrados.map((e) => (
            <Link key={e.equipoId} to={`/editor-perfil?equipoId=${e.equipoId}`} className="fila-lista tarjeta-equipo-link">
              <div className="fila-lista__cab">
                <span className="fila-lista__principal">
                  <Factory size={14} aria-hidden /> {e.nombre}
                </span>
                <span className="fila-lista__meta">{t(`tipoPlanta.${e.tipoPlanta}`)}</span>
              </div>
              <p className="fila-lista__detalle">
                {e.clienteNombre} · {e.clienteNumero}
                {e.zonaNombre && (
                  <>
                    {' · '}
                    <MapPin size={12} aria-hidden style={{ verticalAlign: 'text-bottom' }} /> {e.zonaNombre}
                  </>
                )}
              </p>
              <span className="fila-lista__meta">{e.equipoId}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
