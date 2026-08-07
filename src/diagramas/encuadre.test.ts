import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calcularEncuadre } from './encuadre';
import { ensamblar } from './ensamblador';
import { reencaminarRetornos } from './rutaRetorno';
import { SEGMENTO_CISTERNA_HIDRO, SEGMENTO_LINEA_SUMINISTRO } from './catalogo/hidroneumatico';
import { SEGMENTO_A1, SEGMENTO_C8 } from './catalogo/alimentacion';
import { SEGMENTO_N2 } from './catalogo/nucleos';
import { SEGMENTO_CISTERNA_FINAL } from './catalogo/complementos';
import type { NodoDiagrama } from './tipos';

const partes = (vb: string) => vb.split(' ').map(Number);

test('el encuadre deja lugar a la etiqueta del nodo, no solo a su ícono', () => {
  // Un solo nodo en el origen: la etiqueta cuelga a la DERECHA y hacia ABAJO, así que el encuadre tiene que
  // ser asimétrico. Con un margen plano alrededor del centro, la etiqueta quedaba cortada contra el borde.
  const nodo: NodoDiagrama = { id: 'n', tipo: 'tanque', etiqueta: 'X', x: 0, y: 0, sensores: [] };
  const [minX, minY, ancho, alto] = partes(calcularEncuadre([nodo]));
  assert.ok(minX < 0 && minY < 0, 'el ícono sobresale hacia arriba y a la izquierda del centro');
  assert.ok(minX + ancho >= 0 + 18 + 170, `el borde derecho (${minX + ancho}) debe cubrir la etiqueta`);
  assert.ok(minY + alto >= 0 + 18 + 64, `el borde inferior (${minY + alto}) debe cubrir la etiqueta`);
});

test('el encuadre incluye los waypoints de tubería (desvío del retorno por arriba)', () => {
  const d = reencaminarRetornos(ensamblar([{ segmento: SEGMENTO_N2 }]));
  const [, minY] = partes(calcularEncuadre(d.nodos, d.conexiones));
  const yMasAlto = Math.min(...d.conexiones.flatMap((c) => c.ruta).map((p) => p.y));
  assert.ok(minY < yMasAlto, `el borde superior (${minY}) debe quedar sobre el waypoint más alto (${yMasAlto})`);
});

test('la proporción del encuadre sigue la forma real del diagrama, sea ancha o alta', () => {
  const relacion = (nodos: NodoDiagrama[], conexiones: never[] = []) => {
    const [, , a, h] = partes(calcularEncuadre(nodos, conexiones));
    return a / h;
  };
  const hidro5 = ensamblar([
    { segmento: SEGMENTO_CISTERNA_HIDRO }, { segmento: SEGMENTO_C8, copias: 5 }, { segmento: SEGMENTO_LINEA_SUMINISTRO },
  ]);
  const osmosis = ensamblar([
    { segmento: SEGMENTO_A1 }, { segmento: SEGMENTO_N2 }, { segmento: SEGMENTO_CISTERNA_FINAL },
  ]);
  // Hidroneumático de 5 bombas: apaisado NO. Ósmosis: claramente apaisado. Si las dos dieran parecido, el
  // lienzo volvería a ser una caja de forma fija y uno de los dos casos quedaría diminuto.
  assert.ok(relacion(hidro5.nodos) < 1.6, `hidro-5 debería ser casi cuadrado o alto, dio ${relacion(hidro5.nodos)}`);
  assert.ok(relacion(osmosis.nodos) > 3, `ósmosis debería ser muy apaisado, dio ${relacion(osmosis.nodos)}`);
});

test('sin nodos devuelve un encuadre válido en vez de Infinity', () => {
  const [minX, minY, ancho, alto] = partes(calcularEncuadre([], []));
  for (const v of [minX, minY, ancho, alto]) assert.ok(Number.isFinite(v));
  assert.ok(ancho > 0 && alto > 0);
});
