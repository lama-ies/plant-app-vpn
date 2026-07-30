import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensamblar } from './ensamblador';
import type { SegmentoDiagrama } from './tipos';
import { SEGMENTO_A1 } from './catalogo/alimentacion';
import { SEGMENTO_N1, SEGMENTO_N3 } from './catalogo/nucleos';
import { SEGMENTO_COMPLEMENTO_NINGUNO, SEGMENTO_CISTERNA_FINAL, SEGMENTO_C2, SEGMENTO_UV } from './catalogo/complementos';

const SEG_A: SegmentoDiagrama = {
  id: 'test.a',
  nodos: [{ idLocal: 'x', tipo: 'tanque', etiqueta: 'X', col: 0, fila: 0 }],
  conexiones: [],
  entradaIdLocal: null,
  salidaIdLocal: 'x',
};
const SEG_B: SegmentoDiagrama = {
  id: 'test.b',
  nodos: [{ idLocal: 'y', tipo: 'bomba', etiqueta: 'Y', col: 0, fila: 0 }],
  conexiones: [],
  entradaIdLocal: 'y',
  salidaIdLocal: 'y',
};

test('encadena 2 segmentos: 2 nodos, 1 conexión que los une, ids únicos', () => {
  const resultado = ensamblar([{ segmento: SEG_A }, { segmento: SEG_B }]);
  assert.equal(resultado.nodos.length, 2);
  assert.equal(resultado.conexiones.length, 1);
  const ids = resultado.nodos.map((n) => n.id);
  assert.equal(new Set(ids).size, 2); // ids únicos
  const con = resultado.conexiones[0];
  assert.equal(con.desde, resultado.nodos[0].id);
  assert.equal(con.hasta, resultado.nodos[1].id);
});

test('repetible: 3 copias de un segmento fuente (sin entrada) generan 3 nodos y 3 salidas pendientes', () => {
  const fuenteRepetible: SegmentoDiagrama = {
    id: 'test.fuente',
    nodos: [{ idLocal: 'f', tipo: 'pozo', etiqueta: 'F', col: 0, fila: 0 }],
    conexiones: [],
    entradaIdLocal: null,
    salidaIdLocal: 'f',
    repetible: { min: 1, max: 5 },
  };
  const resultado = ensamblar([{ segmento: fuenteRepetible, copias: 3 }, { segmento: SEG_B }]);
  // 3 nodos de la fuente + 1 de SEG_B.
  assert.equal(resultado.nodos.length, 4);
  // Las 3 copias de la fuente convergen (fan-in) a la entrada de SEG_B: 3 conexiones.
  const nodoB = resultado.nodos.find((n) => n.id.includes('#y'))!;
  const conexionesHaciaB = resultado.conexiones.filter((c) => c.hasta === nodoB.id);
  assert.equal(conexionesHaciaB.length, 3);
});

test('pass-through (segmento sin nodos): no agrega nada y no rompe el empalme siguiente', () => {
  const pasoVacio: SegmentoDiagrama = {
    id: 'test.vacio', nodos: [], conexiones: [], entradaIdLocal: null, salidaIdLocal: null,
  };
  const resultado = ensamblar([{ segmento: SEG_A }, { segmento: pasoVacio }, { segmento: SEG_B }]);
  assert.equal(resultado.nodos.length, 2); // solo A y B, el pass-through no agrega nodos
  assert.equal(resultado.conexiones.length, 1); // A -> B directo, saltando el pass-through
});

test('dos grupos repetibles distintos en secuencia no confunden sus columnas (misma x dentro del grupo, distinta entre grupos)', () => {
  const grupo1: SegmentoDiagrama = {
    id: 'test.g1', nodos: [{ idLocal: 'p', tipo: 'bomba', etiqueta: 'P', col: 0, fila: 0 }],
    conexiones: [], entradaIdLocal: 'p', salidaIdLocal: 'p', repetible: { min: 1, max: 5 },
  };
  const grupo2: SegmentoDiagrama = {
    id: 'test.g2', nodos: [{ idLocal: 'q', tipo: 'bomba', etiqueta: 'Q', col: 0, fila: 0 }],
    conexiones: [], entradaIdLocal: 'q', salidaIdLocal: 'q', repetible: { min: 1, max: 5 },
  };
  const resultado = ensamblar([
    { segmento: SEG_A }, { segmento: grupo1, copias: 2 }, { segmento: grupo2, copias: 2 },
  ]);
  const xsGrupo1 = resultado.nodos.filter((n) => n.id.includes('test.g1')).map((n) => n.x);
  const xsGrupo2 = resultado.nodos.filter((n) => n.id.includes('test.g2')).map((n) => n.x);
  // Las copias de un mismo grupo comparten col y fila (se apilan en elevación, no en fila): mismo x.
  assert.equal(new Set(xsGrupo1).size, 1);
  assert.equal(new Set(xsGrupo2).size, 1);
  assert.notEqual(xsGrupo1[0], xsGrupo2[0]);
});

