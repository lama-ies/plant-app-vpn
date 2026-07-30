import assert from 'node:assert/strict';
import { test } from 'node:test';
import { slotsPermitidos, slotsPermitidosConexion } from './reglasSensores';

test('tanque: solo lógicos', () => {
  assert.deepEqual(slotsPermitidos('tanque'), ['nivelOnOff', 'presionOnOff', 'flujoOnOff', 'flotadorOnOff', 'alarmaNivel']);
});

test('bomba: lógicos y analógicos juntos, rpm y hz independientes', () => {
  const slots = slotsPermitidos('bomba');
  assert.ok(slots.includes('rpm'));
  assert.ok(slots.includes('hz'));
  assert.ok(slots.includes('onOffEquipo'));
  assert.ok(slots.includes('temperatura'));
  assert.ok(slots.includes('falla'));
});

test('dosificadora: sus 4 slots propios', () => {
  assert.deepEqual(slotsPermitidos('dosificadora'), ['onOffEquipo', 'porcentajeFuncionamiento', 'flotadorOnOff', 'falla']);
});

test('cualquier tubería: catálogo analógico completo + on/off', () => {
  const slots = slotsPermitidosConexion();
  assert.ok(slots.includes('nivel'));
  assert.ok(slots.includes('conductividad'));
  assert.ok(slots.includes('flujoOnOff'));
});

test('un tipo de nodo sin catálogo propio (ej. tuberías/procesos genéricos) devuelve el catálogo de tubería', () => {
  assert.deepEqual(slotsPermitidos('filtroMultimedia'), slotsPermitidosConexion());
});

test('bombaSumergible y bombaRealce comparten el catálogo de bomba (lógicos + analógicos, rpm/hz independientes)', () => {
  for (const tipo of ['bombaSumergible', 'bombaRealce'] as const) {
    const slots = slotsPermitidos(tipo);
    assert.ok(slots.includes('rpm'));
    assert.ok(slots.includes('hz'));
    assert.ok(slots.includes('onOffEquipo'));
    assert.ok(slots.includes('falla'));
  }
});
