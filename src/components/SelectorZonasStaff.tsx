// Selector de zonas de TODAS las familias, con checkboxes agrupados por familia — reemplaza el campo de
// texto libre de IDs separados por coma en GestionStaff.tsx. Un miembro del staff (técnico/coordinador/
// gerente) puede tener zonas de varias familias distintas (no hay una sola familia "dueña" de esta
// pantalla, a diferencia de GestionGerentes.tsx), así que se listan todas. Esto afecta qué clientes puede
// ver ese miembro del staff — un selector visual evita asignar la zona equivocada por un ID mal tecleado
// que no se puede verificar a simple vista.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listarFamilias, listarZonas, type FamiliaApi, type ZonaApi } from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import { GotaCargando } from './GotaCargando';
import './selectorZonasStaff.css';

interface PropiedadesSelectorZonasStaff {
  valor: string[];
  onCambiar: (zonaIds: string[]) => void;
}

export function SelectorZonasStaff({ valor, onCambiar }: PropiedadesSelectorZonasStaff) {
  const { t } = useTranslation();
  const [familias, setFamilias] = useState<FamiliaApi[] | null>(null);
  const [zonasPorFamilia, setZonasPorFamilia] = useState<Record<string, ZonaApi[]>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const { familias: lista } = await listarFamilias();
        if (!activo) return;
        setFamilias(lista);
        // Universo modesto (mismo criterio que Filtros.tsx): se resuelven las zonas de TODAS las familias
        // de una vez, no bajo demanda por familia — así el nombre real de una zona ya asignada se ve de
        // inmediato al abrir el editor, sin tener que expandir cada familia primero.
        const entradas = await Promise.all(
          lista.map(async (f) => [f.familiaId, (await listarZonas(f.familiaId)).zonas] as const),
        );
        if (!activo) return;
        setZonasPorFamilia(Object.fromEntries(entradas));
      } catch (e) {
        if (activo) setError(codigoAMensaje(t, e));
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [t]);

  function alternar(zonaId: string) {
    onCambiar(valor.includes(zonaId) ? valor.filter((z) => z !== zonaId) : [...valor, zonaId]);
  }

  if (cargando) {
    return (
      <p className="vacio">
        <GotaCargando tamano="inline" texto={t('app.cargando')} />
      </p>
    );
  }
  if (error) {
    return (
      <p className="auth-error" role="alert">
        {error}
      </p>
    );
  }

  const familiasConZonas = (familias ?? []).filter((f) => (zonasPorFamilia[f.familiaId] ?? []).length > 0);

  return (
    <div className="selector-zonas-staff">
      {familiasConZonas.length === 0 ? (
        <p className="vacio">{t('selectorZonasStaff.sinZonas')}</p>
      ) : (
        familiasConZonas.map((f) => (
          <fieldset className="selector-zonas-staff__familia" key={f.familiaId}>
            <legend>
              {f.nombre} ({f.numeroCliente})
            </legend>
            {(zonasPorFamilia[f.familiaId] ?? []).map((z) => (
              <label key={z.zonaId} className="selector-zonas-staff__opcion">
                <input type="checkbox" checked={valor.includes(z.zonaId)} onChange={() => alternar(z.zonaId)} />
                {z.nombre}
              </label>
            ))}
          </fieldset>
        ))
      )}
    </div>
  );
}
