// Vista de planta de un equipo (2026-08-07, pedido del usuario): el mismo diagrama mimético en vivo que ya
// tenía plant-portal-client, ahora también en la app de escritorio, y con las MISMAS secciones — variables,
// alarmas, ficha técnica y gráficas de estudio (segunda pasada del mismo día: la primera versión solo traía
// el dibujo y un resumen de alarmas, y el usuario la reportó incompleta).
//
// Reusa los MISMOS motores que el portal: `MotorDiagrama` en modo vista (se le pasan `lecturas` y `enLinea`
// y se omiten los callbacks de edición), `ListaSensores` y `MotorGraficas`. No se duplicó ninguno a
// propósito: son el mismo dibujo sobre el mismo perfil, y tener dos implementaciones garantizaría que se
// separen con el tiempo.
//
// Ruta: /vista-planta?equipoId=<uuid>. SOLO LECTURA — para editar el diagrama está /editor-perfil, y el
// control remoto (arranque/paro, setpoints) es del portal del cliente, no de aquí.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CircleCheck,
  FileCog,
  OctagonAlert,
  TriangleAlert,
  WifiOff,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  listarAlarmasActivas,
  obtenerEquipo,
  obtenerHistorialTelemetria,
  obtenerPerfilEquipo,
  obtenerTelemetriaActual,
  serieDeVariable,
  type AlarmaActivaApi,
  type EquipoApi,
  type PuntoHistorial,
} from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import { GotaCargando } from '../components/GotaCargando';
import { ListaSensores } from '../components/ListaSensores';
import { MotorDiagrama, type Lectura } from '../components/MotorDiagrama';
import { MotorGraficas } from '../components/MotorGraficas';
import type { FichaTecnica, PerfilDispositivo } from '../perfiles/tipos';
import { usePermissions } from '../hooks/usePermissions';
import './lista.css';
import './vista-planta.css';

// Mismo umbral y refresco que el tablero y que plant-portal-client: un equipo que no reporta en 120 s se
// considera fuera de línea. Si estos números se separan, las dos apps dicen cosas distintas del mismo dato.
const UMBRAL_EN_LINEA_SEG = 120;
const SIN_DATO_SEG = 999_999;
const REFRESCO_MS = 15_000;

// Ventana de historial de las gráficas de estudio: últimas 24 h (igual que el portal).
const VENTANA_HISTORIAL_MS = 24 * 3600_000;

// Orden fijo de la ficha técnica (ver 11-perfiles-dispositivo.md). Todos los campos son opcionales, así que
// se filtran los vacíos y la sección entera se oculta si no se llenó ninguno.
const ORDEN_FICHA_TECNICA: (keyof FichaTecnica)[] = [
  'descripcion', 'capacidad', 'voltajeOperacion', 'numeroEquipo', 'ubicacion', 'cliente', 'modelo', 'serie',
  'fabricante',
];

