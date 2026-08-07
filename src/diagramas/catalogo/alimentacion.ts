// Segmentos de alimentación/pretratamiento/grupo de bombas de presión para Ósmosis Inversa (y, C8, también
// reusado por Hidroneumático — ver catalogo/hidroneumatico.ts). Coordenadas de REJILLA (col/fila/
// elevacion), no píxeles — ver spec 2026-07-30-diagrama-isometrico-design.md §3.1/§9. El Filtro Multimedia
// SIEMPRE cierra la alimentación (A1/A2/A3), nunca el núcleo (ver §5 del mismo spec — evita la duplicación
// real que existía cuando se combinaba A3 con cualquier núcleo). Todas las tuberías de este archivo son
// `tipo: 'alimentacion'` (agua cruda/de proceso, antes de entrar a la membrana).
import type { SegmentoDiagrama } from '../tipos';

/** A1 — Pozo → Bomba sumergible → Filtro multimedia. Repetible: 2+ pozos convergen a una sola línea. */
export const SEGMENTO_A1: SegmentoDiagrama = {
  id: 'osmosis.alimentacion.A1',
  nodos: [
    { idLocal: 'pozo', tipo: 'pozo', etiqueta: 'Pozo', col: 0, fila: 0 },
    { idLocal: 'bombaSumergible', tipo: 'bombaSumergible', etiqueta: 'Bomba sumergible', col: 1, fila: 0 },
    { idLocal: 'filtroMultimedia', tipo: 'filtroMultimedia', etiqueta: 'Filtro multimedia', col: 2, fila: 0 },
  ],
  conexiones: [
    { desde: 'pozo', hasta: 'bombaSumergible', tipo: 'alimentacion' },
    { desde: 'bombaSumergible', hasta: 'filtroMultimedia', tipo: 'alimentacion' },
  ],
  entradaIdLocal: null,
  salidaIdLocal: 'filtroMultimedia',
  repetible: { min: 1, max: 5 },
};

/** A2 — Cisterna → Bomba de realce → Filtro multimedia. */
export const SEGMENTO_A2: SegmentoDiagrama = {
  id: 'osmosis.alimentacion.A2',
  nodos: [
    { idLocal: 'cisterna', tipo: 'tanque', etiqueta: 'Cisterna', col: 0, fila: 0 },
    { idLocal: 'bombaRealce', tipo: 'bombaRealce', etiqueta: 'Bomba de realce', col: 1, fila: 0 },
    { idLocal: 'filtroMultimedia', tipo: 'filtroMultimedia', etiqueta: 'Filtro multimedia', col: 2, fila: 0 },
  ],
  conexiones: [
    { desde: 'cisterna', hasta: 'bombaRealce', tipo: 'alimentacion' },
    { desde: 'bombaRealce', hasta: 'filtroMultimedia', tipo: 'alimentacion' },
  ],
  entradaIdLocal: null,
  salidaIdLocal: 'filtroMultimedia',
};

/** A3 — Alimentación combinada: Pozo/Bomba sumergible → Cisterna/Bomba realce → Filtro multimedia. */
export const SEGMENTO_A3: SegmentoDiagrama = {
  id: 'osmosis.alimentacion.A3',
  nodos: [
    { idLocal: 'pozo', tipo: 'pozo', etiqueta: 'Pozo', col: 0, fila: 0 },
    { idLocal: 'bombaSumergible', tipo: 'bombaSumergible', etiqueta: 'Bomba sumergible', col: 1, fila: 0 },
    { idLocal: 'cisterna', tipo: 'tanque', etiqueta: 'Cisterna', col: 2, fila: 0 },
    { idLocal: 'bombaRealce', tipo: 'bombaRealce', etiqueta: 'Bomba de realce', col: 3, fila: 0 },
    { idLocal: 'filtroMultimedia', tipo: 'filtroMultimedia', etiqueta: 'Filtro multimedia', col: 4, fila: 0 },
  ],
  conexiones: [
    { desde: 'pozo', hasta: 'bombaSumergible', tipo: 'alimentacion' },
    { desde: 'bombaSumergible', hasta: 'cisterna', tipo: 'alimentacion' },
    { desde: 'cisterna', hasta: 'bombaRealce', tipo: 'alimentacion' },
    { desde: 'bombaRealce', hasta: 'filtroMultimedia', tipo: 'alimentacion' },
  ],
  entradaIdLocal: null,
  salidaIdLocal: 'filtroMultimedia',
};

