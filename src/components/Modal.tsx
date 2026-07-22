// Modal accesible reutilizable (diálogo centrado con overlay). Cierra con Escape, clic fuera o el botón X.
// Bloquea el scroll del fondo mientras está abierto y atrapa el foco dentro (Tab/Shift+Tab), devolviéndolo
// a quien lo abrió al cerrar. Sin dependencias externas. Mismo patrón que plant-portal-client/Modal.tsx.
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './modal.css';

interface Props {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}

const SELECTOR_ENFOCABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ titulo, onCerrar, children }: Props) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const disparador = document.activeElement as HTMLElement | null;

    const primero = panel?.querySelector<HTMLElement>(SELECTOR_ENFOCABLE);
    (primero ?? panel)?.focus();

    function alTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCerrar();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const enfocables = Array.from(panel.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE));
      if (enfocables.length === 0) return;
      const inicio = enfocables[0];
      const fin = enfocables[enfocables.length - 1];
      if (e.shiftKey && document.activeElement === inicio) {
        e.preventDefault();
        fin.focus();
      } else if (!e.shiftKey && document.activeElement === fin) {
        e.preventDefault();
        inicio.focus();
      }
    }

    document.addEventListener('keydown', alTecla);
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alTecla);
      document.body.style.overflow = previo;
      disparador?.focus();
    };
  }, [onCerrar]);

  return (
    <div className="modal-overlay" onMouseDown={onCerrar}>
      <div
        ref={panelRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal__cab">
          <h2 className="modal__titulo">{titulo}</h2>
          <button type="button" className="modal__cerrar" onClick={onCerrar} aria-label={t('comun.cerrar')}>
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="modal__cuerpo">{children}</div>
      </div>
    </div>
  );
}
