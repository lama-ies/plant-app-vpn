import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SEGMENTO_N1, SEGMENTO_N2, SEGMENTO_N3 } from './nucleos';

test('N1 estándar: entrada valvulaActuadora, salida membranaRO, ancla de dosificadoras en filtroCanasta', () => {
  assert.equal(SEGMENTO_N1.entradaIdLocal, 'valvulaActuadora');
  assert.equal(SEGMENTO_N1.salidaIdLocal, 'membranaRO');
  assert.equal(SEGMENTO_N1.anclaDosificadoras, 'filtroCanasta');
  const ids = SEGMENTO_N1.nodos.map((n) => n.idLocal);
  assert.deepEqual(ids, ['valvulaActuadora', 'filtroCanasta', 'bombaAltaPresion', 'membranaRO', 'drenaje']);
  assert.ok(SEGMENTO_N1.conexiones.some((c) => c.desde === 'membranaRO' && c.hasta === 'drenaje'));
});

test('N1/N2/N3 ya NO traen Filtro Multimedia propio (lo trae la alimentación, ver spec §5)', () => {
  for (const seg of [SEGMENTO_N1, SEGMENTO_N2, SEGMENTO_N3]) {
    assert.ok(!seg.nodos.some((n) => n.tipo === 'filtroMultimedia'), `${seg.id} no debe tener filtroMultimedia`);
    assert.equal(seg.entradaIdLocal, 'valvulaActuadora');
  }
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

test('N3 PX: la rama de Bomba Alta Presión y la rama de Recuperador PX están en filas distintas (rama real a 90°)', () => {
  const porId = new Map(SEGMENTO_N3.nodos.map((n) => [n.idLocal, n]));
  assert.notEqual(porId.get('bombaAltaPresion')!.fila, porId.get('recuperadorPX')!.fila);
  assert.equal(porId.get('bombaAltaPresion')!.col, porId.get('recuperadorPX')!.col);
});

test('N1/N2/N3: el Drenaje principal llega con tubería vertical, su flecha se rota 90° hacia abajo', () => {
  for (const seg of [SEGMENTO_N1, SEGMENTO_N2, SEGMENTO_N3]) {
    const drenaje = seg.nodos.find((n) => n.idLocal === 'drenaje')!;
    assert.equal(drenaje.rotacion, 90, `${seg.id}: drenaje debe tener rotacion 90`);
  }
});

test('N3: la válvula de venteo tiene su propia descarga (drenaje2), separada del drenaje del Recuperador PX', () => {
  const ids = SEGMENTO_N3.nodos.map((n) => n.idLocal);
  assert.ok(ids.includes('valvulaVenteo'));
  assert.ok(ids.includes('drenaje2'));
  assert.ok(SEGMENTO_N3.conexiones.some((c) => c.desde === 'valvulaVenteo' && c.hasta === 'drenaje2' && c.tipo === 'rechazo'));
  // drenaje2 no es alcanzado por ninguna otra conexión (no comparte descarga con recuperadorPX->drenaje).
  assert.ok(!SEGMENTO_N3.conexiones.some((c) => c.hasta === 'drenaje2' && c.desde !== 'valvulaVenteo'));
});

test('N3: las ramas de alimentación desde Filtro Canasta usan ordenRuta "fila-col" (dejan libre la columna del Rechazo)', () => {
  const ramas = SEGMENTO_N3.conexiones.filter((c) => c.desde === 'filtroCanasta');
  assert.ok(ramas.length > 0);
  assert.ok(ramas.every((c) => c.ordenRuta === 'fila-col'));
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
