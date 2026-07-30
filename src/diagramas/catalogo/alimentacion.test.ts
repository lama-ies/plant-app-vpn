import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SEGMENTO_A1, SEGMENTO_A2, SEGMENTO_A3, SEGMENTO_A4, SEGMENTO_A5, SEGMENTO_C8 } from './alimentacion';

function idsDeNodos(segmento: { nodos: { idLocal: string }[] }): string[] {
  return segmento.nodos.map((n) => n.idLocal);
}

test('A1 (pozo + bomba sumergible) es repetible 1-5 y no tiene entrada externa', () => {
  assert.equal(SEGMENTO_A1.entradaIdLocal, null);
  assert.equal(SEGMENTO_A1.salidaIdLocal, 'bombaSumergible');
  assert.deepEqual(SEGMENTO_A1.repetible, { min: 1, max: 5 });
  assert.deepEqual(idsDeNodos(SEGMENTO_A1), ['pozo', 'bombaSumergible']);
});

test('A2 (cisterna + bomba de realce) no es repetible y no tiene entrada externa', () => {
  assert.equal(SEGMENTO_A2.entradaIdLocal, null);
  assert.equal(SEGMENTO_A2.salidaIdLocal, 'bombaRealce');
  assert.equal(SEGMENTO_A2.repetible, undefined);
});

test('A3 encadena pozo->bomba sumergible->cisterna->bomba realce->filtro multimedia', () => {
  assert.deepEqual(idsDeNodos(SEGMENTO_A3), [
    'pozo', 'bombaSumergible', 'cisterna', 'bombaRealce', 'filtroMultimedia',
  ]);
  assert.equal(SEGMENTO_A3.salidaIdLocal, 'filtroMultimedia');
  // 4 conexiones para 5 nodos en cadena simple.
  assert.equal(SEGMENTO_A3.conexiones.length, 4);
});

test('A4 (cloro + carbón activado) SÍ tiene entrada externa (va después de la alimentación)', () => {
  assert.equal(SEGMENTO_A4.entradaIdLocal, 'inyeccionCloro');
  assert.equal(SEGMENTO_A4.salidaIdLocal, 'filtroCarbonoActivado');
});

test('A5 (UV pre-membrana) es un único nodo, entrada = salida', () => {
  assert.equal(SEGMENTO_A5.entradaIdLocal, 'lamparaUV');
  assert.equal(SEGMENTO_A5.salidaIdLocal, 'lamparaUV');
  assert.equal(SEGMENTO_A5.nodos.length, 1);
});

test('C8 (grupo de bombas de presión) es repetible 1-5, un único nodo, entrada = salida', () => {
  assert.deepEqual(SEGMENTO_C8.repetible, { min: 1, max: 5 });
  assert.equal(SEGMENTO_C8.entradaIdLocal, 'bombaPresion');
  assert.equal(SEGMENTO_C8.salidaIdLocal, 'bombaPresion');
});

test('todo idLocal referenciado en conexiones existe en la lista de nodos (invariante de todos los segmentos)', () => {
  for (const seg of [SEGMENTO_A1, SEGMENTO_A2, SEGMENTO_A3, SEGMENTO_A4, SEGMENTO_A5, SEGMENTO_C8]) {
    const ids = new Set(idsDeNodos(seg));
    for (const c of seg.conexiones) {
      assert.ok(ids.has(c.desde), `${seg.id}: conexión "desde" ${c.desde} no existe en nodos`);
      assert.ok(ids.has(c.hasta), `${seg.id}: conexión "hasta" ${c.hasta} no existe en nodos`);
    }
  }
});
