// Paso 2 del editor de diagrama: por cada nodo/conexión, elegir qué variable del equipo (si alguna) llena
// cada slot de sensor permitido. Ver spec §6. Sin telemetría real (solo forma + qué está enlazado).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DiagramaEquipo, SensorBinding, TipoSensor } from './tipos';
import { slotsPermitidos, slotsPermitidosConexion } from './reglasSensores';
import { MotorDiagrama } from '../components/MotorDiagrama';

interface Props {
  diagrama: DiagramaEquipo;
  clavesDisponibles: string[];
  onCambiar: (diagrama: DiagramaEquipo) => void;
}

type Ancla = { clase: 'nodo' | 'conexion'; id: string; etiqueta: string; slots: TipoSensor[] };

export function EnlaceSensores({ diagrama, clavesDisponibles, onCambiar }: Props) {
  const { t } = useTranslation();
  const [ancla, setAncla] = useState<Ancla | null>(null);

  const anclas: Ancla[] = [
    ...diagrama.nodos.map((n) => ({ clase: 'nodo' as const, id: n.id, etiqueta: n.etiqueta, slots: slotsPermitidos(n.tipo) })),
    ...diagrama.conexiones.map((c) => ({
      clase: 'conexion' as const, id: c.id, etiqueta: c.etiqueta ?? `${c.desde} → ${c.hasta}`, slots: slotsPermitidosConexion(),
    })),
  ];

  function bindingsDe(a: Ancla): SensorBinding[] {
    if (a.clase === 'nodo') return diagrama.nodos.find((n) => n.id === a.id)?.sensores ?? [];
    return diagrama.conexiones.find((c) => c.id === a.id)?.sensores ?? [];
  }

  function actualizarBinding(a: Ancla, tipo: TipoSensor, variable: string) {
    const nuevoBinding: SensorBinding = { tipo, variable: variable || undefined };
    if (a.clase === 'nodo') {
      onCambiar({
        ...diagrama,
        nodos: diagrama.nodos.map((n) => {
          if (n.id !== a.id) return n;
          const sinTipo = n.sensores.filter((s) => s.tipo !== tipo);
          return { ...n, sensores: variable ? [...sinTipo, nuevoBinding] : sinTipo };
        }),
      });
    } else {
      onCambiar({
        ...diagrama,
        conexiones: diagrama.conexiones.map((c) => {
          if (c.id !== a.id) return c;
          const sinTipo = c.sensores.filter((s) => s.tipo !== tipo);
          return { ...c, sensores: variable ? [...sinTipo, nuevoBinding] : sinTipo };
        }),
      });
    }
  }

  return (
    <div className="enlace-sensores">
      <MotorDiagrama diagrama={diagrama} />
      <ul className="enlace-sensores__lista">
        {anclas.map((a) => (
          <li key={`${a.clase}-${a.id}`}>
            <button type="button" className="enlace-sensores__punto" onClick={() => setAncla(a)}>
              {a.etiqueta}
            </button>
          </li>
        ))}
      </ul>
      {ancla && (
        <div className="enlace-sensores__panel">
          <h3>{ancla.etiqueta}</h3>
          {ancla.slots.map((slot) => {
            const actual = bindingsDe(ancla).find((s) => s.tipo === slot)?.variable ?? '';
            return (
              <label key={slot}>
                {t(`diagramaEditor.sensor.${slot}`)}
                <select value={actual} onChange={(e) => actualizarBinding(ancla, slot, e.target.value)}>
                  <option value="">{t('diagramaEditor.sensorNinguno')}</option>
                  {clavesDisponibles.map((clave) => (
                    <option key={clave} value={clave}>{clave}</option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      )}

      <ResumenSensoresAsignados diagrama={diagrama} />
    </div>
  );
}

/** Resumen de todo lo YA enlazado, agrupado por equipo/tubería — para revisar de un vistazo sin tener que
 * abrir ancla por ancla. Muestra el tag asignado (no hay telemetría real en este editor, ver MotorDiagrama). */
function ResumenSensoresAsignados({ diagrama }: { diagrama: DiagramaEquipo }) {
  const { t } = useTranslation();
  const porId = new Map(diagrama.nodos.map((n) => [n.id, n]));

  const gruposNodo = diagrama.nodos
    .filter((n) => n.sensores.length > 0)
    .map((n) => ({ clave: n.id, etiqueta: n.etiqueta, sensores: n.sensores }));

  const gruposConexion = diagrama.conexiones
    .filter((c) => c.sensores.length > 0)
    .map((c) => {
      const desde = porId.get(c.desde)?.etiqueta ?? c.desde;
      const hasta = porId.get(c.hasta)?.etiqueta ?? c.hasta;
      return { clave: c.id, etiqueta: c.etiqueta || `${desde} → ${hasta}`, sensores: c.sensores };
    });

  const grupos = [...gruposNodo, ...gruposConexion];
  if (grupos.length === 0) return null;

  return (
    <div className="enlace-sensores__resumen">
      <p className="subtitulo-lista">{t('diagramaEditor.resumenTitulo')}</p>
      {grupos.map((g) => (
        <div className="fila-compuesta" key={g.clave}>
          <h4>{g.etiqueta}</h4>
          {g.sensores.map((s, i) => (
            <div className="fila-lectura" key={i}>
              <span className="fila-lectura__etq">{t(`diagramaEditor.sensor.${s.tipo}`)}</span>
              <span className="fila-lectura__valor">{s.variable}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
