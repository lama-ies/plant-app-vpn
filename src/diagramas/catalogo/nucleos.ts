// Núcleos de tratamiento por ósmosis inversa (después de la alimentación/pretratamiento, antes del
// complemento posterior). Coordenadas de rejilla — ver spec 2026-07-30-diagrama-isometrico-design.md
// §3.1/§9. Arrancan en Válvula actuadora: el Filtro Multimedia es responsabilidad de la alimentación
// (A1/A2/A3), ver §5 del mismo spec.
import type { SegmentoDiagrama } from '../tipos';

/** N1 — estándar: Válvula actuadora → Filtro Canasta → Bomba Alta Presión → Membranas. */
export const SEGMENTO_N1: SegmentoDiagrama = {
  id: 'osmosis.nucleo.N1',
  nodos: [
    { idLocal: 'valvulaActuadora', tipo: 'valvulaActuadora', etiqueta: 'Válvula actuadora', col: 0, fila: 0 },
    { idLocal: 'filtroCanasta', tipo: 'filtroCanasta', etiqueta: 'Filtro Canasta 5µ', col: 1, fila: 0 },
    { idLocal: 'bombaAltaPresion', tipo: 'bombaAltaPresion', etiqueta: 'Bomba Alta Presión', col: 2, fila: 0 },
    { idLocal: 'membranaRO', tipo: 'membranaRO', etiqueta: 'Membranas RO', col: 3, fila: 0 },
    // La tubería que llega acá viene VERTICAL desde Membranas RO (misma columna) — la flecha se rota 90°
    // para apuntar hacia abajo, no a la derecha (default del ícono).
    { idLocal: 'drenaje', tipo: 'salidaDrenaje', etiqueta: 'Drenaje', col: 3, fila: 1, rotacion: 90 },
  ],
  conexiones: [
    { desde: 'valvulaActuadora', hasta: 'filtroCanasta', tipo: 'alimentacion' },
    { desde: 'filtroCanasta', hasta: 'bombaAltaPresion', tipo: 'alimentacion' },
    { desde: 'bombaAltaPresion', hasta: 'membranaRO', tipo: 'alimentacion' },
    { desde: 'membranaRO', hasta: 'drenaje', etiqueta: 'Rechazo', tipo: 'rechazo' },
  ],
  entradaIdLocal: 'valvulaActuadora',
  salidaIdLocal: 'membranaRO',
  anclaDosificadoras: 'filtroCanasta',
};

/** N2 — turbo: recuperación de energía del rechazo vía TurboCharger.
 *
 * El Rechazo Membranas→TurboCharger va con `desvioElevacion` (sube por arriba de Membranas, cruza y baja
 * al TurboCharger) porque recorre el MISMO par de nodos que la Alimentación TurboCharger→Membranas, en
 * sentido contrario. Sin el desvío las dos tuberías comparten el tramo y la roja se dibuja encima de la
 * verde: ese tramo se veía completamente rojo, como si el turbo alimentara rechazo a la membrana
 * (reportado por el usuario con la muestra del 2026-08-07). Físicamente además es lo correcto: el
 * concentrado sale por la parte alta de las membranas y entra por la parte alta del turbo, que es lo que
 * lo mueve; el turbo recién entonces descarga a Drenaje. */
export const SEGMENTO_N2: SegmentoDiagrama = {
  id: 'osmosis.nucleo.N2',
  nodos: [
    { idLocal: 'valvulaActuadora', tipo: 'valvulaActuadora', etiqueta: 'Válvula actuadora', col: 0, fila: 0 },
    { idLocal: 'filtroCanasta', tipo: 'filtroCanasta', etiqueta: 'Filtro Canasta 5µ', col: 1, fila: 0 },
    { idLocal: 'bombaAltaPresion', tipo: 'bombaAltaPresion', etiqueta: 'Bomba Alta Presión', col: 2, fila: 0 },
    { idLocal: 'turbocharger', tipo: 'turbocharger', etiqueta: 'TurboCharger', col: 3, fila: 0 },
    { idLocal: 'membranaRO', tipo: 'membranaRO', etiqueta: 'Membranas RO', col: 4, fila: 0 },
    // Viene VERTICAL desde TurboCharger (misma columna) — flecha apuntando hacia abajo.
    { idLocal: 'drenaje', tipo: 'salidaDrenaje', etiqueta: 'Drenaje', col: 3, fila: 1, rotacion: 90 },
  ],
  conexiones: [
    { desde: 'valvulaActuadora', hasta: 'filtroCanasta', tipo: 'alimentacion' },
    { desde: 'filtroCanasta', hasta: 'bombaAltaPresion', tipo: 'alimentacion' },
    { desde: 'bombaAltaPresion', hasta: 'turbocharger', tipo: 'alimentacion' },
    { desde: 'turbocharger', hasta: 'membranaRO', tipo: 'alimentacion' },
    { desde: 'membranaRO', hasta: 'turbocharger', etiqueta: 'Rechazo', tipo: 'rechazo', desvioElevacion: 0.7 },
    { desde: 'turbocharger', hasta: 'drenaje', tipo: 'rechazo' },
  ],
  entradaIdLocal: 'valvulaActuadora',
  salidaIdLocal: 'membranaRO',
  anclaDosificadoras: 'filtroCanasta',
};

