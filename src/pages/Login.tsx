// Página de inicio de sesión. Autentica contra Cognito (pool STAFF, independiente del portal) vía useAuth;
// al lograrlo redirige al tablero. La validación de credenciales/rol la hace Cognito + el backend, no la UI.
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/contexto';
import { SelectorIdioma } from '../components/SelectorIdioma';
import './auth.css';

export function Login() {
  const { t } = useTranslation();
  const { iniciarSesion, identidad, cargando } = useAuth();
  const navegar = useNavigate();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Multi-pestaña / auto-login: si ya hay sesión (JWT válido en localStorage), entrar directo al tablero.
  if (!cargando && identidad) return <Navigate to="/dashboard" replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(false);
    setEnviando(true);
    try {
      await iniciarSesion(correo, contrasena);
      navegar('/dashboard', { replace: true });
    } catch {
      // No se filtra el detalle del error de Cognito; mensaje genérico de credenciales.
      setError(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="auth">
      <header className="auth__barra">
        <span className="auth__marca">
          IES <span className="auth__acento">Monitor Plant</span>
        </span>
        <SelectorIdioma />
      </header>

      <div className="auth__centro">
        <section className="auth-card" aria-labelledby="login-titulo">
          <h1 id="login-titulo" className="auth-card__titulo">
            {t('login.titulo')}
          </h1>
          <p className="auth-card__sub">{t('login.subtitulo')}</p>

          <form className="auth-form" onSubmit={enviar}>
            <label className="auth-campo">
              {t('login.correo')}
              <input
                type="email"
                name="correo"
                autoComplete="username"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </label>
            <label className="auth-campo">
              {t('login.contrasena')}
              <input
                type="password"
                name="contrasena"
                autoComplete="current-password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
              />
            </label>
            {error && (
              <p role="alert" className="auth-error">
                {t('login.error')}
              </p>
            )}
            <button className="auth-boton" type="submit" disabled={enviando}>
              {enviando ? t('login.entrando') : t('login.entrar')}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
