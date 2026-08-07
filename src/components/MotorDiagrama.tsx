// Motor de render del diagrama mimético (2.5D, ver spec 2026-07-30-diagrama-isometrico-design.md §9) —
// vista previa del editor. Dibuja CUALQUIER DiagramaEquipo ya ensamblado: no conoce el catálogo de
// segmentos ni el ensamblador. Este editor NUNCA tiene telemetría real: cada sensor muestra el TAG
// (variable asignada) para confirmar el enlace visualmente, no un valor en vivo.
import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConexionDiagrama, DiagramaEquipo, NodoDiagrama } from '../diagramas/tipos';
import { medioDeTuberia, TuberiaIso } from './TuberiaIso';
import { LienzoZoomable } from './LienzoZoomable';
import { pixelesAUnidadesViewBox } from '../diagramas/zoomIso';
import { reencaminarRetornos } from '../diagramas/rutaRetorno';
import type { Punto } from '../diagramas/tuberiaIsoGeometria';
import { ICONO_PROCESO } from './iconosProceso';
import './motor-diagrama.css';

// Radio del fondo circular sólido detrás de cada ícono: oculta el extremo de la tubería que llega bajo el
// ícono (ver spec §9 — el usuario pidió quitar la caja/cubo isométrico y mostrar el ícono grande, directo
// sobre el lienzo, con este círculo como único elemento de "carcasa").
const RADIO_ICONO = 30;
const LADO_ICONO = RADIO_ICONO * 1.7;

/**
 * Valor en vivo de una variable, para el modo VISTA (ver `MotorDiagrama.lecturas`). Se define aquí y no en
 * `perfiles/tipos.ts` porque no es parte del perfil: es telemetría resuelta contra `Plant_Telemetria`.
 */
export interface Lectura {
  clave: string;
  etiqueta: string;
  unidad: string;
  valor: number;
}

interface Props {
  diagrama: DiagramaEquipo;
  /** Presente = modo editor (permite renombrar nodos). Ausente = solo lectura (portal-client). */
  onEditarEtiqueta?: (nodoId: string, nuevaEtiqueta: string) => void;
  /** Presente = modo editor (permite arrastrar el badge de sensores de una tubería, persistido en
   * `offsetEtiqueta`). Ausente = solo lectura: se respeta la posición que dejó el admin, sin poder tocarla
   * (ver gobierno de la función, spec §9 addendum). */
  onCambiar?: (diagrama: DiagramaEquipo) => void;
  /**
   * Presente = modo VISTA EN VIVO (pantalla "Ver planta", 2026-08-07): en vez del NOMBRE de la variable
   * enlazada —que es lo que interesa al editar— se pinta su VALOR actual con su unidad. Ausente = modo
   * editor/topología, comportamiento previo sin cambios.
   */
  lecturas?: Lectura[];
  /** Solo en modo vivo: anima el flujo de las tuberías cuando el equipo está reportando. */
  enLinea?: boolean;
}

/** Qué se pinta en el badge de un sensor: el valor en vivo si lo hay, si no el nombre de la variable. */
function textoSensor(sensor: { variable?: string | null; tipo: string }, lecturas?: Lectura[]): string {
  if (!lecturas) return sensor.variable ?? sensor.tipo;
  const l = sensor.variable ? lecturas.find((x) => x.clave === sensor.variable) : undefined;
  if (!l) return sensor.variable ?? sensor.tipo;
  return `${l.valor}${l.unidad ?? ''}`;
}

