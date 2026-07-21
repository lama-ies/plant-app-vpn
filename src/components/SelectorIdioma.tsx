// Selector de idioma (es/en/fr/pt). Cambia y persiste el idioma activo. Sin texto embebido.
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { cambiarIdioma, IDIOMAS, type Idioma } from '../i18n';

export function SelectorIdioma() {
  const { t, i18n } = useTranslation();
  return (
    <label className="selector-idioma">
      <Languages size={16} aria-hidden />
      <span className="sr-only">{t('idioma.etiqueta')}</span>
      <select
        value={i18n.language}
        onChange={(e) => cambiarIdioma(e.target.value as Idioma)}
        aria-label={t('idioma.etiqueta')}
      >
        {IDIOMAS.map((id) => (
          <option key={id} value={id}>
            {t(`idioma.${id}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
