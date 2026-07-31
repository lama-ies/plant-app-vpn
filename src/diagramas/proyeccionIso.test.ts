import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gridAPantalla, STEP, BRANCH, ELEVACION_PASO } from './proyeccionIso';

test('origen de la rejilla (0,0,0) proyecta al origen de pantalla', () => {
  assert.deepEqual(gridAPantalla(0, 0), { x: 0, y: 0 });
});

test('avanzar en col mueve solo en X (rama a 90° real, sin sesgo diagonal)', () => {
  const p = gridAPantalla(1, 0);
  assert.equal(p.x, STEP);
  assert.equal(p.y, 0);
});

test('avanzar en fila mueve solo en Y (perpendicular real al avance de col)', () => {
  const p = gridAPantalla(0, 1);
  assert.equal(p.x, 0);
  assert.equal(p.y, BRANCH);
});

test('col y fila combinados se proyectan de forma independiente (sin interacción entre ejes)', () => {
  const p = gridAPantalla(2, -1);
  assert.equal(p.x, 2 * STEP);
  assert.equal(p.y, -1 * BRANCH);
});

test('elevación sube en pantalla (resta de Y) sin afectar X', () => {
  const base = gridAPantalla(1, 1);
  const elevado = gridAPantalla(1, 1, 2);
  assert.equal(elevado.x, base.x);
  assert.equal(elevado.y, base.y - 2 * ELEVACION_PASO);
});
