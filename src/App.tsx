// Componente raíz de plant-app-vpn (arranque). Por ahora solo una pantalla de bienvenida con marca +
// selector de idioma, que confirma que el frontend compila y el i18n funciona. El login (pool Staff),
// el app shell y las pantallas (dashboard, editor de perfil, terminal SSH, etc.) se construyen en la
// Fase 6.4–6.6. Ver plant-arquitectura/plan-de-trabajo.md.
import { useTranslation } from 'react-i18next';
import { SelectorIdioma } from './components/SelectorIdioma';

export function App() {
  const { t } = useTranslation();
  return (
    <main className="arranque">
      <SelectorIdioma />
      <div className="arranque__marca">
        IES <span className="acento">Monitor Plant</span>
      </div>
      <p className="arranque__sub">{t('app.subtitulo')}</p>
    </main>
  );
}
