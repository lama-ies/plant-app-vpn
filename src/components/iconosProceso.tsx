// Catálogo de íconos propios (Fase 2, ver spec 2026-07-30-diagrama-isometrico-design.md §9): un glifo SVG
// bespoke por cada TipoNodoProceso, dibujado a mano (no Lucide) porque representa equipo real de planta
// (tanque FRP, banco de membranas, PX, etc.) que ningún ícono genérico transmite con claridad. Todos
// comparten el mismo lienzo lógico (viewBox 0 0 48 48, centrado en 24,24) y el mismo lenguaje visual
// (trazo `currentColor`, esquinas/uniones redondeadas) para que MotorDiagrama pueda montarlos con el mismo
// wrapper `<svg x y width height viewBox="0 0 48 48">`, sin caja ni cubo que los encierre (ver §9: el
// usuario pidió quitar el recuadro isométrico y mostrar el ícono grande, directo sobre el lienzo).
import type { TipoNodoProceso } from '../diagramas/tipos';

type ComponenteIcono = () => React.JSX.Element;

const TRAZO = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** Tanque cilíndrico vertical (cisterna, tanque pulmón, cisterna final): usado por 2 tipos que en planta
 * son el mismo objeto físico (una cisterna), solo cambia su rol en el proceso. */
function IconoTanque() {
  return (
    <g {...TRAZO}>
      <path d="M12 10 C12 7.8 17.4 6 24 6 C30.6 6 36 7.8 36 10 V38 C36 40.2 30.6 42 24 42 C17.4 42 12 40.2 12 38 Z" />
      <path d="M12 10 C12 12.2 17.4 14 24 14 C30.6 14 36 12.2 36 10" />
    </g>
  );
}

/** Torre desgasificadora: columna empacada con bandejas internas + venteo superior de gases. */
function IconoTorreDesgasificadora() {
  return (
    <g {...TRAZO}>
      <rect x={14} y={7} width={20} height={35} rx={3} />
      <path d="M18 16 H30 M18 24 H30 M18 32 H30" />
      <path d="M24 7 V2 M20 5 L24 1 L28 5" />
    </g>
  );
}

/** Bomba centrífuga genérica: voluta (círculo) + motor sobre el eje + boquillas de succión/descarga. */
function IconoBomba() {
  return (
    <g {...TRAZO}>
      <circle cx={22} cy={28} r={11} />
      <path d="M22 17 V9 M16 9 H28" />
      <path d="M11 28 H4 M33 22 L40 15" />
    </g>
  );
}

/** Bomba sumergible: cápsula vertical alargada (motor bajo el agua) con difusor cónico en la boca. */
function IconoBombaSumergible() {
  return (
    <g {...TRAZO}>
      <path d="M17 6 H31 L27 14 H21 Z" />
      <rect x={16} y={14} width={16} height={26} rx={7} />
      <path d="M20 20 H28 M20 26 H28 M20 32 H28" />
    </g>
  );
}

/** Bomba de realce/booster horizontal: voluta + motor en línea (montaje horizontal típico de estas bombas). */
function IconoBombaHorizontal() {
  return (
    <g {...TRAZO}>
      <circle cx={18} cy={24} r={9} />
      <rect x={27} y={18} width={14} height={12} rx={2} />
      <path d="M9 24 H4 M41 24 H45" />
    </g>
  );
}

/** Pozo: cabezal de pozo + ademe (casing) descendiendo hacia el acuífero (trama de tierra). */
function IconoPozo() {
  return (
    <g {...TRAZO}>
      <rect x={17} y={5} width={14} height={7} rx={1.5} />
      <path d="M21 12 V38 M27 12 V38" />
      <path d="M10 38 H38 M12 42 L16 38 M20 42 L24 38 M28 42 L32 38 M36 42 L38 40" strokeWidth={1.8} />
    </g>
  );
}

