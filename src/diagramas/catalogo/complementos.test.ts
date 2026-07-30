import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SEGMENTO_COMPLEMENTO_NINGUNO, SEGMENTO_C1, SEGMENTO_C2, SEGMENTO_UV, SEGMENTO_CISTERNA_FINAL,
} from './complementos';

test('"ninguno" es un pass-through puro: sin nodos, sin conexiones, salida null', () => {
  assert.equal(SEGMENTO_COMPLEMENTO_NINGUNO.nodos.length, 0);
  assert.equal(SEGMENTO_COMPLEMENTO_NINGUNO.conexiones.length, 0);
  assert.equal(SEGMENTO_COMPLEMENTO_NINGUNO.salidaIdLocal, null);
  assert.equal(SEGMENTO_COMPLEMENTO_NINGUNO.entradaIdLocal, null);
});

test('C1: tanque pulmón -> bomba de realce -> filtros de carbono (SIN cisterna final propia)', () => {
  const ids = SEGMENTO_C1.nodos.map((n) => n.idLocal);
  assert.deepEqual(ids, ['tanquePulmon', 'bombaRealce2', 'filtroCarbono']);
  assert.equal(SEGMENTO_C1.entradaIdLocal, 'tanquePulmon');
  assert.equal(SEGMENTO_C1.salidaIdLocal, 'filtroCarbono');
  assert.equal(SEGMENTO_C1.nodos.find((n) => n.idLocal === 'bombaRealce2')!.tipo, 'bombaRealce');
});

test('C2: torre desgasificadora (+soplador flotante) -> tanque pulmón -> bomba de realce', () => {
  const soplador = SEGMENTO_C2.nodos.find((n) => n.idLocal === 'soplador');
  assert.ok(soplador);
  assert.equal(soplador!.flotante, true);
  assert.equal(SEGMENTO_C2.entradaIdLocal, 'torreDesgasificadora');
  assert.equal(SEGMENTO_C2.salidaIdLocal, 'bombaRealce2');
  // El soplador no participa de la cadena de conexiones (es flotante).
  assert.ok(!SEGMENTO_C2.conexiones.some((c) => c.desde === 'soplador' || c.hasta === 'soplador'));
  assert.equal(SEGMENTO_C2.nodos.find((n) => n.idLocal === 'bombaRealce2')!.tipo, 'bombaRealce');
});

test('UV opcional: un único nodo apilable, entrada = salida', () => {
  assert.equal(SEGMENTO_UV.nodos.length, 1);
  assert.equal(SEGMENTO_UV.entradaIdLocal, SEGMENTO_UV.salidaIdLocal);
});

test('Cisterna final: siempre 1 solo nodo tanque, entrada = salida', () => {
  assert.equal(SEGMENTO_CISTERNA_FINAL.nodos.length, 1);
  assert.equal(SEGMENTO_CISTERNA_FINAL.nodos[0].tipo, 'tanque');
  assert.equal(SEGMENTO_CISTERNA_FINAL.entradaIdLocal, SEGMENTO_CISTERNA_FINAL.salidaIdLocal);
});
