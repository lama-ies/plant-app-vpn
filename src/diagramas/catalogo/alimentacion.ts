// Segmentos de alimentación/pretratamiento/grupo de bombas de presión para Ósmosis Inversa (y, C8, también
// reusado por Hidroneumático — ver catalogo/hidroneumatico.ts). Contenido del proceso confirmado con el
// usuario (dominio real de IES Internacional), ver el spec de diseño referenciado en la cabecera del plan.
import type { SegmentoDiagrama } from '../tipos';

const STEP = 150;

/** A1 — Pozo → Bomba sumergible. Repetible: 2+ pozos convergen a una sola línea (fan-in en el ensamblador). */
export const SEGMENTO_A1: SegmentoDiagrama = {
  id: 'osmosis.alimentacion.A1',
  nodos: [
    { idLocal: 'pozo', tipo: 'pozo', etiqueta: 'Pozo', x: 0, y: 0 },
    { idLocal: 'bombaSumergible', tipo: 'bomba', etiqueta: 'Bomba sumergible', x: STEP, y: 0 },
  ],
  conexiones: [{ desde: 'pozo', hasta: 'bombaSumergible' }],
  entradaIdLocal: null,
  salidaIdLocal: 'bombaSumergible',
  repetible: { min: 1, max: 5 },
};

/** A2 — Cisterna → Bomba de realce. */
export const SEGMENTO_A2: SegmentoDiagrama = {
  id: 'osmosis.alimentacion.A2',
  nodos: [
    { idLocal: 'cisterna', tipo: 'tanque', etiqueta: 'Cisterna', x: 0, y: 0 },
    { idLocal: 'bombaRealce', tipo: 'bomba', etiqueta: 'Bomba de realce', x: STEP, y: 0 },
  ],
  conexiones: [{ desde: 'cisterna', hasta: 'bombaRealce' }],
  entradaIdLocal: null,
  salidaIdLocal: 'bombaRealce',
};

/** A3 — Alimentación combinada: Pozo/Bomba sumergible → Cisterna/Bomba realce → Filtro multimedia. */
export const SEGMENTO_A3: SegmentoDiagrama = {
  id: 'osmosis.alimentacion.A3',
  nodos: [
    { idLocal: 'pozo', tipo: 'pozo', etiqueta: 'Pozo', x: 0, y: 0 },
    { idLocal: 'bombaSumergible', tipo: 'bomba', etiqueta: 'Bomba sumergible', x: STEP, y: 0 },
    { idLocal: 'cisterna', tipo: 'tanque', etiqueta: 'Cisterna', x: STEP * 2, y: 0 },
    { idLocal: 'bombaRealce', tipo: 'bomba', etiqueta: 'Bomba de realce', x: STEP * 3, y: 0 },
    { idLocal: 'filtroMultimedia', tipo: 'filtroMultimedia', etiqueta: 'Filtro multimedia', x: STEP * 4, y: 0 },
  ],
  conexiones: [
    { desde: 'pozo', hasta: 'bombaSumergible' },
    { desde: 'bombaSumergible', hasta: 'cisterna' },
    { desde: 'cisterna', hasta: 'bombaRealce' },
    { desde: 'bombaRealce', hasta: 'filtroMultimedia' },
  ],
  entradaIdLocal: null,
  salidaIdLocal: 'filtroMultimedia',
};

/** A4 — Pretratamiento: Inyección de cloro → Filtro de carbono activado (elimina el cloro antes del núcleo). */
export const SEGMENTO_A4: SegmentoDiagrama = {
  id: 'osmosis.pretratamiento.A4',
  nodos: [
    { idLocal: 'inyeccionCloro', tipo: 'inyeccionCloro', etiqueta: 'Inyección de cloro', x: 0, y: 0 },
    { idLocal: 'filtroCarbonoActivado', tipo: 'filtroCarbonoActivado', etiqueta: 'Filtro carbono activado', x: STEP, y: 0 },
  ],
  conexiones: [{ desde: 'inyeccionCloro', hasta: 'filtroCarbonoActivado' }],
  entradaIdLocal: 'inyeccionCloro',
  salidaIdLocal: 'filtroCarbonoActivado',
};

/** A5 — Pretratamiento: Lámpara UV (alternativa a A4, mutuamente excluyentes). */
export const SEGMENTO_A5: SegmentoDiagrama = {
  id: 'osmosis.pretratamiento.A5',
  nodos: [{ idLocal: 'lamparaUV', tipo: 'lamparaUV', etiqueta: 'Lámpara UV', x: 0, y: 0 }],
  conexiones: [],
  entradaIdLocal: 'lamparaUV',
  salidaIdLocal: 'lamparaUV',
};

/** C8 — Grupo de bombas de presión (equipo reusable, 1-5 bombas en paralelo; también lo usa Hidroneumático). */
export const SEGMENTO_C8: SegmentoDiagrama = {
  id: 'comun.grupoBombasPresion',
  nodos: [{ idLocal: 'bombaPresion', tipo: 'bomba', etiqueta: 'Bomba de presión', x: 0, y: 0 }],
  conexiones: [],
  entradaIdLocal: 'bombaPresion',
  salidaIdLocal: 'bombaPresion',
  repetible: { min: 1, max: 5 },
};
