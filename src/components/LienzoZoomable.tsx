// Wrapper de zoom/pan para el lienzo del diagrama: botones +/-/centrar, arrastre con clic, scroll de
// mouse/trackpad centrado en el cursor. Ajusta el viewBox del <svg> hijo — ver spec
// 2026-07-30-diagrama-isometrico-design.md §4.3.
import { useRef, useState, type ReactElement, type WheelEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Minus, Scan } from 'lucide-react';
import {
  parsearViewBox, formatearViewBox, zoomCentradoEn, desplazar, pixelesAUnidadesViewBox, limitar, type CajaVista,
} from '../diagramas/zoomIso';

const FACTOR_BOTON = 1.2;
const FACTOR_RUEDA = 1.001;

interface Props {
  viewBoxBase: string;
  children: (viewBoxActual: string) => ReactElement;
}

export function LienzoZoomable({ viewBoxBase, children }: Props) {
  const { t } = useTranslation();
  const [caja, setCaja] = useState<CajaVista>(() => parsearViewBox(viewBoxBase));
  const arrastre = useRef<{ x: number; y: number } | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Caja de CONTENIDO real del diagrama (nunca cambia salvo que cambie viewBoxBase): la vista jamás puede
  // salir de sus límites al acercar, y se centra dentro de ella al alejar más allá de su tamaño real (ver
  // spec §9, algoritmo de "contención" — zoomIso.ts `limitar`).
  const contenido = parsearViewBox(viewBoxBase);

  function centro(c: CajaVista) {
    return { x: c.minX + c.ancho / 2, y: c.minY + c.alto / 2 };
  }

  function zoomBoton(factor: number) {
    const { x, y } = centro(caja);
    setCaja((actual) => limitar(zoomCentradoEn(actual, factor, x, y), contenido));
  }

  function centrar() {
    setCaja(contenido);
  }

  function onWheel(e: WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const rect = contenedorRef.current!.getBoundingClientRect();
    const puntoX = caja.minX + ((e.clientX - rect.left) / rect.width) * caja.ancho;
    const puntoY = caja.minY + ((e.clientY - rect.top) / rect.height) * caja.alto;
    const factor = FACTOR_RUEDA ** -e.deltaY;
    setCaja((actual) => limitar(zoomCentradoEn(actual, factor, puntoX, puntoY), contenido));
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    arrastre.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!arrastre.current) return;
    const rect = contenedorRef.current!.getBoundingClientRect();
    const deltaXPx = e.clientX - arrastre.current.x;
    const deltaYPx = e.clientY - arrastre.current.y;
    arrastre.current = { x: e.clientX, y: e.clientY };
    const deltaX = pixelesAUnidadesViewBox(deltaXPx, caja.ancho, rect.width);
    const deltaY = pixelesAUnidadesViewBox(deltaYPx, caja.alto, rect.height);
    setCaja((actual) => limitar(desplazar(actual, deltaX, deltaY), contenido));
  }

  function onPointerUp() {
    arrastre.current = null;
  }

  return (
    <div
      ref={contenedorRef}
      className="lienzo-zoomable"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {children(formatearViewBox(caja))}
      <div className="lienzo-zoomable__controles">
        <button type="button" onClick={() => zoomBoton(FACTOR_BOTON)} aria-label={t('diagramaEditor.zoom.acercar')}>
          <Plus size={16} aria-hidden />
        </button>
        <button type="button" onClick={() => zoomBoton(1 / FACTOR_BOTON)} aria-label={t('diagramaEditor.zoom.alejar')}>
          <Minus size={16} aria-hidden />
        </button>
        <button type="button" onClick={centrar} aria-label={t('diagramaEditor.zoom.centrar')}>
          <Scan size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
