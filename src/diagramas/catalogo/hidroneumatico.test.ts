import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SEGMENTO_CISTERNA_HIDRO, SEGMENTO_LINEA_SUMINISTRO } from './hidroneumatico';
import { SEGMENTO_C8 } from './alimentacion';

test('Hidroneumático reusa el mismo C8 (grupo de bombas de presión) que Ósmosis', () => {
  assert.equal(SEGMENTO_C8.id, 'comun.grupoBombasPresion');
});

test('Cisterna de hidroneumático: origen, sin entrada externa', () => {
  assert.equal(SEGMENTO_CISTERNA_HIDRO.entradaIdLocal, null);
  assert.equal(SEGMENTO_CISTERNA_HIDRO.nodos[0].tipo, 'tanque');
});

test('Línea de suministro: nodo final, entrada = salida', () => {
  assert.equal(SEGMENTO_LINEA_SUMINISTRO.entradaIdLocal, SEGMENTO_LINEA_SUMINISTRO.salidaIdLocal);
  assert.equal(SEGMENTO_LINEA_SUMINISTRO.nodos[0].tipo, 'lineaDistribucion');
});
