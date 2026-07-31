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

/** C8 — Grupo de bombas de presión (equipo reusable, 1-5 bombas en paralelo; también lo usa Hidroneumático). */
export const SEGMENTO_C8: SegmentoDiagrama = {
  id: 'comun.grupoBombasPresion',
  nodos: [{ idLocal: 'bombaPresion', tipo: 'bomba', etiqueta: 'Bomba de presión', col: 0, fila: 0 }],
  conexiones: [],
  entradaIdLocal: 'bombaPresion',
  salidaIdLocal: 'bombaPresion',
  repetible: { min: 1, max: 5 },
};
