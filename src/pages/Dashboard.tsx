// Tablero inicial: bienvenida + tarjetas de TODOS los equipos visibles (agregado de todas las familias,
// "universo modesto" — mismo criterio que Filtros.tsx) con estado en vivo (en línea/fuera de línea,
// alarmas activas, lecturas clave) — igual que el tablero de plant-portal-client (2026-08-07, pedido
// real del usuario) — y buscador rápido (nombre/zona/cliente/equipoId). La conexión a una PC se hace desde
// Filtros.tsx; estas tarjetas llevan al Editor de perfil de cada equipo.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Factory, FileCog, Filter, MapPin, OctagonAlert, TriangleAlert, WifiOff, CircleCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/contexto';
import { usePermissions } from '../hooks/usePermissions';
import {
  listarAlarmasActivas,
  listarEquipos,
  listarFamilias,
  listarZonas,
  obtenerPerfilEquipo,
  obtenerTelemetriaActual,
  type EquipoApi,
} from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import { GotaCargando } from '../components/GotaCargando';
import './lista.css';
import './dashboard.css';

// Umbral de "en línea": si la última telemetría es más vieja que esto, se considera fuera de línea (mismo
// criterio y valor que plant-portal-client/datos/resumenEquipo.ts).
const UMBRAL_EN_LINEA_SEG = 120;
const SIN_DATO_SEG = 999_999;
const TOPE_LECTURAS = 6;

type Severidad = 'offline' | 'falla' | 'advertencia' | 'ok';

interface Lectura {
  clave: string;
  etiqueta: string;
  unidad: string;
  valor: number;
}

interface EquipoConEstado extends EquipoApi {
  clienteNombre: string;
  clienteNumero: string;
  zonaNombre: string | null;
  enLinea: boolean;
  actualizadoHaceSeg: number;
  fallas: number;
  advertencias: number;
  lecturas: Lectura[];
}

function severidadEquipo(e: EquipoConEstado): Severidad {
  if (!e.enLinea) return 'offline';
  if (e.fallas > 0) return 'falla';
  if (e.advertencias > 0) return 'advertencia';
  return 'ok';
}

function tiempoRelativo(segundos: number): string {
  if (segundos < 60) return `${Math.round(segundos)} s`;
  if (segundos < 3600) return `${Math.round(segundos / 60)} min`;
  if (segundos < 86400) return `${Math.round(segundos / 3600)} h`;
  return `${Math.round(segundos / 86400)} d`;
}

const PILL_POR_SEVERIDAD: Record<Severidad, string> = {
  ok: 'estado-pill--activo',
  advertencia: 'estado-pill--expirado',
  falla: 'estado-pill--falla',
  offline: 'estado-pill--suspendido',
};

export function Dashboard() {
  const { t } = useTranslation();
  const { identidad } = useAuth();
  const permisos = usePermissions();

  const [equipos, setEquipos] = useState<EquipoConEstado[] | null>(null);
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
            return Promise.all(
              eqs.map(async (eq): Promise<EquipoConEstado> => {
                const [{ perfil }, { actual }, { alarmas }] = await Promise.all([
                  obtenerPerfilEquipo(eq.equipoId),
                  obtenerTelemetriaActual(eq.equipoId),
                  listarAlarmasActivas(eq.equipoId),
                ]);
                const actualizadoHaceSeg = actual?.timestamp
                  ? Math.max(0, (Date.now() - Date.parse(actual.timestamp)) / 1000)
                  : SIN_DATO_SEG;
                const porClave = new Map((perfil?.variablesLectura ?? []).map((v) => [v.clave, v]));
                const lecturas: Lectura[] = (perfil?.dashboard.variables ?? [])
                  .slice(0, TOPE_LECTURAS)
                  .map((clave) => {
                    const meta = porClave.get(clave);
                    if (!meta) return null;
                    const crudo = actual?.valores?.[clave];
                    const valor = typeof crudo === 'boolean' ? (crudo ? 1 : 0) : typeof crudo === 'number' ? crudo : 0;
                    return { clave, etiqueta: meta.etiqueta, unidad: meta.unidad ?? '', valor };
                  })
                  .filter((l): l is Lectura => l !== null);
                return {
                  ...eq,
                  clienteNombre: f.nombre,
                  clienteNumero: f.numeroCliente,
                  zonaNombre: eq.zonaId ? (nombrePorZona[eq.zonaId] ?? null) : null,
                  enLinea: actualizadoHaceSeg < UMBRAL_EN_LINEA_SEG,
                  actualizadoHaceSeg,
                  fallas: alarmas.filter((a) => a.tipoAlarma === 'falla').length,
                  advertencias: alarmas.filter((a) => a.tipoAlarma === 'advertencia').length,
                  lecturas,
                };
              }),
            );
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
          {filtrados.map((e) => {
            const sev = severidadEquipo(e);
            const AlarmaIcono = sev === 'falla' ? OctagonAlert : sev === 'advertencia' ? TriangleAlert : sev === 'offline' ? WifiOff : CircleCheck;
            const textoAlarma =
              sev === 'falla'
                ? t('dashboard.equipos.fallas', { count: e.fallas })
                : sev === 'advertencia'
                  ? t('dashboard.equipos.advertencias', { count: e.advertencias })
                  : sev === 'offline'
                    ? t('dashboard.equipos.sinDatos')
                    : t('dashboard.equipos.sinAlarmas');

            return (
              <Link key={e.equipoId} to={`/editor-perfil?equipoId=${e.equipoId}`} className="fila-lista tarjeta-equipo-link">
                <span className="tarjeta-equipo__cliente">{e.clienteNombre}</span>
                <div className="fila-lista__cab">
                  <span className="fila-lista__principal">
                    <Factory size={14} aria-hidden /> {e.nombre}
                  </span>
                  <span className={`estado-pill ${PILL_POR_SEVERIDAD[e.enLinea ? 'ok' : 'offline']}`}>
                    {e.enLinea ? t('dashboard.equipos.enLinea') : t('dashboard.equipos.fueraDeLinea')}
                  </span>
                </div>
                <p className="fila-lista__detalle">
                  {t(`tipoPlanta.${e.tipoPlanta}`)} · {e.clienteNumero}
                  {e.zonaNombre && (
                    <>
                      {' · '}
                      <MapPin size={12} aria-hidden style={{ verticalAlign: 'text-bottom' }} /> {e.zonaNombre}
                    </>
                  )}
                </p>

                {e.lecturas.length > 0 && (
                  <div className="tarjeta-equipo__lecturas">
                    {e.lecturas.map((l) => (
                      <div className="tarjeta-equipo__lectura" key={l.clave}>
                        <span className="tarjeta-equipo__valor">
                          {l.valor}
                          {l.unidad && <span className="tarjeta-equipo__unidad">{l.unidad}</span>}
                        </span>
                        <span className="tarjeta-equipo__etq">{l.etiqueta}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="fila-lista__cab">
                  <span className={`estado-pill ${PILL_POR_SEVERIDAD[sev]}`}>
                    <AlarmaIcono size={13} aria-hidden style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} />
                    {textoAlarma}
                  </span>
                  <span className="fila-lista__meta">
                    {t('dashboard.equipos.actualizado', { t: tiempoRelativo(e.actualizadoHaceSeg) })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
