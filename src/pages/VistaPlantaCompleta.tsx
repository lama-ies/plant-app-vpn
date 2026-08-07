// Pantalla completa del diagrama de proceso, DENTRO de la app (2026-08-07, pedido del usuario).
//
// Diferencia deliberada con plant-portal-client: el portal abre su equivalente en una PESTAÑA NUEVA
// (`window.open`), que es la convención de una web. Acá es una aplicación de escritorio — no hay pestañas
// que abrir —, así que es una ruta más del enrutador con su botón "Regresar". Se navega con `navigate(-1)`
// para volver exactamente de donde se vino conservando la posición de scroll, y si alguien entra directo
// por URL (sin historial) cae al tablero.
//
// Ruta: /vista-planta-completa?equipoId=<uuid>. Solo lectura, igual que /vista-planta.
//
// Va FUERA de <AppShell> a propósito: sin topbar el lienzo se queda con todo el alto del viewport, que es
// justamente el sentido de esta pantalla. Por eso lleva su propio botón de regreso — es su única salida.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CircleCheck, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  obtenerEquipo,
  obtenerPerfilEquipo,
  obtenerTelemetriaActual,
  type EquipoApi,
} from '../lib/api';
import { GotaCargando } from '../components/GotaCargando';
import { MotorDiagrama, type Lectura } from '../components/MotorDiagrama';
import type { PerfilDispositivo } from '../perfiles/tipos';
import './vista-planta-completa.css';

// Mismos números que /vista-planta y que el portal: si se separan, las pantallas dicen cosas distintas del
// mismo dato.
const UMBRAL_EN_LINEA_SEG = 120;
const SIN_DATO_SEG = 999_999;
const REFRESCO_MS = 15_000;

export function VistaPlantaCompleta() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const equipoId = params.get('equipoId') ?? '';

  const [equipo, setEquipo] = useState<EquipoApi | null>(null);
  const [perfil, setPerfil] = useState<PerfilDispositivo | null>(null);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [haceSeg, setHaceSeg] = useState(SIN_DATO_SEG);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!equipoId) return;
    try {
      const [{ equipo: eq }, { perfil: pf }, { actual }] = await Promise.all([
        obtenerEquipo(equipoId),
        obtenerPerfilEquipo(equipoId),
        obtenerTelemetriaActual(equipoId),
      ]);
      setEquipo(eq);
      setPerfil(pf);
      setHaceSeg(actual?.timestamp ? Math.max(0, (Date.now() - Date.parse(actual.timestamp)) / 1000) : SIN_DATO_SEG);
      setLecturas(
        (pf?.variablesLectura ?? []).map((v) => {
          const crudo = actual?.valores?.[v.clave];
          const valor = typeof crudo === 'boolean' ? (crudo ? 1 : 0) : typeof crudo === 'number' ? crudo : 0;
          return { clave: v.clave, etiqueta: v.etiqueta, unidad: v.unidad ?? '', valor };
        }),
      );
    } catch {
      // Un fallo de red no debe dejar la pantalla en blanco: se conserva lo último que se pintó y el
      // siguiente ciclo de refresco lo reintenta. El detalle del error ya lo muestra /vista-planta.
    } finally {
      setCargando(false);
    }
  }, [equipoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const id = setInterval(() => void cargar(), REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  /** Vuelve a donde se estaba. Sin historial propio (entrada directa por URL) cae al tablero. */
  const regresar = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard');
  };

  const enLinea = haceSeg < UMBRAL_EN_LINEA_SEG;

  return (
    <div className="planta-completa">
      <header className="planta-completa__cab">
        <button type="button" className="boton-tenue" onClick={regresar}>
          <ArrowLeft size={16} aria-hidden />
          {t('vistaPlanta.regresar')}
        </button>
        <div className="planta-completa__ident">
          <span className="planta-completa__nombre">{equipo?.nombre ?? equipoId}</span>
          {equipo && <span className="planta-completa__tipo">{t(`tipoPlanta.${equipo.tipoPlanta}`)}</span>}
        </div>
        <span className={`estado-pill ${enLinea ? 'estado-pill--activo' : 'estado-pill--suspendido'}`}>
          {enLinea ? <CircleCheck size={13} aria-hidden /> : <WifiOff size={13} aria-hidden />}
          {enLinea ? t('dashboard.equipos.enLinea') : t('dashboard.equipos.fueraDeLinea')}
        </span>
      </header>

      <main className="planta-completa__lienzo">
        {cargando ? (
          <p className="vacio">
            <GotaCargando tamano="inline" texto={t('app.cargando')} />
          </p>
        ) : (perfil?.diagrama?.nodos.length ?? 0) > 0 ? (
          <MotorDiagrama diagrama={perfil!.diagrama} lecturas={lecturas} enLinea={enLinea} />
        ) : (
          <p className="vacio">{t('vistaPlanta.sinDiagrama')}</p>
        )}
      </main>
    </div>
  );
}
