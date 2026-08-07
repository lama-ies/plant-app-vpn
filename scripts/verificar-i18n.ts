/**
 * Verificación de i18n en dos ejes. Se corre con `pnpm i18n:check`.
 *
 * Por qué existe: la comprobación de PARIDAD (que los 4 idiomas tengan las mismas claves) no detecta el
 * caso más común de fallo real — una clave que se usa en el código y NO existe en NINGÚN idioma. Como
 * falta en los cuatro a la vez, la paridad la da por buena y `t('x.y')` renderiza el literal "x.y" en
 * pantalla. Pasó dos veces seguidas: `comun.listo` (lo encontró la auditoría del 2026-08-07) y
 * `dashboard.equipos.editarPerfil` (lo encontró el usuario probando la app, el mismo día). TypeScript
 * tampoco ayuda: `t()` acepta cualquier string.
 *
 * Eje 1 — HUÉRFANAS: claves usadas en el código que no existen en es.ts. Rompe el build (exit 1).
 * Eje 2 — PARIDAD: claves que existen en un idioma y faltan en otro. Rompe el build (exit 1).
 *
 * Limitación asumida: solo se analizan las llamadas `t('literal')`. Las claves dinámicas
 * (`t(\`prefijo.${variable}\`)`) no se pueden resolver estáticamente; se listan aparte como aviso para
 * revisarlas a mano.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { es } from '../src/i18n/es';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { pt } from '../src/i18n/pt';

/** Aplana un objeto de traducciones a la lista de rutas "a.b.c". */
function aplanar(obj: unknown, prefijo = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefijo];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    aplanar(v, prefijo ? `${prefijo}.${k}` : k),
  );
}

/** Todos los archivos .ts/.tsx bajo `dir`, recursivo. */
function archivosFuente(dir: string): string[] {
  return readdirSync(dir).flatMap((entrada) => {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) return archivosFuente(ruta);
    return /\.tsx?$/.test(entrada) && !entrada.endsWith('.test.ts') ? [ruta] : [];
  });
}

const idiomas: Record<string, unknown> = { es, en, fr, pt };
const claves = Object.fromEntries(
  Object.entries(idiomas).map(([k, v]) => [k, new Set(aplanar(v).map((c) => c.replace(/^traduccion\./, '')))]),
);

// --- Eje 1: claves usadas en el código que no existen -------------------------------------------------
const usadas = new Map<string, string>(); // clave -> primer archivo donde aparece
const dinamicas = new Set<string>();

// El repo es ESM: no hay `__dirname`, se deriva de import.meta.url.
const raizScript = dirname(fileURLToPath(import.meta.url));

for (const archivo of archivosFuente(join(raizScript, '..', 'src'))) {
  const codigo = readFileSync(archivo, 'utf8');
  for (const m of codigo.matchAll(/\bt\(\s*'([^']+)'/g)) usadas.set(m[1], archivo);
  for (const m of codigo.matchAll(/\bt\(\s*`([^`]*\$\{[^`]*)`/g)) dinamicas.add(m[1]);
}

// i18next resuelve las formas plurales (`_one`/`_other`) desde la clave base: se acepta cualquiera.
const existeEnEs = (clave: string) =>
  claves.es.has(clave) || claves.es.has(`${clave}_one`) || claves.es.has(`${clave}_other`);

const huerfanas = [...usadas.entries()].filter(([clave]) => !existeEnEs(clave));

// --- Eje 2: paridad entre idiomas --------------------------------------------------------------------
const union = new Set(Object.values(claves).flatMap((s) => [...s]));
const desalineadas = [...union]
  .map((c) => ({ clave: c, faltaEn: Object.entries(claves).filter(([, s]) => !s.has(c)).map(([i]) => i) }))
  .filter((d) => d.faltaEn.length > 0);

// --- Reporte -----------------------------------------------------------------------------------------
console.log(`Claves por idioma — es:${claves.es.size} en:${claves.en.size} fr:${claves.fr.size} pt:${claves.pt.size}`);
console.log(`Claves literales usadas en el código: ${usadas.size}`);

if (dinamicas.size > 0) {
  console.log(`\nClaves dinámicas (revisar a mano, no se pueden resolver estáticamente): ${dinamicas.size}`);
  for (const d of dinamicas) console.log(`  t(\`${d}\`)`);
}

let fallo = false;

if (huerfanas.length > 0) {
  fallo = true;
  console.error(`\nHUÉRFANAS — usadas en el código y NO definidas (se renderizan crudas): ${huerfanas.length}`);
  for (const [clave, archivo] of huerfanas) console.error(`  ${clave}   <- ${archivo.replace(/.*[\\/]src[\\/]/, 'src/')}`);
}

if (desalineadas.length > 0) {
  fallo = true;
  console.error(`\nDESALINEADAS entre idiomas: ${desalineadas.length}`);
  for (const d of desalineadas) console.error(`  ${d.clave}  -> falta en ${d.faltaEn.join(', ')}`);
}

if (fallo) process.exit(1);
console.log('\ni18n correcto: sin huérfanas y con los 4 idiomas alineados.');
