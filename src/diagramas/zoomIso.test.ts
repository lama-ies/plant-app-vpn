import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsearViewBox, formatearViewBox, zoomCentradoEn, desplazar, pixelesAUnidadesViewBox } from './zoomIso';

test('parsearViewBox / formatearViewBox son inversas', () => {
  const caja = parsearViewBox('10 20 300 150');
  assert.deepEqual(caja, { minX: 10, minY: 20, ancho: 300, alto: 150 });
  assert.equal(formatearViewBox(caja), '10 20 300 150');
});

test('zoomCentradoEn con factor 2 reduce el viewBox a la mitad y mantiene fijo el punto de zoom', () => {
  const actual = { minX: 0, minY: 0, ancho: 200, alto: 100 };
  const resultado = zoomCentradoEn(actual, 2, 100, 50);
  assert.equal(resultado.ancho, 100);
  assert.equal(resultado.alto, 50);
  assert.equal(resultado.minX, 50);
  assert.equal(resultado.minY, 25);
});

test('zoomCentradoEn con factor 0.5 (alejar) duplica el viewBox', () => {
  const actual = { minX: 50, minY: 25, ancho: 100, alto: 50 };
  const resultado = zoomCentradoEn(actual, 0.5, 100, 50);
  assert.equal(resultado.ancho, 200);
  assert.equal(resultado.alto, 100);
  assert.equal(resultado.minX, 0);
  assert.equal(resultado.minY, 0);
});

test('desplazar mueve minX/minY sin tocar ancho/alto', () => {
  const actual = { minX: 10, minY: 10, ancho: 200, alto: 100 };
  assert.deepEqual(desplazar(actual, 20, -5), { minX: -10, minY: 15, ancho: 200, alto: 100 });
});

test('pixelesAUnidadesViewBox convierte proporcionalmente al tamaño renderizado del elemento', () => {
  assert.equal(pixelesAUnidadesViewBox(10, 200, 400), 5);
});

test('pixelesAUnidadesViewBox con ancho de elemento 0 devuelve 0 (evita división por cero)', () => {
  assert.equal(pixelesAUnidadesViewBox(10, 200, 0), 0);
});
