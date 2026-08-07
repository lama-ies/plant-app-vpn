// Motor único de gráficas: dibuja CUALQUIER plantilla de gráfica (1+ variables agrupadas por escala) sin
// conocer el tipo de planta — solo recibe las claves a graficar (`PlantillaGrafica` del perfil) y el
// historial ya resuelto por variable. SVG puro, sin librería externa, igual que MotorDiagrama.
//
// El motor no sabe de dónde salió el historial: la página (VistaPlanta) lo trae de Plant_Telemetria vía
// `obtenerHistorialTelemetria` + `serieDeVariable` y se lo pasa ya normalizado.
//
// Portado de plant-portal-client (2026-08-07) sin cambios de render, incluidos los dos arreglos que ya
// tenía: el eje X se escala por la serie MÁS LARGA (no por `series[0]`, que podía venir vacía) y cada
// polilínea se reparte sobre SU propia cantidad de puntos (dos variables del mismo grupo pueden haber
// reportado distinta cantidad de veces en la misma ventana).
import { useTranslation } from 'react-i18next';
import type { PlantillaGrafica } from '../perfiles/tipos';
import type { PuntoHistorial } from '../lib/api';
import type { Lectura } from './MotorDiagrama';
import './motor-graficas.css';

// Márgenes fijos del lienzo (dejan espacio para las etiquetas de los ejes).
const ANCHO = 400;
const ALTO = 170;
const MARGEN = { izq: 36, der: 10, arriba: 10, abajo: 20 };
const ANCHO_UTIL = ANCHO - MARGEN.izq - MARGEN.der;
const ALTO_UTIL = ALTO - MARGEN.arriba - MARGEN.abajo;
const LINEAS_REJILLA = 4;

/** Hora corta localizada para las marcas del eje X. */
function horaCorta(iso: string, lang: string): string {
  return new Date(iso).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  grafica: PlantillaGrafica;
  lecturas: Lectura[];
  historialPorClave: Record<string, PuntoHistorial[]>;
}

export function MotorGraficas({ grafica, lecturas, historialPorClave }: Props) {
  const { t, i18n } = useTranslation();

  // Una serie por variable: puntos históricos + metadatos (etiqueta/unidad) para la leyenda.
  const series = grafica.variables.map((clave, i) => {
    const meta = lecturas.find((l) => l.clave === clave);
    return {
      clave,
      etiqueta: meta?.etiqueta ?? clave,
      unidad: meta?.unidad ?? '',
      indiceColor: i % 4,
      puntos: historialPorClave[clave] ?? [],
    };
  });

  const todosLosValores = series.flatMap((s) => s.puntos.map((p) => p.valor));

  // Sin puntos todavía (primera carga, o rango sin datos reportados): se evita calcular ejes con
  // Infinity/NaN (Math.min/max de un arreglo vacío) y se muestra un estado vacío simple.
  if (todosLosValores.length === 0) {
    return (
      <div className="motor-graficas">
        <h3 className="motor-graficas__titulo">{grafica.titulo}</h3>
        <p className="vacio">{t('vistaPlanta.sinDatos')}</p>
      </div>
    );
  }

  const minCrudo = Math.min(...todosLosValores);
  const maxCrudo = Math.max(...todosLosValores);
  // Colchón del 10% (o ±1 si la serie es plana) para que la línea no toque los bordes del lienzo.
  const colchon = (maxCrudo - minCrudo) * 0.1 || 1;
  const min = minCrudo - colchon;
  const max = maxCrudo + colchon;

  const n = Math.max(...series.map((s) => s.puntos.length));
  /** X del punto `i` de una serie de `total` puntos, repartida sobre todo el ancho útil. */
  const xEn = (i: number, total: number) => MARGEN.izq + (total <= 1 ? 0 : (i / (total - 1)) * ANCHO_UTIL);
  const x = (i: number) => xEn(i, n);
  // Serie de referencia para las etiquetas de tiempo del eje X: la primera que realmente tenga puntos.
  const serieEjeX = series.find((s) => s.puntos.length > 0);
  const y = (valor: number) => MARGEN.arriba + (1 - (valor - min) / (max - min)) * ALTO_UTIL;

  // ID único del resumen accesible (varias gráficas conviven en la misma página).
  const idResumen = `motor-graficas-resumen-${grafica.id}`;

  return (
    <div className="motor-graficas">
      <h3 className="motor-graficas__titulo">{grafica.titulo}</h3>
      {/* Sin role="img": un SVG de trazos no tiene texto real que leer, así que se describe con un resumen
          textual oculto visualmente. */}
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="motor-graficas__lienzo" aria-describedby={idResumen}>
        {/* Rejilla horizontal + etiquetas del eje Y (escala compartida por todas las series del grupo). */}
        {Array.from({ length: LINEAS_REJILLA + 1 }, (_, i) => {
          const valor = min + (i / LINEAS_REJILLA) * (max - min);
          const yPos = y(valor);
          return (
            <g key={i}>
              <line x1={MARGEN.izq} y1={yPos} x2={ANCHO - MARGEN.der} y2={yPos} className="motor-graficas__rejilla" />
              <text x={MARGEN.izq - 6} y={yPos} className="motor-graficas__eje-y" textAnchor="end" dominantBaseline="middle">
                {valor.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Marcas del eje X: inicio, mitad y fin del rango. Se deduplican porque con 1 o 2 puntos los tres
            índices colapsan y generarían `key` repetidas. */}
        {serieEjeX &&
          [...new Set([0, Math.floor((n - 1) / 2), n - 1])]
            .filter((i) => i >= 0 && serieEjeX.puntos[i])
            .map((i) => (
              <text key={serieEjeX.puntos[i].timestamp} x={x(i)} y={ALTO - 4} className="motor-graficas__eje-x" textAnchor="middle">
                {horaCorta(serieEjeX.puntos[i].timestamp, i18n.language)}
              </text>
            ))}

        {/* Una polilínea por serie, cada una escalada por SU propia cantidad de puntos. */}
        {series
          .filter((s) => s.puntos.length > 0)
          .map((s) => (
            <polyline
              key={s.clave}
              className={`motor-graficas__serie motor-graficas__serie--${s.indiceColor}`}
              points={s.puntos.map((p, i) => `${xEn(i, s.puntos.length)},${y(p.valor)}`).join(' ')}
            />
          ))}
      </svg>

      {/* Resumen textual (solo lectores de pantalla): rango + último valor de cada serie. Las series sin
          puntos se omiten — Math.min() de un arreglo vacío hace que se lea "de Infinity a -Infinity". */}
      <p id={idResumen} className="sr-only">
        {t('vistaPlanta.resumenTitulo', { titulo: grafica.titulo })}{' '}
        {series
          .filter((s) => s.puntos.length > 0)
          .map((s) => {
            const valores = s.puntos.map((p) => p.valor);
            return t('vistaPlanta.resumenSerie', {
              etiqueta: s.etiqueta,
              unidad: s.unidad,
              minimo: Math.min(...valores),
              maximo: Math.max(...valores),
              ultimo: s.puntos[s.puntos.length - 1]?.valor,
            });
          })
          .join(' ')}
      </p>

      {/* Leyenda: color + etiqueta + unidad de cada serie. */}
      <div className="motor-graficas__leyenda">
        {series.map((s) => (
          <span key={s.clave} className="motor-graficas__leyenda-item">
            <span className={`motor-graficas__punto motor-graficas__punto--${s.indiceColor}`} aria-hidden />
            {s.etiqueta}
            {s.unidad && ` (${s.unidad})`}
          </span>
        ))}
      </div>
    </div>
  );
}
