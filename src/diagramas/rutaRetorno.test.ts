import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reencaminarRetornos, ALTURA_DESVIO } from './rutaRetorno';
import { ensamblar } from './ensamblador';
import { SEGMENTO_N2 } from './catalogo/nucleos';
import type { DiagramaEquipo } from './tipos';
// Diagrama REAL exportado de un equipo dado de alta ANTES del arreglo del ensamblador: su rechazo
// Membranas->TurboCharger viene con `ruta: []`, encimado sobre la alimentación. Es el caso que reportó el
// usuario, y la razón de que el arreglo tenga que estar también en el render.
import guardado from './__fixture-turbo-guardado.json' with { type: 'json' };

const diagramaGuardado = guardado as unknown as DiagramaEquipo;

function conexionEntre(d: DiagramaEquipo, etqDesde: string, etqHasta: string) {
  const id = (e: string) => d.nodos.find((n) => n.etiqueta === e)!.id;
  return d.conexiones.find((c) => c.desde === id(etqDesde) && c.hasta === id(etqHasta))!;
}

test('perfil YA GUARDADO con la ruta vieja: el rechazo del turbo se desvía por arriba al dibujar', () => {
  const antes = conexionEntre(diagramaGuardado, 'Membranas RO', 'TurboCharger');
  assert.deepEqual(antes.ruta, [], 'el fixture debe traer la ruta vieja, si no la prueba no prueba nada');

  const d = reencaminarRetornos(diagramaGuardado);
  const rechazo = conexionEntre(d, 'Membranas RO', 'TurboCharger');
  const alimentacion = conexionEntre(d, 'TurboCharger', 'Membranas RO');
  const turbo = d.nodos.find((n) => n.etiqueta === 'TurboCharger')!;
  const membrana = d.nodos.find((n) => n.etiqueta === 'Membranas RO')!;

  assert.equal(alimentacion.ruta.length, 0, 'la alimentación sigue siendo el tramo recto');
  assert.deepEqual(rechazo.ruta, [
    { x: membrana.x, y: membrana.y - ALTURA_DESVIO },
    { x: turbo.x, y: turbo.y - ALTURA_DESVIO },
  ]);
});

test('no muta el diagrama recibido (el editor guarda lo que el usuario dibujó, no el desvío)', () => {
  const copia = JSON.parse(JSON.stringify(diagramaGuardado));
  reencaminarRetornos(diagramaGuardado);
  assert.deepEqual(diagramaGuardado, copia);
});

test('un diagrama nuevo (ya desviado por el ensamblador) no se vuelve a desviar', () => {
  const nuevo = ensamblar([{ segmento: SEGMENTO_N2 }]);
  assert.deepEqual(reencaminarRetornos(nuevo), nuevo);
});

test('tuberías sueltas (un solo tramo entre dos nodos) no se tocan', () => {
  const d = ensamblar([{ segmento: SEGMENTO_N2 }]);
  const soloIda: DiagramaEquipo = {
    ...d,
    conexiones: d.conexiones.filter((c) => c.tipo === 'alimentacion').map((c) => ({ ...c, ruta: [] })),
  };
  assert.deepEqual(reencaminarRetornos(soloIda), soloIda);
});
