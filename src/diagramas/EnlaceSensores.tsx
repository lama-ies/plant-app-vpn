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
      <MotorDiagrama diagrama={diagrama} soloVistaPrevia />
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
    </div>
  );
}
