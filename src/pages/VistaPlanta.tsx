// Vista de planta de un equipo (2026-08-07, pedido del usuario): el mismo diagrama mimético en vivo que ya
// tenía plant-portal-client, ahora también en la app de escritorio.
//
// Reusa el MISMO `MotorDiagrama` que el editor de topología, en su modo VISTA (se le pasan `lecturas` y
// `enLinea` y se omiten los callbacks de edición). No se duplicó el motor a propósito: son el mismo dibujo
// sobre el mismo perfil, y tener dos implementaciones garantizaría que se separen con el tiempo.
//
// Ruta: /vista-planta?equipoId=<uuid>. Solo lectura — para EDITAR el diagrama está /editor-perfil.
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CircleCheck, FileCog, OctagonAlert, TriangleAlert, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  listarAlarmasActivas,
  obtenerEquipo,
  obtenerPerfilEquipo,
  obtenerTelemetriaActual,
  type AlarmaActivaApi,
  type EquipoApi,
} from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import { GotaCargando } from '../components/GotaCargando';
import { MotorDiagrama, type Lectura } from '../components/MotorDiagrama';
import type { PerfilDispositivo } from '../perfiles/tipos';
import './lista.css';
import './vista-planta.css';

// Mismo umbral y refresco que el tablero y que plant-portal-client: un equipo que no reporta en 120 s se
// considera fuera de línea.
const UMBRAL_EN_LINEA_SEG = 120;
const SIN_DATO_SEG = 999_999;
const REFRESCO_MS = 15_000;

export function VistaPlanta() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const equipoId = params.get('equipoId') ?? '';

  const [equipo, setEquipo] = useState<EquipoApi | null>(null);
  const [perfil, setPerfil] = useState<PerfilDispositivo | null>(null);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [alarmas, setAlarmas] = useState<AlarmaActivaApi[]>([]);
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
      // puede enlazar cualquiera a un sensor de nodo o de tubería.
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

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Refresco periódico: esta pantalla se queda abierta viendo la planta, tiene que reflejar el proceso.
  useEffect(() => {
    const id = setInterval(() => void cargar(), REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  const enLinea = haceSeg < UMBRAL_EN_LINEA_SEG;
  const fallas = alarmas.filter((a) => a.tipoAlarma === 'falla').length;
  const advertencias = alarmas.filter((a) => a.tipoAlarma === 'advertencia').length;

  if (!equipoId) {
    return (
      <div className="panel">
        <p className="vacio">{t('vistaPlanta.sinEquipo')}</p>
      </div>
    );
  }

  return (
    <div className="panel">
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
            {enLinea ? t('dashboard.equipos.enLinea') : t('dashboard.equipos.fueraDeLinea')}
          </span>
          <Link to={`/editor-perfil?equipoId=${equipoId}`} className="boton-tenue">
            <FileCog size={16} aria-hidden />
            {t('dashboard.equipos.editarPerfil')}
          </Link>
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
      ) : !perfil || (perfil.diagrama?.nodos.length ?? 0) === 0 ? (
        <p className="vacio">{t('vistaPlanta.sinDiagrama')}</p>
      ) : (
        <div className="vista-planta__cuerpo">
          <section className="vista-planta__lienzo">
            <MotorDiagrama diagrama={perfil.diagrama} lecturas={lecturas} enLinea={enLinea} />
          </section>

          <aside className="vista-planta__lateral">
            <section className="fila-lista">
              <p className="panel__titulo">{t('vistaPlanta.alarmas')}</p>
              <div className="vista-planta__alarmas">
                <span className="estado-pill estado-pill--falla">
                  <OctagonAlert size={13} aria-hidden /> {t('dashboard.equipos.fallas', { count: fallas })}
                </span>
                <span className="estado-pill estado-pill--expirado">
                  <TriangleAlert size={13} aria-hidden /> {t('dashboard.equipos.advertencias', { count: advertencias })}
                </span>
                <span className={`estado-pill ${enLinea ? 'estado-pill--activo' : 'estado-pill--suspendido'}`}>
                  {enLinea ? <CircleCheck size={13} aria-hidden /> : <WifiOff size={13} aria-hidden />}{' '}
                  {t('dashboard.equipos.actualizado', { t: tiempoRelativo(haceSeg) })}
                </span>
              </div>
            </section>

            <section className="fila-lista">
              <p className="panel__titulo">{t('vistaPlanta.lecturas')}</p>
              <div className="vista-planta__lecturas">
                {lecturas.map((l) => (
                  <div className="vista-planta__lectura" key={l.clave}>
                    <span className="vista-planta__lectura-etq">{l.etiqueta}</span>
                    <span className="vista-planta__lectura-valor">
                      {l.valor}
                      {l.unidad && <span className="vista-planta__lectura-unidad">{l.unidad}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
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
