// Bloque isométrico genérico (Fase 1): un cubo isométrico con el ícono Lucide actual como placa en la
// cara frontal. Todos los TipoNodoProceso apuntan aquí hasta que la Fase 2 les dé su propio modelo bespoke
// (ver spec 2026-07-30-diagrama-isometrico-design.md §4.2) — reemplazar una entrada de ICONO_ISO no toca
// este archivo ni ningún otro componente.
import type { LucideIcon } from 'lucide-react';

const ANCHO = 40; // medio-ancho del rombo superior
const ALTO_ROMBO = 20; // medio-alto del rombo superior
const ALTURA_CUERPO = 36; // alto de las caras laterales del cubo

const T = { x: 0, y: -ALTURA_CUERPO / 2 - ALTO_ROMBO };
const R = { x: ANCHO, y: -ALTURA_CUERPO / 2 };
const B = { x: 0, y: -ALTURA_CUERPO / 2 + ALTO_ROMBO };
const L = { x: -ANCHO, y: -ALTURA_CUERPO / 2 };
const B2 = { x: 0, y: B.y + ALTURA_CUERPO };
const L2 = { x: -ANCHO, y: L.y + ALTURA_CUERPO };
const R2 = { x: ANCHO, y: R.y + ALTURA_CUERPO };

const punto = (p: { x: number; y: number }) => `${p.x},${p.y}`;

interface Props {
  Icono: LucideIcon;
  flotante?: boolean;
}

/** Cubo isométrico con 3 caras (superior clara, lateral izquierda con sombra, lateral derecha tono base) +
 * el ícono Lucide del tipo de nodo como placa sobre la cara frontal-derecha. */
export function BloqueIsoGenerico({ Icono, flotante }: Props) {
  return (
    <svg
      viewBox={`${L.x - 4} ${T.y - 4} ${R.x - L.x + 8} ${L2.y - T.y + 8}`}
      width={ANCHO * 2 + 8}
      height={L2.y - T.y + 8}
      className={`bloque-iso ${flotante ? 'bloque-iso--flotante' : ''}`}
      aria-hidden
    >
      <polygon points={[T, R, B, L].map(punto).join(' ')} className="bloque-iso__cara-superior" />
      <polygon points={[L, B, B2, L2].map(punto).join(' ')} className="bloque-iso__cara-izquierda" />
      <polygon points={[B, R, R2, B2].map(punto).join(' ')} className="bloque-iso__cara-derecha" />
      <foreignObject x={-14} y={B.y - 6} width={28} height={28}>
        <Icono size={20} className="bloque-iso__icono" />
      </foreignObject>
    </svg>
  );
}
