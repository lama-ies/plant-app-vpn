// Proyección isométrica pura: convierte coordenadas de rejilla (col/fila/elevación) del catálogo de
// segmentos en la posición final en pantalla que consume DiagramaEquipo. Única pieza del sistema que
// conoce esta matemática — ver spec 2026-07-30-diagrama-isometrico-design.md §3.2.
export const TILE_ANCHO = 130;
export const TILE_ALTO = 75;
export const TILE_ELEVACION = 60;

export interface PuntoPantalla {
  x: number;
  y: number;
}

/** Proyección isométrica clásica (ejes a 30°): col y fila avanzan en direcciones opuestas en X, ambas
 * suman en Y; la elevación resta en Y (sube en pantalla). */
export function gridAPantalla(col: number, fila: number, elevacion = 0): PuntoPantalla {
  const x = (col - fila) * (TILE_ANCHO / 2);
  const y = (col + fila) * (TILE_ALTO / 2) - elevacion * TILE_ELEVACION;
  return { x, y };
}
