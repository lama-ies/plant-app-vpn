// Núcleos de tratamiento por ósmosis inversa (después de la alimentación/pretratamiento, antes del
// complemento posterior). Coordenadas de rejilla — ver spec 2026-07-30-diagrama-isometrico-design.md §3.1.
// Arrancan en Válvula actuadora: el Filtro Multimedia es responsabilidad de la alimentación (A1/A2/A3), ver
// §5 del mismo spec.
import type { SegmentoDiagrama } from '../tipos';

/** N1 — estándar: Válvula actuadora → Filtro Canasta → Bomba Alta Presión → Membranas. */
export const SEGMENTO_N1: SegmentoDiagrama = {
  id: 'osmosis.nucleo.N1',
  nodos: [
    { idLocal: 'valvulaActuadora', tipo: 'valvulaActuadora', etiqueta: 'Válvula actuadora', col: 0, fila: 0 },
    { idLocal: 'filtroCanasta', tipo: 'filtroCanasta', etiqueta: 'Filtro Canasta 5µ', col: 1, fila: 0 },
    { idLocal: 'bombaAltaPresion', tipo: 'bombaAltaPresion', etiqueta: 'Bomba Alta Presión', col: 2, fila: 0 },
    { idLocal: 'membranaRO', tipo: 'membranaRO', etiqueta: 'Membranas RO', col: 3, fila: 0 },
    { idLocal: 'drenaje', tipo: 'salidaDrenaje', etiqueta: 'Drenaje', col: 3, fila: 1 },
  ],
  conexiones: [
    { desde: 'valvulaActuadora', hasta: 'filtroCanasta' },
    { desde: 'filtroCanasta', hasta: 'bombaAltaPresion' },
    { desde: 'bombaAltaPresion', hasta: 'membranaRO' },
    { desde: 'membranaRO', hasta: 'drenaje', etiqueta: 'Rechazo' },
  ],
  entradaIdLocal: 'valvulaActuadora',
  salidaIdLocal: 'membranaRO',
  anclaDosificadoras: 'filtroCanasta',
};

/** N2 — turbo: recuperación de energía del rechazo vía TurboCharger. */
export const SEGMENTO_N2: SegmentoDiagrama = {
  id: 'osmosis.nucleo.N2',
  nodos: [
    { idLocal: 'valvulaActuadora', tipo: 'valvulaActuadora', etiqueta: 'Válvula actuadora', col: 0, fila: 0 },
    { idLocal: 'filtroCanasta', tipo: 'filtroCanasta', etiqueta: 'Filtro Canasta 5µ', col: 1, fila: 0 },
    { idLocal: 'bombaAltaPresion', tipo: 'bombaAltaPresion', etiqueta: 'Bomba Alta Presión', col: 2, fila: 0 },
    { idLocal: 'turbocharger', tipo: 'turbocharger', etiqueta: 'TurboCharger', col: 3, fila: 0 },
    { idLocal: 'membranaRO', tipo: 'membranaRO', etiqueta: 'Membranas RO', col: 4, fila: 0 },
    { idLocal: 'drenaje', tipo: 'salidaDrenaje', etiqueta: 'Drenaje', col: 3, fila: 1 },
  ],
  conexiones: [
    { desde: 'valvulaActuadora', hasta: 'filtroCanasta' },
    { desde: 'filtroCanasta', hasta: 'bombaAltaPresion' },
    { desde: 'bombaAltaPresion', hasta: 'turbocharger' },
    { desde: 'turbocharger', hasta: 'membranaRO' },
    { desde: 'membranaRO', hasta: 'turbocharger', etiqueta: 'Rechazo' },
    { desde: 'turbocharger', hasta: 'drenaje' },
  ],
  entradaIdLocal: 'valvulaActuadora',
  salidaIdLocal: 'membranaRO',
  anclaDosificadoras: 'filtroCanasta',
};

/** N3 — recuperador PX: Filtro Canasta se ramifica en paralelo (Bomba Alta Presión ‖ PX+Booster), converge
 * en Membranas. La rama PX vive en `fila: 1` (real, a 90° del tronco en `fila: 0`). */
export const SEGMENTO_N3: SegmentoDiagrama = {
  id: 'osmosis.nucleo.N3',
  nodos: [
    { idLocal: 'valvulaActuadora', tipo: 'valvulaActuadora', etiqueta: 'Válvula actuadora', col: 0, fila: 0 },
    { idLocal: 'filtroCanasta', tipo: 'filtroCanasta', etiqueta: 'Filtro Canasta', col: 1, fila: 0 },
    { idLocal: 'bombaAltaPresion', tipo: 'bombaAltaPresion', etiqueta: 'Bomba Alta Presión', col: 2, fila: -1 },
    { idLocal: 'recuperadorPX', tipo: 'recuperadorPX', etiqueta: 'Recuperador PX', col: 2, fila: 1 },
    { idLocal: 'bombaBooster', tipo: 'bombaBooster', etiqueta: 'Bomba Booster', col: 3, fila: 1 },
    { idLocal: 'membranaRO', tipo: 'membranaRO', etiqueta: 'Membranas RO', col: 4, fila: 0 },
    { idLocal: 'drenaje', tipo: 'salidaDrenaje', etiqueta: 'Drenaje', col: 2, fila: 2 },
  ],
  conexiones: [
    { desde: 'valvulaActuadora', hasta: 'filtroCanasta' },
    { desde: 'filtroCanasta', hasta: 'bombaAltaPresion' },
    { desde: 'filtroCanasta', hasta: 'recuperadorPX' },
    { desde: 'bombaAltaPresion', hasta: 'membranaRO' },
    { desde: 'recuperadorPX', hasta: 'bombaBooster' },
    { desde: 'bombaBooster', hasta: 'membranaRO' },
    { desde: 'membranaRO', hasta: 'recuperadorPX', etiqueta: 'Rechazo' },
    { desde: 'recuperadorPX', hasta: 'drenaje' },
  ],
  entradaIdLocal: 'valvulaActuadora',
  salidaIdLocal: 'membranaRO',
  anclaDosificadoras: 'filtroCanasta',
};