/** Filtro multimedia: tanque FRP con domo superior redondeado + boquillas laterales de entrada/salida. */
function IconoFiltroMultimedia() {
  return (
    <g {...TRAZO}>
      <path d="M14 20 C14 10 34 10 34 20 V38 C34 40.8 29.5 42 24 42 C18.5 42 14 40.8 14 38 Z" />
      <path d="M9 18 H14 M34 26 H39" />
    </g>
  );
}

/** Válvula actuadora: cuerpo de válvula (mariposa/bowtie) + actuador motorizado encima. */
function IconoValvulaActuadora() {
  return (
    <g {...TRAZO}>
      <rect x={17} y={7} width={14} height={9} rx={1.5} />
      <circle cx={24} cy={16} r={2} fill="currentColor" stroke="none" />
      <path d="M12 30 L24 22 L36 30 L24 38 Z" />
      <path d="M6 30 H12 M36 30 H42" />
    </g>
  );
}

/** Filtro canasta: cuerpo cilíndrico con malla (rejilla) visible + tapa/manija superior. */
function IconoFiltroCanasta() {
  return (
    <g {...TRAZO}>
      <path d="M9 12 H39 M13 12 V38 A11 4 0 0 0 35 38 V12" />
      <path d="M17 16 V34 M24 16 V34 M31 16 V34" strokeWidth={1.6} />
    </g>
  );
}

/** Filtro de carbono / carbono activado: mismo cuerpo que la canasta, con relleno granular (medio de carbón). */
function IconoFiltroCarbono() {
  return (
    <g {...TRAZO}>
      <path d="M9 12 H39 M13 12 V38 A11 4 0 0 0 35 38 V12" />
      <g fill="currentColor" stroke="none">
        <circle cx={18} cy={19} r={1.4} />
        <circle cx={25} cy={17} r={1.4} />
        <circle cx={31} cy={20} r={1.4} />
        <circle cx={20} cy={25} r={1.4} />
        <circle cx={28} cy={26} r={1.4} />
        <circle cx={17} cy={31} r={1.4} />
        <circle cx={24} cy={32} r={1.4} />
        <circle cx={31} cy={30} r={1.4} />
      </g>
    </g>
  );
}

/** Bomba de alta presión (multietapa, horizontal): carcasa acanalada por etapas + motor acoplado. */
function IconoBombaAltaPresion() {
  return (
    <g {...TRAZO}>
      <rect x={7} y={19} width={20} height={10} rx={1.5} />
      <path d="M12 19 V29 M17 19 V29 M22 19 V29" strokeWidth={1.6} />
      <rect x={27} y={16} width={13} height={16} rx={2} />
    </g>
  );
}

/** Banco de membranas RO: 3 housings horizontales en paralelo, con tapas en ambos extremos. */
function IconoMembranaRO() {
  return (
    <g {...TRAZO}>
      <rect x={6} y={9} width={36} height={7} rx={3.5} />
      <rect x={6} y={20.5} width={36} height={7} rx={3.5} />
      <rect x={6} y={32} width={36} height={7} rx={3.5} />
    </g>
  );
}

/** TurboCharger (recuperación de energía por turbina): rodete con doble voluta enfrentada. */
function IconoTurbocharger() {
  return (
    <g {...TRAZO}>
      <circle cx={24} cy={24} r={13} />
      <path d="M24 24 C24 18 30 18 30 24 C30 30 24 30 24 24 C24 18 18 18 18 24 C18 30 24 30 24 24" strokeWidth={1.8} />
      <path d="M24 6 V11 M24 37 V42" />
    </g>
  );
}

/** Recuperador PX (intercambiador de presión, rotor cerámico): cilindro horizontal con líneas de rotor. */
function IconoRecuperadorPX() {
  return (
    <g {...TRAZO}>
      <rect x={7} y={15} width={34} height={18} rx={9} />
      <path d="M16 15 V33 M24 15 V33 M32 15 V33" strokeWidth={1.6} />
    </g>
  );
}

