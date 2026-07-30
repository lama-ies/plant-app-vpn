// Motor de render del diagrama mimético, portado de plant-portal-client para la vista previa del editor.
// Dibuja CUALQUIER DiagramaEquipo ya ensamblado — no conoce el catálogo de segmentos ni el ensamblador.
// Este editor NUNCA tiene telemetría real (eso solo pasa en plant-portal-client): cada sensor muestra el
// TAG (clave de variable) que le asignaste en el Paso 2, para poder confirmar visualmente el enlace — no
// un valor en vivo. Ver spec §6.
import type { CSSProperties } from 'react';
import {
  ArrowRightToLine, Beaker, Cylinder, Droplet, Fan, Filter, Gauge, Wind, type LucideIcon,
} from 'lucide-react';
import type { DiagramaEquipo, NodoDiagrama, TipoNodoProceso } from '../diagramas/tipos';
import './motor-diagrama.css';

const ICONO_NODO: Record<TipoNodoProceso, LucideIcon> = {
  tanque: Cylinder, tanquePulmon: Cylinder, torreDesgasificadora: Cylinder,
  bomba: Fan, bombaAltaPresion: Fan, bombaBooster: Fan, turbocharger: Fan, recuperadorPX: Fan, soplador: Wind,
  pozo: ArrowRightToLine, filtroMultimedia: Filter, valvulaActuadora: Gauge, filtroCanasta: Filter,
  filtroCarbono: Filter, filtroCarbonoActivado: Filter, membranaRO: Filter, inyeccionCloro: Droplet,
  lamparaUV: Beaker, dosificadora: Beaker, salidaDrenaje: ArrowRightToLine, lineaDistribucion: ArrowRightToLine,
};

const CAJA = 92;
const ALTO_CAJA = 78;
const ICONO_BOX = 56;

function puntoBorde(desde: { x: number; y: number }, hasta: { x: number; y: number }, dist: number) {
  const dx = hasta.x - desde.x;
  const dy = hasta.y - desde.y;
  const largo = Math.hypot(dx, dy) || 1;
  return { x: desde.x + (dx / largo) * dist, y: desde.y + (dy / largo) * dist };
}

interface Props {
  diagrama: DiagramaEquipo;
}

export function MotorDiagrama({ diagrama }: Props) {
  const porId = new Map(diagrama.nodos.map((n) => [n.id, n]));

  return (
    <svg viewBox={diagrama.viewBox} className="motor-diagrama">
      <g aria-hidden>
        {diagrama.conexiones.map((c) => {
          const a = porId.get(c.desde);
          const b = porId.get(c.hasta);
          if (!a || !b) return null;
          const inicio = puntoBorde(a, b, ICONO_BOX / 2 + 4);
          const fin = puntoBorde(b, a, ICONO_BOX / 2 + 4);
          const medio = { x: (inicio.x + fin.x) / 2, y: (inicio.y + fin.y) / 2 };
          return (
            <g key={c.id}>
              <line x1={inicio.x} y1={inicio.y} x2={fin.x} y2={fin.y} className="motor-diagrama__tuberia" />
              {c.sensores.length > 0 && (
                <foreignObject x={medio.x - 30} y={medio.y - 14} width={60} height={28}>
                  <div className="mimico-sensor-tuberia">
                    {c.sensores.map((s, i) => (
                      <span key={i}>{s.variable ?? s.tipo}</span>
                    ))}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </g>

      {diagrama.nodos.map((n) => (
        <foreignObject key={n.id} x={n.x - CAJA / 2} y={n.y - ALTO_CAJA / 2} width={CAJA} height={ALTO_CAJA}>
          <NodoIsla nodo={n} />
        </foreignObject>
      ))}
    </svg>
  );
}

function NodoIsla({ nodo }: { nodo: NodoDiagrama }) {
  const Icono = ICONO_NODO[nodo.tipo];
  return (
    <div
      className={`mimico-nodo ${nodo.flotante ? 'mimico-nodo--flotante' : ''}`}
      style={{ '--icono-box': `${ICONO_BOX}px` } as CSSProperties}
    >
      <span className="mimico-nodo__icono" aria-hidden>
        <Icono size={24} aria-hidden />
      </span>
      <span className="mimico-nodo__etiqueta">{nodo.etiqueta}</span>
      {nodo.sensores.length > 0 && (
        <span className="mimico-nodo__valores">
          {nodo.sensores.map((s, i) => (
            <span className="mimico-nodo__valor" key={i}>{s.variable ?? s.tipo}</span>
          ))}
        </span>
      )}
    </div>
  );
}
