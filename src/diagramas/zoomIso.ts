// Matemática pura de zoom/pan sobre un viewBox SVG — ver spec 2026-07-30-diagrama-isometrico-design.md
// §4.3. El estado del lienzo es, en sí mismo, el viewBox actual: no hace falta guardar escala/offset aparte.
export interface CajaVista {
  minX: number;
  minY: number;
  ancho: number;
  alto: number;
}

export function parsearViewBox(viewBox: string): CajaVista {
  const [minX, minY, ancho, alto] = viewBox.split(' ').map(Number);
  return { minX, minY, ancho, alto };
}

export function formatearViewBox(caja: CajaVista): string {
  return `${caja.minX} ${caja.minY} ${caja.ancho} ${caja.alto}`;
}

/** Aplica zoom centrado en un punto (en unidades del viewBox) — ese punto queda fijo en pantalla antes y
 * después del cambio de escala. `factor` > 1 acerca (achica el viewBox visible), `factor` < 1 aleja. */
export function zoomCentradoEn(actual: CajaVista, factor: number, puntoX: number, puntoY: number): CajaVista {
  return {
    minX: puntoX - (puntoX - actual.minX) / factor,
    minY: puntoY - (puntoY - actual.minY) / factor,
    ancho: actual.ancho / factor,
    alto: actual.alto / factor,
  };
}

/** Desplaza la vista (arrastre con clic) por un delta en unidades del viewBox. */
export function desplazar(actual: CajaVista, deltaX: number, deltaY: number): CajaVista {
  return { ...actual, minX: actual.minX - deltaX, minY: actual.minY - deltaY };
}

/** Convierte un delta en píxeles de pantalla (movimiento real del puntero) a unidades del viewBox, según
 * cuánto viewBox representa cada píxel del elemento SVG renderizado. */
export function pixelesAUnidadesViewBox(deltaPx: number, anchoViewBox: number, anchoElementoPx: number): number {
  if (anchoElementoPx === 0) return 0;
  return deltaPx * (anchoViewBox / anchoElementoPx);
}
