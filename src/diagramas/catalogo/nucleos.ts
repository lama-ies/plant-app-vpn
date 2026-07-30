// Núcleos de tratamiento por ósmosis inversa (después de la alimentación/pretratamiento, antes del
// complemento posterior). Contenido confirmado con el usuario. Ver spec referenciado en el plan.
import type { SegmentoDiagrama } from '../tipos';

const STEP = 150;
const BRANCH = 90;

/** N1 — estándar: Filtro Multimedia → Válvula actuadora → Filtro Canasta → Bomba Alta Presión → Membranas. */
export const SEGMENTO_N1: SegmentoDiagrama = {
  id: 'osmosis.nucleo.N1',
  nodos: [
    { idLocal: 'filtroMultimedia', tipo: 'filtroMultimedia', etiqueta: 'Filtro Multimedia 20µ', x: 0, y: 0 },
    { idLocal: 'valvulaActuadora', tipo: 'valvulaActuadora', etiqueta: 'Válvula actuadora', x: STEP, y: 0 },
    { idLocal: 'filtroCanasta', tipo: 'filtroCanasta', etiqueta: 'Filtro Canasta 5µ', x: STEP * 2, y: 0 },
    { idLocal: 'bombaAltaPresion', tipo: 'bombaAltaPresion', etiqueta: 'Bomba Alta Presión', x: STEP * 3, y: 0 },
    { idLocal: 'membranaRO', tipo: 'membranaRO', etiqueta: 'Membranas RO', x: STEP * 4, y: 0 },
    { idLocal: 'drenaje', tipo: 'salidaDrenaje', etiqueta: 'Drenaje', x: STEP * 4, y: BRANCH },
  ],
  conexiones: [
    { desde: 'filtroMultimedia', hasta: 'valvulaActuadora' },
    { desde: 'valvulaActuadora', hasta: 'filtroCanasta' },
    { desde: 'filtroCanasta', hasta: 'bombaAltaPresion' },
    { desde: 'bombaAltaPresion', hasta: 'membranaRO' },
    { desde: 'membranaRO', hasta: 'drenaje', etiqueta: 'Rechazo' },
  ],
  entradaIdLocal: 'filtroMultimedia',
  salidaIdLocal: 'membranaRO',
  anclaDosificadoras: 'filtroCanasta',
};

/** N2 — turbo: recuperación de energía del rechazo vía TurboCharger. */
export const SEGMENTO_N2: SegmentoDiagrama = {
  id: 'osmosis.nucleo.N2',
  nodos: [
    { idLocal: 'filtroMultimedia', tipo: 'filtroMultimedia', etiqueta: 'Filtro Multimedia 20µ', x: 0, y: 0 },
    { idLocal: 'valvulaActuadora', tipo: 'valvulaActuadora', etiqueta: 'Válvula actuadora', x: STEP, y: 0 },
    { idLocal: 'filtroCanasta', tipo: 'filtroCanasta', etiqueta: 'Filtro Canasta 5µ', x: STEP * 2, y: 0 },
    { idLocal: 'bombaAltaPresion', tipo: 'bombaAltaPresion', etiqueta: 'Bomba Alta Presión', x: STEP * 3, y: 0 },
    { idLocal: 'turbocharger', tipo: 'turbocharger', etiqueta: 'TurboCharger', x: STEP * 4, y: 0 },
    { idLocal: 'membranaRO', tipo: 'membranaRO', etiqueta: 'Membranas RO', x: STEP * 5, y: 0 },
    { idLocal: 'drenaje', tipo: 'salidaDrenaje', etiqueta: 'Drenaje', x: STEP * 4, y: BRANCH },
  ],
  conexiones: [
    { desde: 'filtroMultimedia', hasta: 'valvulaActuadora' },
    { desde: 'valvulaActuadora', hasta: 'filtroCanasta' },
    { desde: 'filtroCanasta', hasta: 'bombaAltaPresion' },
    { desde: 'bombaAltaPresion', hasta: 'turbocharger' },
    { desde: 'turbocharger', hasta: 'membranaRO' },
    { desde: 'membranaRO', hasta: 'turbocharger', etiqueta: 'Rechazo' },
    { desde: 'turbocharger', hasta: 'drenaje' },
  ],
  entradaIdLocal: 'filtroMultimedia',
  salidaIdLocal: 'membranaRO',
  anclaDosificadoras: 'filtroCanasta',
};

/** N3 — recuperador PX: Filtro Canasta se ramifica en paralelo (Bomba Alta Presión ‖ PX+Booster), converge en Membranas. */
export const SEGMENTO_N3: SegmentoDiagrama = {
  id: 'osmosis.nucleo.N3',
  nodos: [
    { idLocal: 'filtroMultimedia', tipo: 'filtroMultimedia', etiqueta: 'Filtro Multimedia 20µ', x: 0, y: 0 },
    { idLocal: 'valvulaActuadora', tipo: 'valvulaActuadora', etiqueta: 'Válvula actuadora', x: STEP, y: 0 },
    { idLocal: 'filtroCanasta', tipo: 'filtroCanasta', etiqueta: 'Filtro Canasta', x: STEP * 2, y: 0 },
    { idLocal: 'bombaAltaPresion', tipo: 'bombaAltaPresion', etiqueta: 'Bomba Alta Presión', x: STEP * 3, y: -BRANCH },
    { idLocal: 'recuperadorPX', tipo: 'recuperadorPX', etiqueta: 'Recuperador PX', x: STEP * 3, y: BRANCH },
    { idLocal: 'bombaBooster', tipo: 'bombaBooster', etiqueta: 'Bomba Booster', x: STEP * 4, y: BRANCH },
    { idLocal: 'membranaRO', tipo: 'membranaRO', etiqueta: 'Membranas RO', x: STEP * 5, y: 0 },
    { idLocal: 'drenaje', tipo: 'salidaDrenaje', etiqueta: 'Drenaje', x: STEP * 3, y: BRANCH * 2 },
  ],
  conexiones: [
    { desde: 'filtroMultimedia', hasta: 'valvulaActuadora' },
    { desde: 'valvulaActuadora', hasta: 'filtroCanasta' },
    { desde: 'filtroCanasta', hasta: 'bombaAltaPresion' },
    { desde: 'filtroCanasta', hasta: 'recuperadorPX' },
    { desde: 'bombaAltaPresion', hasta: 'membranaRO' },
    { desde: 'recuperadorPX', hasta: 'bombaBooster' },
    { desde: 'bombaBooster', hasta: 'membranaRO' },
    { desde: 'membranaRO', hasta: 'recuperadorPX', etiqueta: 'Rechazo' },
    { desde: 'recuperadorPX', hasta: 'drenaje' },
  ],
  entradaIdLocal: 'filtroMultimedia',
  salidaIdLocal: 'membranaRO',
  anclaDosificadoras: 'filtroCanasta',
};
