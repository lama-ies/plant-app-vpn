// Cálculo del viewBox (encuadre) de un diagrama, AL DIBUJAR.
//
// Por qué se calcula acá y no se usa el `diagrama.viewBox` guardado: ese valor se fijó al ensamblar y
// quedó congelado en `perfil.diagrama` de cada equipo. Igual que pasó con las tuberías de retorno, cambiar
// el ensamblador no arregla los perfiles ya dados de alta. Calcularlo al dibujar corrige todos, sin migrar
// datos, y de paso es lo que ya hacía plant-portal-client desde el principio.
//
// Qué encuadra, y por qué importa (2026-08-07): el margen fijo de 100 unidades alrededor de los NODOS no
// alcanzaba. Un nodo no es solo su ícono: lleva un `foreignObject` con su nombre y valores, anclado abajo a
// la derecha, de 170x64 unidades. El nodo más a la derecha del diagrama se salía del encuadre y su etiqueta
// aparecía cortada contra el borde del lienzo — se hizo evidente al pasar a un lienzo que se ajusta a la
// forma del diagrama (antes la caja sobraba por todos lados y lo tapaba). Acá se une la caja del ícono, la
// caja de la etiqueta y los waypoints de tubería de cada elemento, que es exacto en vez de estimado.
import type { ConexionDiagrama, NodoDiagrama } from './tipos';

/** Geometría del nodo, en unidades del viewBox. Debe coincidir con MotorDiagrama.tsx: `RADIO_ICONO` y el
 * `<foreignObject>` de los datos (`x/y` desplazados 0.6 * RADIO_ICONO, 170x64). */
const RADIO_ICONO = 30;
const ETIQUETA_DESPLAZAMIENTO = RADIO_ICONO * 0.6;
const ETIQUETA_ANCHO = 170;
const ETIQUETA_ALTO = 64;

/** Aire alrededor del contenido para que nada quede pegado al borde del lienzo. */
const MARGEN = 24;

const VIEWBOX_VACIO = '0 0 400 200';

/** Calcula el viewBox que envuelve íconos, etiquetas y tuberías de un diagrama. */
export function calcularEncuadre(nodos: NodoDiagrama[], conexiones: ConexionDiagrama[] = []): string {
  if (nodos.length === 0) return VIEWBOX_VACIO;

  const xs: number[] = [];
  const ys: number[] = [];
  for (const n of nodos) {
    // Ícono: centrado en (x, y). Etiqueta: cuelga hacia abajo a la derecha.
    xs.push(n.x - RADIO_ICONO, n.x + ETIQUETA_DESPLAZAMIENTO + ETIQUETA_ANCHO);
    ys.push(n.y - RADIO_ICONO, n.y + ETIQUETA_DESPLAZAMIENTO + ETIQUETA_ALTO);
  }
  // Waypoints de tubería: una tubería con desvío pasa por encima del nodo más alto (ver rutaRetorno.ts).
  for (const c of conexiones) {
    for (const p of c.ruta) {
      xs.push(p.x);
      ys.push(p.y);
    }
  }

  const minX = Math.min(...xs) - MARGEN;
  const maxX = Math.max(...xs) + MARGEN;
  const minY = Math.min(...ys) - MARGEN;
  const maxY = Math.max(...ys) + MARGEN;
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}