test('humo: Ósmosis A1 + N1 + sin complemento + cisterna final ensambla sin errores', () => {
  const resultado = ensamblar([
    { segmento: SEGMENTO_A1 },
    { segmento: SEGMENTO_N1 },
    { segmento: SEGMENTO_COMPLEMENTO_NINGUNO },
    { segmento: SEGMENTO_CISTERNA_FINAL },
  ]);
  // A1 (3 nodos: pozo, bombaSumergible, filtroMultimedia) + N1 (5 nodos: valvulaActuadora, filtroCanasta,
  // bombaAltaPresion, membranaRO, drenaje) + cisterna final (1 nodo) = 9.
  assert.equal(resultado.nodos.length, 9);
  const ids = resultado.nodos.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length); // todos únicos
  const idCisternaFinal = resultado.nodos.find((n) => n.id.includes('cisternaFinal'))!.id;
  assert.ok(resultado.conexiones.some((c) => c.hasta === idCisternaFinal));
});

test('humo: Ósmosis A1(3 pozos) + N3(PX) + C2 + UV + cisterna final ensambla sin errores', () => {
  const resultado = ensamblar([
    { segmento: SEGMENTO_A1, copias: 3 },
    { segmento: SEGMENTO_N3 },
    { segmento: SEGMENTO_C2 },
    { segmento: SEGMENTO_UV },
    { segmento: SEGMENTO_CISTERNA_FINAL },
  ]);
  // 3 copias de A1 (3 nodos c/u = 9) + N3 (7 nodos, sin filtroMultimedia) + C2 (4 nodos) + UV (1) +
  // cisterna final (1) = 22.
  assert.equal(resultado.nodos.length, 22);
  const ids = resultado.nodos.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('N3: filtroCanasta->recuperadorPX (cambia de fila y de col) se rutea con 1 waypoint intermedio', () => {
  const resultado = ensamblar([{ segmento: SEGMENTO_N3 }]);
  const con = resultado.conexiones.find((c) => c.desde.includes('#filtroCanasta') && c.hasta.includes('#recuperadorPX'))!;
  assert.equal(con.ruta.length, 1);
});

test('N3: valvulaActuadora->filtroCanasta (misma fila) no necesita waypoints', () => {
  const resultado = ensamblar([{ segmento: SEGMENTO_N3 }]);
  const con = resultado.conexiones.find((c) => c.desde.includes('#valvulaActuadora') && c.hasta.includes('#filtroCanasta'))!;
  assert.equal(con.ruta.length, 0);
});

test('dosificadoras: se insertan como nodos flotantes cerca del ancla del núcleo, sin conexiones', () => {
  const resultado = ensamblar(
    [{ segmento: SEGMENTO_A1 }, { segmento: SEGMENTO_N1 }, { segmento: SEGMENTO_COMPLEMENTO_NINGUNO }, { segmento: SEGMENTO_CISTERNA_FINAL }],
    3,
  );
  const dosificadoras = resultado.nodos.filter((n) => n.tipo === 'dosificadora');
  assert.equal(dosificadoras.length, 3);
  assert.ok(dosificadoras.every((d) => d.flotante === true));
  // Ninguna dosificadora participa de una conexión.
  const idsDosificadoras = new Set(dosificadoras.map((d) => d.id));
  assert.ok(!resultado.conexiones.some((c) => idsDosificadoras.has(c.desde) || idsDosificadoras.has(c.hasta)));
});

test('0 dosificadoras (o parámetro omitido): no agrega ningún nodo dosificadora', () => {
  const resultado = ensamblar([
    { segmento: SEGMENTO_A1 }, { segmento: SEGMENTO_N1 }, { segmento: SEGMENTO_COMPLEMENTO_NINGUNO }, { segmento: SEGMENTO_CISTERNA_FINAL },
  ]);
  assert.equal(resultado.nodos.filter((n) => n.tipo === 'dosificadora').length, 0);
});
