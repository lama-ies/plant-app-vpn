import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SEGMENTO_N1, SEGMENTO_N2, SEGMENTO_N3 } from './nucleos';

test('N1 estándar: entrada filtroMultimedia, salida membranaRO, ancla de dosificadoras en filtroCanasta', () => {
  assert.equal(SEGMENTO_N1.entradaIdLocal, 'filtroMultimedia');
  assert.equal(SEGMENTO_N1.salidaIdLocal, 'membranaRO');
  assert.equal(SEGMENTO_N1.anclaDosificadoras, 'filtroCanasta');
  const ids = SEGMENTO_N1.nodos.map((n) => n.idLocal);
  assert.deepEqual(ids, ['filtroMultimedia', 'valvulaActuadora', 'filtroCanasta', 'bombaAltaPresion', 'membranaRO', 'drenaje']);
  // Rechazo: Membranas -> Drenaje.
  assert.ok(SEGMENTO_N1.conexiones.some((c) => c.desde === 'membranaRO' && c.hasta === 'drenaje'));
});

test('N2 turbo: pasa por TurboCharger antes de Membranas, y el rechazo retorna al TurboCharger', () => {
  const ids = SEGMENTO_N2.nodos.map((n) => n.idLocal);
  assert.ok(ids.includes('turbocharger'));
  assert.ok(SEGMENTO_N2.conexiones.some((c) => c.desde === 'bombaAltaPresion' && c.hasta === 'turbocharger'));
  assert.ok(SEGMENTO_N2.conexiones.some((c) => c.desde === 'turbocharger' && c.hasta === 'membranaRO'));
  assert.ok(SEGMENTO_N2.conexiones.some((c) => c.desde === 'membranaRO' && c.hasta === 'turbocharger'));
  assert.ok(SEGMENTO_N2.conexiones.some((c) => c.desde === 'turbocharger' && c.hasta === 'drenaje'));
  assert.equal(SEGMENTO_N2.salidaIdLocal, 'membranaRO');
});

test('N3 PX: Filtro Canasta se ramifica en paralelo (Bomba Alta Presión y Recuperador PX) y converge en Membranas', () => {
  const desdeFiltroCanasta = SEGMENTO_N3.conexiones.filter((c) => c.desde === 'filtroCanasta').map((c) => c.hasta);
  assert.deepEqual(new Set(desdeFiltroCanasta), new Set(['bombaAltaPresion', 'recuperadorPX']));
  const haciaMembrana = SEGMENTO_N3.conexiones.filter((c) => c.hasta === 'membranaRO').map((c) => c.desde);
  assert.deepEqual(new Set(haciaMembrana), new Set(['bombaAltaPresion', 'bombaBooster']));
  assert.ok(SEGMENTO_N3.conexiones.some((c) => c.desde === 'membranaRO' && c.hasta === 'recuperadorPX'));
  assert.ok(SEGMENTO_N3.conexiones.some((c) => c.desde === 'recuperadorPX' && c.hasta === 'drenaje'));
});

test('todo idLocal referenciado en conexiones existe en la lista de nodos (invariante)', () => {
  for (const seg of [SEGMENTO_N1, SEGMENTO_N2, SEGMENTO_N3]) {
    const ids = new Set(seg.nodos.map((n) => n.idLocal));
    for (const c of seg.conexiones) {
      assert.ok(ids.has(c.desde), `${seg.id}: "desde" ${c.desde} no existe`);
      assert.ok(ids.has(c.hasta), `${seg.id}: "hasta" ${c.hasta} no existe`);
    }
  }
});