/** Soplador de aire: carcasa circular con aspas internas + flecha de flujo de aire saliente. */
function IconoSoplador() {
  return (
    <g {...TRAZO}>
      <circle cx={20} cy={24} r={13} />
      <path d="M20 24 L20 13 M20 24 L28.5 29 M20 24 L11.5 29" strokeWidth={1.8} />
      <path d="M35 24 H43 M39 19 L44 24 L39 29" />
    </g>
  );
}

/** Inyección de cloro: punto de dosificación (tee de tubería) recibiendo una gota de reactivo. */
function IconoInyeccionCloro() {
  return (
    <g {...TRAZO}>
      <path d="M6 24 H42 M24 24 V15" />
      <path d="M24 4 C28 9 28 12.5 24 14.5 C20 12.5 20 9 24 4 Z" fill="currentColor" stroke="none" />
    </g>
  );
}

/** Lámpara UV: tubo emisor con rayos radiando hacia ambos lados (desinfección). */
function IconoLamparaUV() {
  return (
    <g {...TRAZO}>
      <rect x={10} y={20} width={28} height={8} rx={4} />
      <path d="M14 14 L16 18 M34 14 L32 18 M14 34 L16 30 M34 34 L32 30 M9 24 H4 M44 24 H39" strokeWidth={1.8} />
    </g>
  );
}

/** Dosificadora química: bomba de diafragma pequeña sobre un bidón/tanque de reactivo. */
function IconoDosificadora() {
  return (
    <g {...TRAZO}>
      <path d="M14 20 H30 V40 H14 Z" />
      <path d="M18 20 V15 H26 V20" />
      <path d="M22 6 V13 M18 9 L22 6 L26 9" />
    </g>
  );
}

/** Salida de drenaje: flecha hacia una rejilla — soporta `rotacion` (nodo.rotacion) para orientar la
 * descarga según la tubería real que llega (ver spec §9: N1/N2/N3 la rotan 90° para apuntar hacia abajo). */
function IconoSalidaDrenaje() {
  return (
    <g {...TRAZO}>
      <path d="M6 24 H30 M23 17 L30 24 L23 31" />
      <path d="M34 12 V36 M40 12 V36" strokeWidth={1.8} />
    </g>
  );
}

/** Línea de distribución (tubería de suministro genérica, hidroneumático): flecha simple de flujo. */
function IconoLineaDistribucion() {
  return (
    <g {...TRAZO}>
      <path d="M5 24 H38 M31 17 L38 24 L31 31" />
    </g>
  );
}

/** Mapa TipoNodoProceso -> componente de ícono. Único punto que el motor de render consulta — agregar un
 * tipo nuevo en `tipos.ts` obliga (por el tipo `Record`) a agregar su glifo aquí también. */
export const ICONO_PROCESO: Record<TipoNodoProceso, ComponenteIcono> = {
  tanque: IconoTanque,
  tanquePulmon: IconoTanque,
  torreDesgasificadora: IconoTorreDesgasificadora,
  bomba: IconoBomba,
  bombaSumergible: IconoBombaSumergible,
  bombaRealce: IconoBombaHorizontal,
  bombaBooster: IconoBombaHorizontal,
  pozo: IconoPozo,
  filtroMultimedia: IconoFiltroMultimedia,
  valvulaActuadora: IconoValvulaActuadora,
  filtroCanasta: IconoFiltroCanasta,
  filtroCarbono: IconoFiltroCarbono,
  filtroCarbonoActivado: IconoFiltroCarbono,
  bombaAltaPresion: IconoBombaAltaPresion,
  membranaRO: IconoMembranaRO,
  turbocharger: IconoTurbocharger,
  recuperadorPX: IconoRecuperadorPX,
  soplador: IconoSoplador,
  inyeccionCloro: IconoInyeccionCloro,
  lamparaUV: IconoLamparaUV,
  dosificadora: IconoDosificadora,
  salidaDrenaje: IconoSalidaDrenaje,
  lineaDistribucion: IconoLineaDistribucion,
};
