// Complementos posteriores al núcleo RO (entre la salida de Membranas y la Cisterna final) + UV opcional
// apilable + la Cisterna final propiamente dicha (siempre incluida al final de toda secuencia de Ósmosis).
// Coordenadas de rejilla — ver spec 2026-07-30-diagrama-isometrico-design.md §3.1/§9. "ninguno" no agrega
// ningún nodo (pass-through, ver cabecera del plan). Todo lo de este archivo es posterior a la membrana:
// `tipo: 'permeado'` en sus tuberías y `tipoEntrada: 'permeado'` en el segmento (para el empalme sintético
// que lo conecta con lo anterior en la secuencia).
import type { SegmentoDiagrama } from '../tipos';

/** Sin complemento: la salida del núcleo (Membranas) va directo a la Cisterna final. */
export const SEGMENTO_COMPLEMENTO_NINGUNO: SegmentoDiagrama = {
  id: 'osmosis.complemento.ninguno',
  nodos: [],
  conexiones: [],
  entradaIdLocal: null,
  salidaIdLocal: null,
  tipoEntrada: 'permeado',
};

/** C1 — Tanque pulmón → Bomba de realce → Filtros de carbono (la Cisterna final se agrega aparte, siempre). */
export const SEGMENTO_C1: SegmentoDiagrama = {
  id: 'osmosis.complemento.C1',
  nodos: [
    { idLocal: 'tanquePulmon', tipo: 'tanquePulmon', etiqueta: 'Tanque pulmón', col: 0, fila: 0 },
    { idLocal: 'bombaRealce2', tipo: 'bombaRealce', etiqueta: 'Bomba de realce', col: 1, fila: 0 },
    { idLocal: 'filtroCarbono', tipo: 'filtroCarbono', etiqueta: 'Filtros de carbono', col: 2, fila: 0 },
  ],
  conexiones: [
    { desde: 'tanquePulmon', hasta: 'bombaRealce2', tipo: 'permeado' },
    { desde: 'bombaRealce2', hasta: 'filtroCarbono', tipo: 'permeado' },
  ],
  entradaIdLocal: 'tanquePulmon',
  salidaIdLocal: 'filtroCarbono',
  tipoEntrada: 'permeado',
};

/** C2 — Torre Desgasificadora (+soplador de aire, flotante) → Tanque pulmón → Bomba de realce. */
export const SEGMENTO_C2: SegmentoDiagrama = {
  id: 'osmosis.complemento.C2',
  nodos: [
    { idLocal: 'torreDesgasificadora', tipo: 'torreDesgasificadora', etiqueta: 'Torre Desgasificadora', col: 0, fila: 0 },
    { idLocal: 'soplador', tipo: 'soplador', etiqueta: 'Soplador de aire', col: 0, fila: -1, flotante: true },
    { idLocal: 'tanquePulmon', tipo: 'tanquePulmon', etiqueta: 'Tanque pulmón', col: 1, fila: 0 },
    { idLocal: 'bombaRealce2', tipo: 'bombaRealce', etiqueta: 'Bomba de realce', col: 2, fila: 0 },
  ],
  conexiones: [
    { desde: 'torreDesgasificadora', hasta: 'tanquePulmon', tipo: 'permeado' },
    { desde: 'tanquePulmon', hasta: 'bombaRealce2', tipo: 'permeado' },
  ],
  entradaIdLocal: 'torreDesgasificadora',
  salidaIdLocal: 'bombaRealce2',
  tipoEntrada: 'permeado',
};

/** UV opcional — apilable al final de "ninguno"/C1/C2, antes de la Cisterna final. */
export const SEGMENTO_UV: SegmentoDiagrama = {
  id: 'osmosis.complemento.UV',
  nodos: [{ idLocal: 'lamparaUV2', tipo: 'lamparaUV', etiqueta: 'Lámpara UV', col: 0, fila: 0 }],
  conexiones: [],
  entradaIdLocal: 'lamparaUV2',
  salidaIdLocal: 'lamparaUV2',
  tipoEntrada: 'permeado',
};

/** Cisterna final — siempre incluida al cierre de toda secuencia de Ósmosis. */
export const SEGMENTO_CISTERNA_FINAL: SegmentoDiagrama = {
  id: 'osmosis.cisternaFinal',
  nodos: [{ idLocal: 'cisternaFinal', tipo: 'tanque', etiqueta: 'Cisterna agua permeada', col: 0, fila: 0 }],
  conexiones: [],
  entradaIdLocal: 'cisternaFinal',
  salidaIdLocal: 'cisternaFinal',
  tipoEntrada: 'permeado',
};