/** A4 — Pretratamiento: Inyección de cloro → Filtro de carbono activado (elimina el cloro antes del núcleo). */
export const SEGMENTO_A4: SegmentoDiagrama = {
  id: 'osmosis.pretratamiento.A4',
  nodos: [
    { idLocal: 'inyeccionCloro', tipo: 'inyeccionCloro', etiqueta: 'Inyección de cloro', col: 0, fila: 0 },
    { idLocal: 'filtroCarbonoActivado', tipo: 'filtroCarbonoActivado', etiqueta: 'Filtro carbono activado', col: 1, fila: 0 },
  ],
  conexiones: [{ desde: 'inyeccionCloro', hasta: 'filtroCarbonoActivado', tipo: 'alimentacion' }],
  entradaIdLocal: 'inyeccionCloro',
  salidaIdLocal: 'filtroCarbonoActivado',
};

/** A5 — Pretratamiento: Lámpara UV (alternativa a A4, mutuamente excluyentes). */
export const SEGMENTO_A5: SegmentoDiagrama = {
  id: 'osmosis.pretratamiento.A5',
  nodos: [{ idLocal: 'lamparaUV', tipo: 'lamparaUV', etiqueta: 'Lámpara UV', col: 0, fila: 0 }],
  conexiones: [],
  entradaIdLocal: 'lamparaUV',
  salidaIdLocal: 'lamparaUV',
};

/** A6 — Pozo → Bomba sumergible, SIN filtro (repetible). Se usa junto con A7 (cisterna compartida) cuando
 * varios pozos alimentan UNA sola cisterna antes de un grupo de bombas de presión — a diferencia de A1
 * (cada pozo cierra en su propio filtro), aquí el filtro se pospone hasta después del grupo de bombas (ver
 * A8). Real hallazgo 2026-08-06: el catálogo no tenía forma de expresar "pozos → cisterna compartida →
 * bombas → filtro" (siempre que hay un grupo de bombas tipo hidroneumático/realce, hay una cisterna real de
 * la que aspira — regla física, no solo de UI). */
export const SEGMENTO_A6: SegmentoDiagrama = {
  id: 'osmosis.alimentacion.A6',
  nodos: [
    { idLocal: 'pozo', tipo: 'pozo', etiqueta: 'Pozo', col: 0, fila: 0 },
    { idLocal: 'bombaSumergible', tipo: 'bombaSumergible', etiqueta: 'Bomba sumergible', col: 1, fila: 0 },
  ],
  conexiones: [{ desde: 'pozo', hasta: 'bombaSumergible', tipo: 'alimentacion' }],
  entradaIdLocal: null,
  salidaIdLocal: 'bombaSumergible',
  repetible: { min: 1, max: 5 },
};

/** A7 — Cisterna compartida (recibe el fan-in de N copias de A6). Sin filtro ni bomba propios: lo que sigue
 * (típicamente un grupo de bombas de presión, C8) aspira de aquí. */
export const SEGMENTO_A7: SegmentoDiagrama = {
  id: 'osmosis.alimentacion.A7',
  nodos: [{ idLocal: 'cisterna', tipo: 'tanque', etiqueta: 'Cisterna', col: 0, fila: 0 }],
  conexiones: [],
  entradaIdLocal: 'cisterna',
  salidaIdLocal: 'cisterna',
};

/** A8 — Filtro multimedia solo, SIN pozo/cisterna propios: cierra la alimentación cuando el grupo de
 * bombas de presión (C8) va ANTES del filtro (patrón A6+A7+C8+A8) en vez de después (patrón normal
 * A1/A2/A3, donde el filtro ya viene incluido y C8 se agrega aparte, después). */
export const SEGMENTO_A8: SegmentoDiagrama = {
  id: 'osmosis.alimentacion.A8',
  nodos: [{ idLocal: 'filtroMultimedia', tipo: 'filtroMultimedia', etiqueta: 'Filtro multimedia', col: 0, fila: 0 }],
  conexiones: [],
  entradaIdLocal: 'filtroMultimedia',
  salidaIdLocal: 'filtroMultimedia',
};

/** C8 — Grupo de bombas de presión (equipo reusable, 1-5 bombas en paralelo; también lo usa Hidroneumático). */
export const SEGMENTO_C8: SegmentoDiagrama = {
  id: 'comun.grupoBombasPresion',
  nodos: [{ idLocal: 'bombaPresion', tipo: 'bomba', etiqueta: 'Bomba de presión', col: 0, fila: 0 }],
  conexiones: [],
  entradaIdLocal: 'bombaPresion',
  salidaIdLocal: 'bombaPresion',
  repetible: { min: 1, max: 5 },
};
