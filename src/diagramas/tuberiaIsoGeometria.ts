// Geometría pura de tubería isométrica: convierte una lista de puntos (origen, waypoints, destino) en
// polígonos de tramo recto + relleno de codo, para que el motor de render solo dibuje <polygon>. Sin JSX
// aquí para poder probarla con node:test. Ver spec 2026-07-30-diagrama-isometrico-design.md §4.1.
export interface Punto {
  x: number;
  y: number;
}

/** Polígono (4 puntos) de un tramo recto entre `a` y `b`, con ancho total `ancho` centrado en la línea. */
export function tramoRecto(a: Punto, b: Punto, ancho: number): Punto[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo = Math.hypot(dx, dy) || 1;
  const nx = (-dy / largo) * (ancho / 2);
  const ny = (dx / largo) * (ancho / 2);
  return [
    { x: a.x + nx, y: a.y + ny },
    { x: b.x + nx, y: b.y + ny },
    { x: b.x - nx, y: b.y - ny },
    { x: a.x - nx, y: a.y - ny },
  ];
}

/** Relleno cuadrado del codo en un punto intermedio (cubre el hueco de mitra entre dos tramos rectos). */
export function relenoCodo(centro: Punto, ancho: number): Punto[] {
  const m = ancho / 2;
  return [
    { x: centro.x - m, y: centro.y - m },
    { x: centro.x + m, y: centro.y - m },
    { x: centro.x + m, y: centro.y + m },
    { x: centro.x - m, y: centro.y + m },
  ];
}

/** Descompone la ruta completa (origen + waypoints + destino) en los polígonos de tramo recto + los
 * rellenos de codo en cada punto intermedio (no en los extremos). */
export function poligonosDeRuta(puntos: Punto[], ancho: number): { tramos: Punto[][]; codos: Punto[][] } {
  const tramos: Punto[][] = [];
  for (let i = 0; i < puntos.length - 1; i++) tramos.push(tramoRecto(puntos[i], puntos[i + 1], ancho));
  const codos: Punto[][] = [];
  for (let i = 1; i < puntos.length - 1; i++) codos.push(relenoCodo(puntos[i], ancho));
  return { tramos, codos };
}

/** Una flecha de dirección de flujo: centrada en el punto medio de un tramo recto, orientada (en grados,
 * para `transform="rotate(...)"`) según el sentido real `desde -> hasta` de ese tramo. */
export interface FlechaFlujo {
  x: number;
  y: number;
  anguloGrados: number;
}

/** Una flecha por cada tramo recto de la ruta (nunca en los codos, donde no hay una dirección única) — así
 * el sentido del agua se ve en cada segmento visible, no solo una vez en toda la tubería (ver spec §9). */
export function flechasDeRuta(puntos: Punto[]): FlechaFlujo[] {
  const flechas: FlechaFlujo[] = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i];
    const b = puntos[i + 1];
    flechas.push({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      anguloGrados: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
    });
  }
  return flechas;
}

/** Punto medio de la ruta completa, ponderado por longitud de cada tramo (para posicionar el badge de
 * sensores a medio camino real, no al punto medio recto entre extremos). */
export function puntoMedioDeRuta(puntos: Punto[]): Punto {
  const largos: number[] = [];
  let total = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    const l = Math.hypot(puntos[i + 1].x - puntos[i].x, puntos[i + 1].y - puntos[i].y);
    largos.push(l);
    total += l;
  }
  if (total === 0) return puntos[0];
  let acumulado = 0;
  const objetivo = total / 2;
  for (let i = 0; i < largos.length; i++) {
    if (acumulado + largos[i] >= objetivo) {
      const t = (objetivo - acumulado) / (largos[i] || 1);
      return {
        x: puntos[i].x + (puntos[i + 1].x - puntos[i].x) * t,
        y: puntos[i].y + (puntos[i + 1].y - puntos[i].y) * t,
      };
    }
    acumulado += largos[i];
  }
  return puntos[puntos.length - 1];
}
