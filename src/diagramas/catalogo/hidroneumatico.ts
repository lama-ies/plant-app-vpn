// Hidroneumático: un solo flujo fijo, sin variantes — Cisterna → Grupo de Presión (reusa C8 de Ósmosis,
// 1-5 bombas) → Línea de suministro. Ver spec referenciado en el plan.
import type { SegmentoDiagrama } from '../tipos';

/** Cisterna de origen (sin variantes, a diferencia de la alimentación de Ósmosis). */
export const SEGMENTO_CISTERNA_HIDRO: SegmentoDiagrama = {
  id: 'hidroneumatico.cisterna',
  nodos: [{ idLocal: 'cisternaHidro', tipo: 'tanque', etiqueta: 'Cisterna', x: 0, y: 0 }],
  conexiones: [],
  entradaIdLocal: null,
  salidaIdLocal: 'cisternaHidro',
};

/** Línea de suministro de agua (nodo final, no un tanque — su tubería SÍ acepta nivel/nivelOnOff, ver spec §2). */
export const SEGMENTO_LINEA_SUMINISTRO: SegmentoDiagrama = {
  id: 'hidroneumatico.lineaSuministro',
  nodos: [{ idLocal: 'lineaSuministro', tipo: 'lineaDistribucion', etiqueta: 'Línea de suministro de agua', x: 0, y: 0 }],
  conexiones: [],
  entradaIdLocal: 'lineaSuministro',
  salidaIdLocal: 'lineaSuministro',
};
