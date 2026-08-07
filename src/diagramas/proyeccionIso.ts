// Proyección 2.5D pura: convierte coordenadas de rejilla (col/fila/elevación) del catálogo de segmentos en
// la posición final en pantalla que consume DiagramaEquipo. Única pieza del sistema que conoce esta
// matemática — ver spec 2026-07-30-diagrama-isometrico-design.md §9 (pivote de isométrico de 30° a 2.5D
// ortogonal: más simple de construir/mantener, sin diferencia real de rendimiento entre ambos estilos).
export const STEP = 150; // separación horizontal por unidad de columna (avance del proceso)
export const BRANCH = 110; // separación vertical por unidad de fila (ramas paralelas reales, ej. PX)
// Separación vertical por unidad de elevación (apilado de copias repetibles/flotantes). Antes 45 — MENOR
// que el diámetro real del ícono de nodo (RADIO_ICONO=30 en MotorDiagrama.tsx, 60px de diámetro), así que
// copias adyacentes apiladas (ej. 3+ pozos, 4 bombas de un grupo de presión) se pisaban entre sí (íconos Y
// etiquetas). Bug real nunca antes visto porque hasta el Showroom (2026-08-06) nunca se había ensamblado un
// grupo repetible con más de 2 copias reales. 110 (igual que BRANCH) deja margen real entre ícono+etiqueta
// de una copia y la siguiente.
export const ELEVACION_PASO = 110;

export interface PuntoPantalla {
  x: number;
  y: number;
}

/** Rejilla ortogonal (sin sesgo diagonal): col mueve en X, fila mueve en Y — las ramas paralelas quedan a
 * 90° real en pantalla directamente, sin necesitar proyección isométrica. La elevación desplaza en Y sin
 * afectar X (para nodos flotantes o copias apiladas de un mismo grupo repetible). */
export function gridAPantalla(col: number, fila: number, elevacion = 0): PuntoPantalla {
  const x = col * STEP;
  const y = fila * BRANCH - elevacion * ELEVACION_PASO;
  return { x, y };
}
