// Configuración de i18next para plant-app-vpn. Registra los 4 idiomas del producto (es/en/fr/pt), con
// español por defecto y detección simple por el idioma del sistema. Namespace 'traduccion'.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { es } from './es';
import { en } from './en';
import { fr } from './fr';
import { pt } from './pt';

export const IDIOMAS = ['es', 'en', 'fr', 'pt'] as const;
export type Idioma = (typeof IDIOMAS)[number];

// Toma el idioma guardado por el usuario o el del sistema; cae a 'es' si no está soportado.
function idiomaInicial(): Idioma {
  const guardado = localStorage.getItem('idioma');
  if (guardado && (IDIOMAS as readonly string[]).includes(guardado)) return guardado as Idioma;
  const sistema = navigator.language.slice(0, 2);
  return (IDIOMAS as readonly string[]).includes(sistema) ? (sistema as Idioma) : 'es';
}

void i18n.use(initReactI18next).init({
  resources: { es, en, fr, pt },
  lng: idiomaInicial(),
  fallbackLng: 'es',
  defaultNS: 'traduccion',
  interpolation: { escapeValue: false },
});

/** Cambia el idioma activo y lo persiste para próximas sesiones. */
export function cambiarIdioma(idioma: Idioma): void {
  void i18n.changeLanguage(idioma);
  localStorage.setItem('idioma', idioma);
}

export default i18n;
