// Motor de render del diagrama mimético (vista isométrica) — vista previa del editor. Dibuja CUALQUIER
// DiagramaEquipo ya ensamblado: no conoce el catálogo de segmentos ni el ensamblador. Este editor NUNCA
// tiene telemetría real: cada sensor muestra el TAG (variable asignada) para confirmar el enlace
// visualmente, no un valor en vivo. Ver spec 2026-07-30-diagrama-isometrico-design.md §4.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightToLine, Beaker, Cylinder, Droplet, Fan, Filter, Gauge, Wind, type LucideIcon,
} from 'lucide-react';
import type { DiagramaEquipo, NodoDiagrama, TipoNodoProceso } from '../diagramas/tipos';
import { BloqueIsoGenerico } from './BloqueIsoGenerico';
import { TuberiaIso, medioDeTuberia } from './TuberiaIso';
import { LienzoZoomable } from './LienzoZoomable';
import './motor-diagrama.css';

// Fase 1: los 21 tipos usan el mismo bloque isométrico genérico con este ícono Lucide como placa frontal.
// La Fase 2 reemplaza entradas una por una (ver spec §4.2), sin tocar el resto de este archivo.
const ICONO_ISO: Record<TipoNodoProceso, LucideIcon> = {
  tanque: Cylinder, tanquePulmon: Cylinder, torreDesgasificadora: Cylinder,
  bomba: Fan, bombaSumergible: Fan, bombaRealce: Fan, bombaAltaPresion: Fan, bombaBooster: Fan,
  turbocharger: Fan, recuperadorPX: Fan, soplador: Wind,
  pozo: ArrowRightToLine, filtroMultimedia: Filter, valvulaActuadora: Gauge, filtroCanasta: Filter,
  filtroCarbono: Filter, filtroCarbonoActivado: Filter, membranaRO: Filter, inyeccionCloro: Droplet,
  lamparaUV: Beaker, dosificadora: Beaker, salidaDrenaje: ArrowRightToLine, lineaDistribucion: ArrowRightToLine,
};

const CAJA = 92;
const ALTO_CAJA = 78;

interface Props {
  diagrama: DiagramaEquipo;
  onEditarEtiqueta?: (nodoId: string, nuevaEtiqueta: string) => void;
}

export function MotorDiagrama({ diagrama, onEditarEtiqueta }: Props) {
  const porId = new Map(diagrama.nodos.map((n) => [n.id, n]));

  return (
    <LienzoZoomable viewBoxBase={diagrama.viewBox}>
      {(viewBoxActual) => (
        <svg viewBox={viewBoxActual} className="motor-diagrama">
          <g aria-hidden>
            {diagrama.conexiones.map((c) => {
              const a = porId.get(c.desde);
              const b = porId.get(c.hasta);
              if (!a || !b) return null;
              const puntos = [{ x: a.x, y: a.y }, ...c.ruta, { x: b.x, y: b.y }];
              const medio = medioDeTuberia(puntos);
              return (
                <g key={c.id}>
                  <TuberiaIso puntos={puntos} />
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
              <NodoIsla nodo={n} Icono={ICONO_ISO[n.tipo]} onEditarEtiqueta={onEditarEtiqueta} />
            </foreignObject>
          ))}
        </svg>
      )}
    </LienzoZoomable>
  );
}

function NodoIsla({
  nodo, Icono, onEditarEtiqueta,
}: { nodo: NodoDiagrama; Icono: LucideIcon; onEditarEtiqueta?: (id: string, etiqueta: string) => void }) {
  const { t } = useTranslation();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nodo.etiqueta);

  function confirmar() {
    setEditando(false);
    const limpio = valor.trim();
    if (onEditarEtiqueta && limpio && limpio !== nodo.etiqueta) onEditarEtiqueta(nodo.id, limpio);
    else setValor(nodo.etiqueta);
  }

  return (
    <div className={`mimico-nodo ${nodo.flotante ? 'mimico-nodo--flotante' : ''}`}>
      <BloqueIsoGenerico Icono={Icono} flotante={nodo.flotante} />
      {editando ? (
        <input
          className="mimico-nodo__etiqueta-input"
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
        <button type="button" className="mimico-nodo__etiqueta mimico-nodo__etiqueta--editable" onClick={() => setEditando(true)}>
          {nodo.etiqueta}
        </button>
      ) : (
        <span className="mimico-nodo__etiqueta">{nodo.etiqueta}</span>
      )}
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