/** N3 — recuperador PX: Filtro Canasta se ramifica en paralelo (Bomba Alta Presión ‖ PX+Booster), converge
 * en Membranas. La rama PX vive en `fila: 1` (real, a 90° del tronco en `fila: 0`). Las dos ramas de
 * alimentación (a Bomba Alta Presión y a Recuperador PX) usan `ordenRuta: 'fila-col'` para doblar en la
 * columna del propio Filtro Canasta — así la columna de Recuperador PX queda libre para que el Rechazo baje
 * recto por el medio sin compartir tramo con la alimentación (hallazgo real, ver spec §9). Además lleva una
 * válvula de venteo/despresurizadora (real en sistemas con PX): descarga de Membranas a un Drenaje propio,
 * normalmente cerrada — no comparte el drenaje del Recuperador PX, son dos descargas físicas distintas. */
export const SEGMENTO_N3: SegmentoDiagrama = {
  id: 'osmosis.nucleo.N3',
  nodos: [
    { idLocal: 'valvulaActuadora', tipo: 'valvulaActuadora', etiqueta: 'Válvula actuadora', col: 0, fila: 0 },
    { idLocal: 'filtroCanasta', tipo: 'filtroCanasta', etiqueta: 'Filtro Canasta', col: 1, fila: 0 },
    { idLocal: 'bombaAltaPresion', tipo: 'bombaAltaPresion', etiqueta: 'Bomba Alta Presión', col: 2, fila: -1 },
    { idLocal: 'recuperadorPX', tipo: 'recuperadorPX', etiqueta: 'Recuperador PX', col: 2, fila: 1 },
    { idLocal: 'bombaBooster', tipo: 'bombaBooster', etiqueta: 'Bomba Booster', col: 3, fila: 1 },
    { idLocal: 'membranaRO', tipo: 'membranaRO', etiqueta: 'Membranas RO', col: 4, fila: 0 },
    // Viene VERTICAL desde Recuperador PX (misma columna) — flecha apuntando hacia abajo.
    { idLocal: 'drenaje', tipo: 'salidaDrenaje', etiqueta: 'Drenaje', col: 2, fila: 2, rotacion: 90 },
    { idLocal: 'valvulaVenteo', tipo: 'valvulaActuadora', etiqueta: 'Válvula de venteo', col: 4, fila: 2 },
    { idLocal: 'drenaje2', tipo: 'salidaDrenaje', etiqueta: 'Drenaje', col: 5, fila: 2 },
  ],
  conexiones: [
    { desde: 'valvulaActuadora', hasta: 'filtroCanasta', tipo: 'alimentacion' },
    { desde: 'filtroCanasta', hasta: 'bombaAltaPresion', tipo: 'alimentacion', ordenRuta: 'fila-col' },
    { desde: 'filtroCanasta', hasta: 'recuperadorPX', tipo: 'alimentacion', ordenRuta: 'fila-col' },
    { desde: 'bombaAltaPresion', hasta: 'membranaRO', tipo: 'alimentacion' },
    { desde: 'recuperadorPX', hasta: 'bombaBooster', tipo: 'alimentacion' },
    { desde: 'bombaBooster', hasta: 'membranaRO', tipo: 'alimentacion' },
    { desde: 'membranaRO', hasta: 'recuperadorPX', etiqueta: 'Rechazo', tipo: 'rechazo' },
    { desde: 'recuperadorPX', hasta: 'drenaje', tipo: 'rechazo' },
    { desde: 'valvulaVenteo', hasta: 'drenaje2', tipo: 'rechazo' },
  ],
  entradaIdLocal: 'valvulaActuadora',
  salidaIdLocal: 'membranaRO',
  anclaDosificadoras: 'filtroCanasta',
};
