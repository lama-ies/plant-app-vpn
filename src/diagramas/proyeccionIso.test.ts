import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gridAPantalla, TILE_ANCHO, TILE_ALTO, TILE_ELEVACION } from './proyeccionIso';

test('origen de la rejilla (0,0,0) proyecta al origen de pantalla', () => {
  assert.deepEqual(gridAPantalla(0, 0), { x: 0, y: 0 });
});

test('avanzar en col (misma fila) mueve en diagonal: +x y +y por igual proporción', () => {
  const p = gridAPantalla(1, 0);
  assert.equal(p.x, TILE_ANCHO / 2);
  assert.equal(p.y, TILE_ALTO / 2);
});

test('avanzar en fila (mismo col) mueve en la diagonal opuesta: -x y +y', () => {
  const p = gridAPantalla(0, 1);
  assert.equal(p.x, -TILE_ANCHO / 2);
  assert.equal(p.y, TILE_ALTO / 2);
});

test('col y fila iguales se cancelan en X, se suman en Y (vuelve al eje vertical del tronco)', () => {
  const p = gridAPantalla(2, 2);
  assert.equal(p.x, 0);
  assert.equal(p.y, 2 * TILE_ALTO);
});

test('elevación sube en pantalla (resta de Y) sin afectar X', () => {
  const base = gridAPantalla(1, 1);
  const elevado = gridAPantalla(1, 1, 2);
  assert.equal(elevado.x, base.x);
  assert.equal(elevado.y, base.y - 2 * TILE_ELEVACION);
});
