// Spinner de carga con forma de gota de agua (mismo motivo visual que el logo, ver Marca.tsx). El
// contorno queda fijo y un "oleaje" interno recortado a la silueta de la gota sube y baja en bucle,
// simulando que se llena de agua. Dos tamaños: "pantalla" (grande, con etiqueta debajo, para pantallas
// completas) e "inline" (chico, junto a un texto corto en listas/paneles).
import { useId } from 'react';
import './gotaCargando.css';

interface PropiedadesGotaCargando {
  texto?: string;
  tamano?: 'pantalla' | 'inline';
}

const CONTORNO_GOTA =
  'M20 2C20 2 5 21 5 35.5C5 45.16 11.72 53 20 53C28.28 53 35 45.16 35 35.5C35 21 20 2 20 2Z';

export function GotaCargando({ texto, tamano = 'pantalla' }: PropiedadesGotaCargando) {
  const recorteId = useId();

  return (
    <span className={`gota-cargando gota-cargando--${tamano}`} role="status" aria-live="polite">
      <svg className="gota-cargando__svg" viewBox="0 0 40 56" aria-hidden="true">
        <defs>
          <clipPath id={recorteId}>
            <path d={CONTORNO_GOTA} />
          </clipPath>
        </defs>
        <path className="gota-cargando__contorno" d={CONTORNO_GOTA} />
        <g clipPath={`url(#${recorteId})`}>
          <rect className="gota-cargando__ola" x="0" y="0" width="40" height="56" />
        </g>
      </svg>
      {texto && <span className="gota-cargando__texto">{texto}</span>}
    </span>
  );
}
