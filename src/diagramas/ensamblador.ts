// Ensamblador puro: toma la secuencia de segmentos elegidos por el Administrador y produce el
// DiagramaEquipo final (nodos+conexiones con ids/posiciones absolutas). Ver
// plant-arquitectura/docs/superpowers/specs/2026-07-29-diagrama-planta-design.md §5.
import type { ConexionDiagrama, DiagramaEquipo, NodoDiagrama, SegmentoDiagrama } from './tipos';

const STEP = 150;

/** Un segmento elegido por el Administrador, con cuántas copias si es repetible (1 si no aplica). */
export interface SegmentoElegido {
  segmento: SegmentoDiagrama;
  copias?: number;
}

/** Instancia N (1-indexed) de un segmento repetible: cuántas copias en total tiene el grupo. */
interface InstanciaSegmento {
  segmento: SegmentoDiagrama;
  indice: number; // 0-based dentro de sus copias
  total: number;
}

/** Expande cada SegmentoElegido a sus copias individuales (1 copia si no es repetible). */
function expandirCopias(secuencia: SegmentoElegido[]): InstanciaSegmento[] {
  const instancias: InstanciaSegmento[] = [];
  for (const { segmento, copias } of secuencia) {
    const total = segmento.repetible ? Math.max(1, copias ?? segmento.repetible.min) : 1;
    for (let indice = 0; indice < total; indice++) instancias.push({ segmento, indice, total });
  }
  return instancias;
}

/** Ensambla la secuencia completa en un DiagramaEquipo con posiciones/ids absolutos. */
export function ensamblar(secuencia: SegmentoElegido[], numDosificadoras = 0): DiagramaEquipo {
  const nodos: NodoDiagrama[] = [];
  const conexiones: ConexionDiagrama[] = [];
  let xOffset = 0;
  let salidasPendientes: string[] = [];
  let contadorConexion = 0;

  // Segmentos que comparten el mismo xOffset (todas las copias de un SegmentoElegido repetible se colocan
  // en la MISMA columna, apiladas verticalmente — no avanzan xOffset entre copias del mismo grupo).
  let grupoActualSegmentoId: string | null = null;

  for (const { segmento, indice, total } of expandirCopias(secuencia)) {
    const esNuevoGrupo = segmento.id !== grupoActualSegmentoId;
    grupoActualSegmentoId = segmento.id;

    if (segmento.nodos.length === 0) {
      // Pass-through: no agrega nada, la salida pendiente sigue siendo la anterior.
      continue;
    }

    const offsetVertical = total > 1 ? (indice - (total - 1) / 2) * 90 : 0;
    const idPorLocal = new Map<string, string>();
    for (const n of segmento.nodos) {
      const idGlobal = `${segmento.id}#${indice}#${n.idLocal}`;
      idPorLocal.set(n.idLocal, idGlobal);
      nodos.push({
        id: idGlobal,
        tipo: n.tipo,
        etiqueta: n.etiqueta,
        x: n.x + xOffset,
        y: n.y + offsetVertical,
        sensores: [],
        flotante: n.flotante,
      });
    }
    for (const c of segmento.conexiones) {
      conexiones.push({
        id: `c${contadorConexion++}`,
        desde: idPorLocal.get(c.desde)!,
        hasta: idPorLocal.get(c.hasta)!,
        etiqueta: c.etiqueta,
        sensores: [],
      });
    }

    // Empalme: conecta CADA salida pendiente de la secuencia anterior con la entrada de este segmento
    // (fan-in si hubo varias copias antes, ej. varios pozos).
    if (segmento.entradaIdLocal !== null) {
      const entradaGlobal = idPorLocal.get(segmento.entradaIdLocal)!;
      for (const salidaPrevia of salidasPendientes) {
        conexiones.push({ id: `c${contadorConexion++}`, desde: salidaPrevia, hasta: entradaGlobal, sensores: [] });
      }
    }

    // Nueva(s) salida(s) pendiente(s): se acumulan por si el grupo tiene más copias en la misma columna
    // (fan-out), o se reemplazan al pasar a un segmento no repetible.
    const nuevaSalida = segmento.salidaIdLocal !== null ? idPorLocal.get(segmento.salidaIdLocal)! : null;
    if (nuevaSalida) {
      if (esNuevoGrupo) salidasPendientes = [nuevaSalida];
      else salidasPendientes.push(nuevaSalida);
    }

    // Avanza xOffset solo al terminar de procesar todas las copias del grupo (última copia = indice === total-1).
    if (indice === total - 1) {
      const maxX = Math.max(...segmento.nodos.map((n) => n.x));
      xOffset += maxX + STEP;
    }
  }

  // Dosificadoras: flotantes, sin conexión, ancladas cerca del nodo que el núcleo haya marcado con
  // `anclaDosificadoras`. Se buscan DESPUÉS del loop principal porque el ancla puede pertenecer a
  // cualquier segmento de la secuencia (hoy siempre un núcleo) y ya tiene su id/posición global resueltos.
  const segmentoConAncla = secuencia.map((s) => s.segmento).find((s) => s.anclaDosificadoras);
  if (segmentoConAncla && numDosificadoras > 0) {
    const idAncla = nodos.find((n) => n.id.includes(`#${segmentoConAncla.anclaDosificadoras}`));
    if (idAncla) {
      for (let i = 0; i < numDosificadoras; i++) {
        nodos.push({
          id: `dosificadora#${i}`,
          tipo: 'dosificadora',
          etiqueta: `Dosificadora ${i + 1}`,
          x: idAncla.x - 60,
          y: idAncla.y - 90 - i * 70,
          sensores: [],
          flotante: true,
        });
      }
    }
  }

  const minX = nodos.length ? Math.min(...nodos.map((n) => n.x)) - 100 : 0;
  const maxX = nodos.length ? Math.max(...nodos.map((n) => n.x)) + 100 : 400;
  const minY = nodos.length ? Math.min(...nodos.map((n) => n.y)) - 100 : 0;
  const maxY = nodos.length ? Math.max(...nodos.map((n) => n.y)) + 100 : 200;

  return {
    viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
    nodos,
    conexiones,
  };
}
