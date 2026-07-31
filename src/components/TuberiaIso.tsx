// Tubería: dibuja los tramos rectos + codos de una conexión ya ruteada (ver diagramas/tipos.ts
// ConexionDiagrama.ruta y diagramas/tuberiaIsoGeometria.ts), coloreada según el tipo de agua que lleva
// (alimentacion=verde, permeado=celeste, rechazo=rojo, ver spec §9) y con flechas de sentido de flujo en
// cada tramo recto — así dos tuberías que se cruzan en 90° nunca se confunden a simple vista.
import { poligonosDeRuta, puntoMedioDeRuta, flechasDeRuta, type Punto } from '../diagramas/tuberiaIsoGeometria';
import type { TipoFlujo } from '../diagramas/tipos';

const ANCHO_TUBO = 10;
const FLECHA = 6; // medio-largo de la flecha de sentido de flujo

interface Props {
  puntos: Punto[]; // [origen, ...ruta, destino], ya en coordenadas de pantalla
  tipo: TipoFlujo;
}

export function TuberiaIso({ puntos, tipo }: Props) {
  const { tramos, codos } = poligonosDeRuta(puntos, ANCHO_TUBO);
  const flechas = flechasDeRuta(puntos);
  return (
    <g className={`tuberia-iso tuberia-iso--${tipo}`}>
      {tramos.map((tramo, i) => (
        <polygon key={`tramo-${i}`} points={tramo.map((p) => `${p.x},${p.y}`).join(' ')} className="tuberia-iso__tramo" />
      ))}
      {codos.map((codo, i) => (
        <polygon key={`codo-${i}`} points={codo.map((p) => `${p.x},${p.y}`).join(' ')} className="tuberia-iso__codo" />
      ))}
      {flechas.map((f, i) => (
        <polygon
          key={`flecha-${i}`}
          className="tuberia-iso__flecha"
          points={`${-FLECHA},${-FLECHA * 0.7} ${FLECHA},0 ${-FLECHA},${FLECHA * 0.7}`}
          transform={`translate(${f.x} ${f.y}) rotate(${f.anguloGrados})`}
        />
      ))}
    </g>
  );
}

/** Punto medio real de la ruta (pondera por longitud de cada tramo) — para posicionar el badge de sensores. */
export function medioDeTuberia(puntos: Punto[]): Punto {
  return puntoMedioDeRuta(puntos);
}
