// Tubería isométrica: dibuja los tramos rectos + codos de una conexión ya ruteada (ver
// diagramas/tipos.ts ConexionDiagrama.ruta y diagramas/tuberiaIsoGeometria.ts). Reemplaza la <line> simple
// del motor anterior — ver spec 2026-07-30-diagrama-isometrico-design.md §4.1.
import { poligonosDeRuta, puntoMedioDeRuta, type Punto } from '../diagramas/tuberiaIsoGeometria';

const ANCHO_TUBO = 10;

interface Props {
  puntos: Punto[]; // [origen, ...ruta, destino], ya en coordenadas de pantalla
}

export function TuberiaIso({ puntos }: Props) {
  const { tramos, codos } = poligonosDeRuta(puntos, ANCHO_TUBO);
  return (
    <g className="tuberia-iso">
      {tramos.map((tramo, i) => (
        <polygon key={`tramo-${i}`} points={tramo.map((p) => `${p.x},${p.y}`).join(' ')} className="tuberia-iso__tramo" />
      ))}
      {codos.map((codo, i) => (
        <polygon key={`codo-${i}`} points={codo.map((p) => `${p.x},${p.y}`).join(' ')} className="tuberia-iso__codo" />
      ))}
    </g>
  );
}

/** Punto medio real de la ruta (pondera por longitud de cada tramo) — para posicionar el badge de sensores. */
export function medioDeTuberia(puntos: Punto[]): Punto {
  return puntoMedioDeRuta(puntos);
}
