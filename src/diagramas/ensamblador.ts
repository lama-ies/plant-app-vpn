// Ensamblador puro: toma la secuencia de segmentos elegidos por el Administrador y produce el
// DiagramaEquipo final (nodos+conexiones con ids/posiciones absolutas, ya proyectadas a isométrico). Ver
// plant-arquitectura/docs/superpowers/specs/2026-07-30-diagrama-isometrico-design.md.
import { gridAPantalla, type PuntoPantalla } from './proyeccionIso';
import type { ConexionDiagrama, DiagramaEquipo, NodoDiagrama, SegmentoDiagrama } from './tipos';

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

interface PosicionGrid {
  col: number;
  fila: number;
  elevacion: number;
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

/** Descompone el desplazamiento entre dos posiciones de rejilla en los waypoints intermedios necesarios
 * para que cada tramo dibujado sea un único eje isométrico válido (primero col, después fila; el cambio de
 * elevación, si lo hay, siempre termina exactamente en `hasta`, sin waypoint propio). */
function calcularRuta(desde: PosicionGrid, hasta: PosicionGrid): PuntoPantalla[] {
  const puntosGrid: PosicionGrid[] = [
    desde,
    { col: hasta.col, fila: desde.fila, elevacion: desde.elevacion },
    { col: hasta.col, fila: hasta.fila, elevacion: desde.elevacion },
    hasta,
  ];
  const unicos = puntosGrid.filter((p, i) => {
    if (i === 0) return true;
    const prev = puntosGrid[i - 1];
    return p.col !== prev.col || p.fila !== prev.fila || p.elevacion !== prev.elevacion;
  });
  const intermedios = unicos.slice(1, -1);
  return intermedios.map((p) => gridAPantalla(p.col, p.fila, p.elevacion));
}

/** Ensambla la secuencia completa en un DiagramaEquipo con posiciones/ids absolutos, ya proyectados. */
export function ensamblar(secuencia: SegmentoElegido[], numDosificadoras = 0): DiagramaEquipo {
  const nodos: NodoDiagrama[] = [];
  const conexionesCrudas: { id: string; desde: string; hasta: string; etiqueta?: string }[] = [];
  const posiciones = new Map<string, PosicionGrid>();
  let colOffset = 0;
  let salidasPendientes: string[] = [];
  let contadorConexion = 0;

  // Segmentos que comparten el mismo colOffset (todas las copias de un SegmentoElegido repetible se
  // colocan en la MISMA col/fila, apiladas en elevación — no avanzan colOffset entre copias del mismo grupo).
  let grupoActualSegmentoId: string | null = null;

  for (const { segmento, indice, total } of expandirCopias(secuencia)) {
    const esNuevoGrupo = segmento.id !== grupoActualSegmentoId;
    grupoActualSegmentoId = segmento.id;

    if (segmento.nodos.length === 0) {
      // Pass-through: no agrega nada, la salida pendiente sigue siendo la anterior.
      continue;
    }

    // Copias de un mismo grupo repetible se apilan en ELEVACIÓN (nunca en fila — fila es para ramas
    // reales del proceso, ver spec §3.1), así que comparten col/fila y por lo tanto el mismo x en pantalla.
    const elevacionExtra = total > 1 ? indice - (total - 1) / 2 : 0;

    const idPorLocal = new Map<string, string>();
    for (const n of segmento.nodos) {
      const idGlobal = `${segmento.id}#${indice}#${n.idLocal}`;
      idPorLocal.set(n.idLocal, idGlobal);
      const pos: PosicionGrid = {
        col: n.col + colOffset,
        fila: n.fila,
        elevacion: (n.elevacion ?? 0) + elevacionExtra,
      };
      posiciones.set(idGlobal, pos);
      const { x, y } = gridAPantalla(pos.col, pos.fila, pos.elevacion);
      nodos.push({ id: idGlobal, tipo: n.tipo, etiqueta: n.etiqueta, x, y, sensores: [], flotante: n.flotante });
    }
    for (const c of segmento.conexiones) {
      conexionesCrudas.push({
        id: `c${contadorConexion++}`,
        desde: idPorLocal.get(c.desde)!,
        hasta: idPorLocal.get(c.hasta)!,
        etiqueta: c.etiqueta,
      });
    }

    // Empalme: conecta CADA salida pendiente de la secuencia anterior con la entrada de este segmento
    // (fan-in si hubo varias copias antes, ej. varios pozos).
    if (segmento.entradaIdLocal !== null) {
      const entradaGlobal = idPorLocal.get(segmento.entradaIdLocal)!;
      for (const salidaPrevia of salidasPendientes) {
        conexionesCrudas.push({ id: `c${contadorConexion++}`, desde: salidaPrevia, hasta: entradaGlobal });
      }
    }

    // Nueva(s) salida(s) pendiente(s): se acumulan por si el grupo tiene más copias en la misma columna
    // (fan-out), o se reemplazan al pasar a un segmento no repetible.
    const nuevaSalida = segmento.salidaIdLocal !== null ? idPorLocal.get(segmento.salidaIdLocal)! : null;
    if (nuevaSalida) {
      if (esNuevoGrupo) salidasPendientes = [nuevaSalida];
      else salidasPendientes.push(nuevaSalida);
    }

    // Avanza colOffset solo al terminar de procesar todas las copias del grupo (última copia = indice === total-1).
    if (indice === total - 1) {
      const maxCol = Math.max(...segmento.nodos.map((n) => n.col));
      colOffset += maxCol + 1;
    }
  }

  // Dosificadoras: flotantes, sin conexión, ancladas cerca del nodo que el núcleo haya marcado con
  // `anclaDosificadoras`. Se buscan DESPUÉS del loop principal porque el ancla puede pertenecer a
  // cualquier segmento de la secuencia (hoy siempre un núcleo) y ya tiene su posición global resuelta.
  const segmentoConAncla = secuencia.map((s) => s.segmento).find((s) => s.anclaDosificadoras);
  if (segmentoConAncla && numDosificadoras > 0) {
    const ancla = nodos.find((n) => n.id.includes(`#${segmentoConAncla.anclaDosificadoras}`));
    const posAncla = ancla ? posiciones.get(ancla.id) : undefined;
    if (ancla && posAncla) {
      for (let i = 0; i < numDosificadoras; i++) {
        const pos: PosicionGrid = { col: posAncla.col, fila: posAncla.fila - 1, elevacion: posAncla.elevacion + i };
        const { x, y } = gridAPantalla(pos.col, pos.fila, pos.elevacion);
        const idGlobal = `dosificadora#${i}`;
        posiciones.set(idGlobal, pos);
        nodos.push({ id: idGlobal, tipo: 'dosificadora', etiqueta: `Dosificadora ${i + 1}`, x, y, sensores: [], flotante: true });
      }
    }
  }

  const conexiones: ConexionDiagrama[] = conexionesCrudas.map((c) => ({
    id: c.id,
    desde: c.desde,
    hasta: c.hasta,
    etiqueta: c.etiqueta,
    sensores: [],
    ruta: calcularRuta(posiciones.get(c.desde)!, posiciones.get(c.hasta)!),
  }));

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