export function MotorDiagrama({ diagrama, onEditarEtiqueta, onCambiar, lecturas, enLinea }: Props) {
  const { t } = useTranslation();
  const porId = new Map(diagrama.nodos.map((n) => [n.id, n]));
  const svgRef = useRef<SVGSVGElement>(null);

  // Lo que se DIBUJA lleva las tuberías de retorno desviadas por arriba, para que no tapen a la de ida
  // (ver rutaRetorno.ts). Es una copia derivada: `diagrama` —el que se guarda— NO se toca, así que abrir el
  // editor y mover un badge no persiste el desvío como si el usuario lo hubiera dibujado.
  const dibujo = useMemo(() => reencaminarRetornos(diagrama), [diagrama]);

  function moverEtiquetaConexion(conexionId: string, offsetEtiqueta: { dx: number; dy: number }) {
    if (!onCambiar) return;
    onCambiar({
      ...diagrama,
      conexiones: diagrama.conexiones.map((c) => (c.id === conexionId ? { ...c, offsetEtiqueta } : c)),
    });
  }

  return (
    <div className="motor-diagrama__contenedor">
      <LienzoZoomable viewBoxBase={diagrama.viewBox}>
        {(viewBoxActual) => (
          <svg ref={svgRef} viewBox={viewBoxActual} className="motor-diagrama">
            <g aria-hidden className={enLinea ? 'motor-diagrama__flujo' : undefined}>
              {dibujo.conexiones.map((c) => {
                const a = porId.get(c.desde);
                const b = porId.get(c.hasta);
                if (!a || !b) return null;
                const puntos: Punto[] = [{ x: a.x, y: a.y }, ...c.ruta, { x: b.x, y: b.y }];
                const medio = medioDeTuberia(puntos);
                return (
                  <g key={c.id}>
                    <TuberiaIso puntos={puntos} tipo={c.tipo} />
                    {c.sensores.length > 0 && (
                      <EtiquetaTuberia
                        conexion={c}
                        medio={medio}
                        svgRef={svgRef}
                        editable={Boolean(onCambiar)}
                        onMover={(offset) => moverEtiquetaConexion(c.id, offset)}
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {diagrama.nodos.map((n) => (
              <NodoProceso
                lecturas={lecturas} key={n.id} nodo={n} onEditarEtiqueta={onEditarEtiqueta} />
            ))}
          </svg>
        )}
      </LienzoZoomable>
      <div className="motor-diagrama__leyenda">
        <span className="motor-diagrama__leyenda-item motor-diagrama__leyenda-item--alimentacion">
          {t('diagramaEditor.leyenda.alimentacion')}
        </span>
        <span className="motor-diagrama__leyenda-item motor-diagrama__leyenda-item--permeado">
          {t('diagramaEditor.leyenda.permeado')}
        </span>
        <span className="motor-diagrama__leyenda-item motor-diagrama__leyenda-item--rechazo">
          {t('diagramaEditor.leyenda.rechazo')}
        </span>
      </div>
    </div>
  );
}

function NodoProceso({
  nodo, onEditarEtiqueta, lecturas,
}: { nodo: NodoDiagrama; onEditarEtiqueta?: (id: string, etiqueta: string) => void; lecturas?: Lectura[] }) {
  const { t } = useTranslation();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nodo.etiqueta);
  const Icono = ICONO_PROCESO[nodo.tipo];

  function confirmar() {
    setEditando(false);
    const limpio = valor.trim();
    if (onEditarEtiqueta && limpio && limpio !== nodo.etiqueta) onEditarEtiqueta(nodo.id, limpio);
    else setValor(nodo.etiqueta);
  }

  return (
    <g className={`nodo-proceso ${nodo.flotante ? 'nodo-proceso--flotante' : ''}`}>
      <circle cx={nodo.x} cy={nodo.y} r={RADIO_ICONO} className="nodo-proceso__fondo" />
      <g transform={nodo.rotacion ? `rotate(${nodo.rotacion} ${nodo.x} ${nodo.y})` : undefined}>
        <svg
          x={nodo.x - LADO_ICONO / 2} y={nodo.y - LADO_ICONO / 2} width={LADO_ICONO} height={LADO_ICONO}
          viewBox="0 0 48 48" className="nodo-proceso__icono" aria-hidden
        >
          <Icono />
        </svg>
      </g>
      {/* Nombre y datos anclados en la MISMA posición diagonal (esquina inferior derecha del ícono) para
          que nunca choquen con una tubería que llegue por otro lado (ver spec §9, Muestra2/3). */}
      <foreignObject x={nodo.x + RADIO_ICONO * 0.6} y={nodo.y + RADIO_ICONO * 0.6} width={170} height={64}>
        <div className="nodo-proceso__datos">
          {editando ? (
            <input
              className="nodo-proceso__etiqueta-input"
              value={valor}
              autoFocus
              aria-label={t('diagramaEditor.editarEtiqueta')}
              onChange={(e) => setValor(e.target.value)}
              onBlur={confirmar}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmar();
                if (e.key === 'Escape') { setValor(nodo.etiqueta); setEditando(false); }
              }}
            />
          ) : onEditarEtiqueta ? (
            <button type="button" className="nodo-proceso__etiqueta nodo-proceso__etiqueta--editable" onClick={() => setEditando(true)}>
              {nodo.etiqueta}
            </button>
          ) : (
            <span className="nodo-proceso__etiqueta">{nodo.etiqueta}</span>
          )}
          {nodo.sensores.length > 0 && (
            <span className="nodo-proceso__valores">
              {nodo.sensores.map((s, i) => (
                // Modo vivo: valor + unidad. Modo editor: nombre de la variable enlazada (o el tipo de
                // slot si aún no se enlazó), que es lo que el administrador necesita ver para confirmar.
                <span className="nodo-proceso__valor" key={i}>{textoSensor(s, lecturas)}</span>
              ))}
            </span>
          )}
        </div>
      </foreignObject>
    </g>
  );
}

const OFFSET_DEFECTO = { dx: 0, dy: -22 };

/** Badge de sensores de una tubería: tamaño real medido con `getBBox()` (nunca por cantidad de caracteres,
 * ver spec §9 — evita que el fondo quede corto/largo respecto del texto real). Arrastrable SOLO cuando
 * `editable` (modo editor de plant-app-vpn); el desplazamiento final se persiste en
 * `ConexionDiagrama.offsetEtiqueta` vía `onMover`, que plant-portal-client y las vistas de solo lectura de
 * plant-app-vpn simplemente leen y respetan (nunca lo escriben, ver gobierno de la función en el spec). */
function EtiquetaTuberia({
  conexion, medio, svgRef, editable, onMover,
}: {
  conexion: ConexionDiagrama;
  medio: Punto;
  svgRef: RefObject<SVGSVGElement | null>;
  editable: boolean;
  onMover: (offset: { dx: number; dy: number }) => void;
}) {
  const textoRef = useRef<SVGTextElement>(null);
  const [caja, setCaja] = useState({ ancho: 0, alto: 0 });
  const arrastreRef = useRef<{ x: number; y: number; inicial: { dx: number; dy: number } } | null>(null);
  const [offsetArrastre, setOffsetArrastre] = useState<{ dx: number; dy: number } | null>(null);

  const texto = conexion.sensores.map((s) => s.variable ?? s.tipo).join(' · ');

  useLayoutEffect(() => {
    if (!textoRef.current) return;
    const bbox = textoRef.current.getBBox();
    setCaja({ ancho: bbox.width + 16, alto: bbox.height + 10 });
  }, [texto]);

  const offset = offsetArrastre ?? conexion.offsetEtiqueta ?? OFFSET_DEFECTO;
  const x = medio.x + offset.dx;
  const y = medio.y + offset.dy;

  function onPointerDown(e: PointerEvent<SVGGElement>) {
    if (!editable) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreRef.current = { x: e.clientX, y: e.clientY, inicial: offset };
  }

  function onPointerMove(e: PointerEvent<SVGGElement>) {
    if (!arrastreRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const vb = svgRef.current.viewBox.baseVal;
    const deltaX = pixelesAUnidadesViewBox(e.clientX - arrastreRef.current.x, vb.width, rect.width);
    const deltaY = pixelesAUnidadesViewBox(e.clientY - arrastreRef.current.y, vb.height, rect.height);
    setOffsetArrastre({ dx: arrastreRef.current.inicial.dx + deltaX, dy: arrastreRef.current.inicial.dy + deltaY });
  }

  function onPointerUp() {
    if (!arrastreRef.current) return;
    arrastreRef.current = null;
    if (offsetArrastre) onMover(offsetArrastre);
    setOffsetArrastre(null);
  }

  return (
    <g
      transform={`translate(${x} ${y})`}
      className={`etiqueta-tuberia ${editable ? 'etiqueta-tuberia--arrastrable' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <rect x={-caja.ancho / 2} y={-caja.alto / 2} width={caja.ancho} height={caja.alto} rx={6} className="etiqueta-tuberia__fondo" />
      <text ref={textoRef} textAnchor="middle" dominantBaseline="central" className="etiqueta-tuberia__texto">
        {texto}
      </text>
    </g>
  );
}
