import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tramoRecto, relenoCodo, poligonosDeRuta, puntoMedioDeRuta, flechasDeRuta } from './tuberiaIsoGeometria';

test('tramoRecto de una línea horizontal produce un rectángulo centrado, ancho perpendicular vertical', () => {
  const poligono = tramoRecto({ x: 0, y: 0 }, { x: 100, y: 0 }, 10);
  assert.deepEqual(poligono, [
    { x: 0, y: 5 }, { x: 100, y: 5 }, { x: 100, y: -5 }, { x: 0, y: -5 },
  ]);
});

test('relenoCodo produce un cuadrado centrado del ancho dado', () => {
  const cuadrado = relenoCodo({ x: 10, y: 10 }, 8);
  assert.deepEqual(cuadrado, [
    { x: 6, y: 6 }, { x: 14, y: 6 }, { x: 14, y: 14 }, { x: 6, y: 14 },
  ]);
});

test('poligonosDeRuta con 1 waypoint intermedio produce 2 tramos y 1 codo', () => {
  const { tramos, codos } = poligonosDeRuta([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }], 10);
  assert.equal(tramos.length, 2);
  assert.equal(codos.length, 1);
});

test('poligonosDeRuta sin waypoints (tramo recto directo) produce 1 tramo y 0 codos', () => {
  const { tramos, codos } = poligonosDeRuta([{ x: 0, y: 0 }, { x: 50, y: 0 }], 10);
  assert.equal(tramos.length, 1);
  assert.equal(codos.length, 0);
});

test('puntoMedioDeRuta de un tramo recto simple es el punto medio geométrico', () => {
  assert.deepEqual(puntoMedioDeRuta([{ x: 0, y: 0 }, { x: 100, y: 0 }]), { x: 50, y: 0 });
});

test('puntoMedioDeRuta con codo pondera por longitud real de cada tramo, no por cantidad de puntos', () => {
  // Tramo 1: 0->40 (largo 40). Tramo 2: 40,0 -> 40,10 (largo 10). Total 50, mitad = 25 -> dentro del tramo 1.
  const medio = puntoMedioDeRuta([{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 10 }]);
  assert.deepEqual(medio, { x: 25, y: 0 });
});

test('flechasDeRuta: una tubería horizontal hacia la derecha produce 1 flecha en el punto medio, ángulo 0°', () => {
  const [flecha] = flechasDeRuta([{ x: 0, y: 0 }, { x: 100, y: 0 }]);
  assert.deepEqual(flecha, { x: 50, y: 0, anguloGrados: 0 });
});

test('flechasDeRuta: una tubería vertical hacia abajo apunta a 90° (Y crece hacia abajo en pantalla)', () => {
  const [flecha] = flechasDeRuta([{ x: 0, y: 0 }, { x: 0, y: 40 }]);
  assert.equal(flecha.x, 0);
  assert.equal(flecha.y, 20);
  assert.equal(flecha.anguloGrados, 90);
});

test('flechasDeRuta: una tubería con 1 codo produce 2 flechas, una por tramo recto (nunca en el codo)', () => {
  const flechas = flechasDeRuta([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }]);
  assert.equal(flechas.length, 2);
});