export function VistaPlanta() {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const permisos = usePermissions();
  const equipoId = params.get('equipoId') ?? '';

  const [equipo, setEquipo] = useState<EquipoApi | null>(null);
  const [perfil, setPerfil] = useState<PerfilDispositivo | null>(null);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [alarmas, setAlarmas] = useState<AlarmaActivaApi[]>([]);
  const [historialPorClave, setHistorialPorClave] = useState<Record<string, PuntoHistorial[]>>({});
  const [haceSeg, setHaceSeg] = useState(SIN_DATO_SEG);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!equipoId) return;
    try {
      const [{ equipo: eq }, { perfil: pf }, { actual }, { alarmas: act }] = await Promise.all([
        obtenerEquipo(equipoId),
        obtenerPerfilEquipo(equipoId),
        obtenerTelemetriaActual(equipoId),
        listarAlarmasActivas(equipoId),
      ]);
      setEquipo(eq);
      setPerfil(pf);
      setAlarmas(act);
      setHaceSeg(actual?.timestamp ? Math.max(0, (Date.now() - Date.parse(actual.timestamp)) / 1000) : SIN_DATO_SEG);

      // Se resuelven TODAS las variables de lectura del perfil (no solo las 6 del tablero): el diagrama
      // puede enlazar cualquiera a un sensor de nodo o de tubería, y la lista lateral las muestra todas.
      setLecturas(
        (pf?.variablesLectura ?? []).map((v) => {
          const crudo = actual?.valores?.[v.clave];
          const valor = typeof crudo === 'boolean' ? (crudo ? 1 : 0) : typeof crudo === 'number' ? crudo : 0;
          return { clave: v.clave, etiqueta: v.etiqueta, unidad: v.unidad ?? '', valor };
        }),
      );
      setError(null);
    } catch (e) {
      setError(codigoAMensaje(t, e));
    } finally {
      setCargando(false);
    }
  }, [equipoId, t]);

  // Claves que necesitan serie histórica: la unión de las variables que referencian las gráficas del
  // perfil. El diagrama en sí solo usa el valor ACTUAL, así que no entra en esta consulta.
  const clavesGraficas = useMemo(
    () => (perfil ? [...new Set(perfil.graficas.flatMap((g) => g.variables))] : []),
    [perfil],
  );

  const cargarHistorial = useCallback(async () => {
    if (!equipoId || clavesGraficas.length === 0) return;
    try {
      const hasta = new Date();
      const desde = new Date(hasta.getTime() - VENTANA_HISTORIAL_MS);
      const { historial } = await obtenerHistorialTelemetria(equipoId, desde.toISOString(), hasta.toISOString());
      const mapa: Record<string, PuntoHistorial[]> = {};
      for (const clave of clavesGraficas) mapa[clave] = serieDeVariable(historial, clave);
      setHistorialPorClave(mapa);
    } catch {
      // Si el historial falla, las gráficas quedan vacías pero el resto de la pantalla sigue viva: el
      // diagrama, las lecturas y las alarmas no dependen de Timestream.
      setHistorialPorClave({});
    }
  }, [equipoId, clavesGraficas]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    void cargarHistorial();
  }, [cargarHistorial]);

  // Refresco periódico: esta pantalla se queda abierta viendo la planta, tiene que reflejar el proceso.
  useEffect(() => {
    const id = setInterval(() => {
      void cargar();
      void cargarHistorial();
    }, REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargar, cargarHistorial]);

  const enLinea = haceSeg < UMBRAL_EN_LINEA_SEG;
  const fallas = alarmas.filter((a) => a.tipoAlarma === 'falla').length;
  const advertencias = alarmas.filter((a) => a.tipoAlarma === 'advertencia').length;

  // Descripción legible de una alarma activa: se busca su código en el catálogo del perfil y se toma el
  // texto en el idioma de la sesión. Si el catálogo no la trae (alarma vieja, perfil recién cambiado) se
  // muestra el código crudo — nunca una fila vacía.
  const descripcionAlarma = (codigo: string): string => {
    const entrada = perfil?.catalogoAlarmas.find((c) => c.codigo === codigo);
    if (!entrada) return codigo;
    const textos = entrada.descripcion as Record<string, string | undefined>;
    return textos[i18n.language] ?? textos.es ?? codigo;
  };

  const filasFichaTecnica = ORDEN_FICHA_TECNICA
    .map((clave) => ({ clave, valor: perfil?.fichaTecnica?.[clave] }))
    .filter((f): f is { clave: keyof FichaTecnica; valor: string } => Boolean(f.valor));

  if (!equipoId) {
    return (
      <div className="panel">
        <p className="vacio">{t('vistaPlanta.sinEquipo')}</p>
      </div>
    );
  }

  const hayDiagrama = (perfil?.diagrama?.nodos.length ?? 0) > 0;

  return (
    <div className="panel vista-planta">
      <div className="vista-planta__top">
        <Link to="/dashboard" className="boton-tenue">
          <ArrowLeft size={16} aria-hidden />
          {t('nav.dashboard')}
        </Link>
        <div className="vista-planta__ident">
          <span className="vista-planta__nombre">{equipo?.nombre ?? equipoId}</span>
          {equipo && <span className="vista-planta__tipo">{t(`tipoPlanta.${equipo.tipoPlanta}`)}</span>}
        </div>
        <div className="vista-planta__acciones">
          <span className={`estado-pill ${enLinea ? 'estado-pill--activo' : 'estado-pill--suspendido'}`}>
            {enLinea ? <CircleCheck size={13} aria-hidden /> : <WifiOff size={13} aria-hidden />}
            {enLinea ? t('dashboard.equipos.enLinea') : t('dashboard.equipos.fueraDeLinea')}
          </span>
          {permisos.canEditorPerfil && (
            <Link to={`/editor-perfil?equipoId=${equipoId}`} className="boton-tenue">
              <FileCog size={16} aria-hidden />
              {t('dashboard.equipos.editarPerfil')}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="vacio">
          <GotaCargando tamano="inline" texto={t('app.cargando')} />
        </p>
      ) : !perfil ? (
        <p className="vacio">{t('vistaPlanta.sinDiagrama')}</p>
      ) : (
        <>
          <div className="vista-planta__cuerpo">
            {/* Lienzo del proceso + lista de sensores agrupada por equipo/tubería. */}
            <section className="vista-planta__lienzo" aria-label={t('vistaPlanta.proceso')}>
              <h2 className="vista-planta__titulo">{t('vistaPlanta.proceso')}</h2>
              {hayDiagrama ? (
                <MotorDiagrama diagrama={perfil.diagrama} lecturas={lecturas} enLinea={enLinea} />
              ) : (
                <p className="vacio">{t('vistaPlanta.sinDiagrama')}</p>
              )}
              <ListaSensores diagrama={perfil.diagrama} lecturas={lecturas} />
            </section>

            <aside className="vista-planta__lateral">
              {/* Variables: todas las de lectura del perfil, con su valor en vivo. */}
              <section className="vista-planta__bloque">
                <h2 className="vista-planta__titulo">{t('vistaPlanta.lecturas')}</h2>
                {lecturas.length > 0 ? (
                  <div className="vista-planta__lecturas">
                    {lecturas.map((l) => (
                      <div className="fila-lectura" key={l.clave}>
                        <span className="fila-lectura__etq">{l.etiqueta}</span>
                        <span className="fila-lectura__valor">
                          {l.valor}
                          {l.unidad && <span className="fila-lectura__unidad">{l.unidad}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="vacio">{t('vistaPlanta.sinVariables')}</p>
                )}
              </section>

              {/* Alarmas: el conteo por severidad y, debajo, la lista real de las que están activas ahora
                  (código + descripción del catálogo del perfil + desde cuándo). */}
              <section className="vista-planta__bloque">
                <h2 className="vista-planta__titulo">{t('vistaPlanta.alarmas')}</h2>
                <div className="vista-planta__alarmas-resumen">
                  <span className="estado-pill estado-pill--falla">
                    <OctagonAlert size={13} aria-hidden /> {t('dashboard.equipos.fallas', { count: fallas })}
                  </span>
                  <span className="estado-pill estado-pill--expirado">
                    <TriangleAlert size={13} aria-hidden /> {t('dashboard.equipos.advertencias', { count: advertencias })}
                  </span>
                </div>
                {alarmas.length > 0 ? (
                  <ul className="vista-planta__alarmas-lista">
                    {alarmas.map((a) => (
                      <li className={`alarma-fila alarma-fila--${a.tipoAlarma}`} key={`${a.pk}#${a.sk}`}>
                        {/* Icono por severidad: sin él la falla y la advertencia solo se distinguen por el
                            color del código, que un daltónico no separa (rojo vs ámbar). */}
                        {a.tipoAlarma === 'falla' ? (
                          <OctagonAlert size={13} className="alarma-fila__icono" aria-hidden />
                        ) : (
                          <TriangleAlert size={13} className="alarma-fila__icono" aria-hidden />
                        )}
                        <span className="alarma-fila__codigo">{a.codigoAlarma}</span>
                        <span className="alarma-fila__desc">{descripcionAlarma(a.codigoAlarma)}</span>
                        <span className="alarma-fila__hora">
                          {new Date(a.timestampActivacion).toLocaleString(i18n.language)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="vacio">{t('vistaPlanta.sinAlarmas')}</p>
                )}
                <p className="vista-planta__pie">
                  {t('dashboard.equipos.actualizado', { t: tiempoRelativo(haceSeg) })}
                </p>
              </section>

              {/* Datos de planta (ficha técnica): información de construcción cargada al armar el config.
                  No participa de ninguna lógica del sistema, es referencia para quien opera. */}
              {filasFichaTecnica.length > 0 && (
                <section className="vista-planta__bloque">
                  <h2 className="vista-planta__titulo">{t('vistaPlanta.fichaTecnica.titulo')}</h2>
                  <div className="vista-planta__lecturas">
                    {filasFichaTecnica.map((f) => (
                      <div className="fila-lectura" key={f.clave}>
                        <span className="fila-lectura__etq">{t(`vistaPlanta.fichaTecnica.${f.clave}`)}</span>
                        <span className="fila-lectura__valor">{f.valor}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </aside>
          </div>

          {/* Gráficas de estudio: fuera del grid principal para tener ancho suficiente. Cada grupo de
              variables del perfil es una tarjeta en una rejilla adaptable. */}
          <section className="vista-planta__graficas" aria-label={t('vistaPlanta.graficas')}>
            <h2 className="vista-planta__titulo">{t('vistaPlanta.graficas')}</h2>
            {perfil.graficas.length > 0 ? (
              <div className="vista-planta__graficas-rejilla">
                {perfil.graficas.map((g) => (
                  <MotorGraficas key={g.id} grafica={g} lecturas={lecturas} historialPorClave={historialPorClave} />
                ))}
              </div>
            ) : (
              <p className="vacio">{t('vistaPlanta.sinGraficas')}</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** Igual que en el tablero: "hace 3 min" en la unidad más legible. */
function tiempoRelativo(segundos: number): string {
  if (segundos >= SIN_DATO_SEG) return '—';
  if (segundos < 60) return `${Math.round(segundos)} s`;
  if (segundos < 3600) return `${Math.round(segundos / 60)} min`;
  if (segundos < 86400) return `${Math.round(segundos / 3600)} h`;
  return `${Math.round(segundos / 86400)} d`;
}
