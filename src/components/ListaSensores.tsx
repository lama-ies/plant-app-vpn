// Lista de sensores del diagrama, agrupada por el equipo/tubería al que pertenecen — complementa el dibujo
// con un formato de lectura más rápido (sin tener que ubicar cada badge dentro del SVG). Es el mismo dato
// que ya se ve en el diagrama: recibe las lecturas ya resueltas contra el perfil real, no las vuelve a
// pedir. Agnóstico del tipo de planta: solo agrupa lo que la plantilla describe.
//
// Portado de plant-portal-client (2026-08-07) para que la vista de planta de la app de escritorio muestre
// exactamente lo mismo que el portal — mismo dato, misma lectura.
import type { DiagramaEquipo } from '../diagramas/tipos';
import type { Lectura } from './MotorDiagrama';
import './lista-sensores.css';

interface Grupo {
  clave: string;
  etiqueta: string;
  lecturas: Lectura[];
}

interface Props {
  diagrama: DiagramaEquipo;
  lecturas: Lectura[];
}

export function ListaSensores({ diagrama, lecturas }: Props) {
  const porClave = new Map(lecturas.map((l) => [l.clave, l]));
  const porId = new Map(diagrama.nodos.map((n) => [n.id, n]));

  const lecturasDe = (sensores: { variable?: string | null }[]): Lectura[] =>
    sensores.map((s) => (s.variable ? porClave.get(s.variable) : undefined)).filter((l): l is Lectura => !!l);

  const gruposNodo: Grupo[] = diagrama.nodos
    .map((n) => ({ clave: n.id, etiqueta: n.etiqueta, lecturas: lecturasDe(n.sensores) }))
    .filter((g) => g.lecturas.length > 0);

  // Una tubería sin etiqueta propia se nombra por sus extremos ("Bomba → Membranas"), que es como el
  // operador la identifica en el dibujo.
  const gruposConexion: Grupo[] = diagrama.conexiones
    .map((c) => {
      const desde = porId.get(c.desde)?.etiqueta ?? c.desde;
      const hasta = porId.get(c.hasta)?.etiqueta ?? c.hasta;
      return { clave: c.id, etiqueta: c.etiqueta || `${desde} → ${hasta}`, lecturas: lecturasDe(c.sensores) };
    })
    .filter((g) => g.lecturas.length > 0);

  const grupos = [...gruposNodo, ...gruposConexion];
  if (grupos.length === 0) return null;

  return (
    <div className="lista-sensores">
      {grupos.map((g) => (
        <div className="lista-sensores__grupo" key={g.clave}>
          <h3 className="lista-sensores__titulo">{g.etiqueta}</h3>
          {g.lecturas.map((l) => (
            <div className="fila-lectura" key={l.clave}>
              <span className="fila-lectura__etq">{l.etiqueta}</span>
              <span className="fila-lectura__valor">
                {l.valor}
                {l.unidad && <span className="fila-lectura__unidad">{l.unidad}</span>}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
