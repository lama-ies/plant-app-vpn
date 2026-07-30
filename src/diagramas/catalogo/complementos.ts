// Complementos posteriores al núcleo RO (entre la salida de Membranas y la Cisterna final) + UV opcional
// apilable + la Cisterna final propiamente dicha (siempre incluida al final de toda secuencia de Ósmosis).
// Ver la nota de "pass-through" en la cabecera del plan: "ninguno" no agrega ningún nodo.
import type { SegmentoDiagrama } from '../tipos';

const STEP = 150;
const BRANCH = 90;

/** Sin complemento: la salida del núcleo (Membranas) va directo a la Cisterna final. */
export const SEGMENTO_COMPLEMENTO_NINGUNO: SegmentoDiagrama = {
  id: 'osmosis.complemento.ninguno',
  nodos: [],
  conexiones: [],
  entradaIdLocal: null,
  salidaIdLocal: null,
};

/** C1 — Tanque pulmón → Bomba de realce → Filtros de carbono (la Cisterna final se agrega aparte, siempre). */
export const SEGMENTO_C1: SegmentoDiagrama = {
  id: 'osmosis.complemento.C1',
  nodos: [
    { idLocal: 'tanquePulmon', tipo: 'tanquePulmon', etiqueta: 'Tanque pulmón', x: 0, y: 0 },
    { idLocal: 'bombaRealce2', tipo: 'bomba', etiqueta: 'Bomba de realce', x: STEP, y: 0 },
    { idLocal: 'filtroCarbono', tipo: 'filtroCarbono', etiqueta: 'Filtros de carbono', x: STEP * 2, y: 0 },
  ],
  conexiones: [
    { desde: 'tanquePulmon', hasta: 'bombaRealce2' },
    { desde: 'bombaRealce2', hasta: 'filtroCarbono' },
  ],
  entradaIdLocal: 'tanquePulmon',
  salidaIdLocal: 'filtroCarbono',
};

/** C2 — Torre Desgasificadora (+soplador de aire, flotante) → Tanque pulmón → Bomba de realce. */
export const SEGMENTO_C2: SegmentoDiagrama = {
  id: 'osmosis.complemento.C2',
  nodos: [
    { idLocal: 'torreDesgasificadora', tipo: 'torreDesgasificadora', etiqueta: 'Torre Desgasificadora', x: 0, y: 0 },
    { idLocal: 'soplador', tipo: 'soplador', etiqueta: 'Soplador de aire', x: 0, y: -BRANCH, flotante: true },
    { idLocal: 'tanquePulmon', tipo: 'tanquePulmon', etiqueta: 'Tanque pulmón', x: STEP, y: 0 },
    { idLocal: 'bombaRealce2', tipo: 'bomba', etiqueta: 'Bomba de realce', x: STEP * 2, y: 0 },
  ],
  conexiones: [
    { desde: 'torreDesgasificadora', hasta: 'tanquePulmon' },
    { desde: 'tanquePulmon', hasta: 'bombaRealce2' },
  ],
  entradaIdLocal: 'torreDesgasificadora',
  salidaIdLocal: 'bombaRealce2',
};

/** UV opcional — apilable al final de "ninguno"/C1/C2, antes de la Cisterna final. */
export const SEGMENTO_UV: SegmentoDiagrama = {
  id: 'osmosis.complemento.UV',
  nodos: [{ idLocal: 'lamparaUV2', tipo: 'lamparaUV', etiqueta: 'Lámpara UV', x: 0, y: 0 }],
  conexiones: [],
  entradaIdLocal: 'lamparaUV2',
  salidaIdLocal: 'lamparaUV2',
};

/** Cisterna final — siempre incluida al cierre de toda secuencia de Ósmosis. */
export const SEGMENTO_CISTERNA_FINAL: SegmentoDiagrama = {
  id: 'osmosis.cisternaFinal',
  nodos: [{ idLocal: 'cisternaFinal', tipo: 'tanque', etiqueta: 'Cisterna agua permeada', x: 0, y: 0 }],
  conexiones: [],
  entradaIdLocal: 'cisternaFinal',
  salidaIdLocal: 'cisternaFinal',
};
