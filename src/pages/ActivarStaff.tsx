// Página pública de activación de invitación del personal Staff. Flujo:
//   1) valida el código contra el backend para mostrar el rol al que se une el invitado;
//   2) el invitado elige contraseña;
//   3) registra en Cognito (pool Staff), consume el código (el backend confirma la cuenta) y entra.
// Sin Familia ni aceptación legal (personal interno, no cliente del SaaS). Ver
// plant-arquitectura/15-saas-multitenant.md (nota bajo la sección 6, 2026-07-21).
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/contexto';
import { registrarActivacionStaff } from '../auth/cognito';
import { consumirActivacionStaff, ErrorApi, validarActivacionStaff, type PreviewActivacionStaff } from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import { SelectorIdioma } from '../components/SelectorIdioma';
import './auth.css';

export function ActivarStaff() {
  const { t } = useTranslation();
  const navegar = useNavigate();
  const { iniciarSesion } = useAuth();

  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<PreviewActivacionStaff | null>(null);
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function validar(e: FormEvent) {
    e.preventDefault();
    const limpio = code.trim().toUpperCase();
    if (!limpio) return;
    setError(null);
    setValidando(true);
    try {
      const p = await validarActivacionStaff(limpio);
      setPreview(p);
      setCode(limpio);
    } catch (err) {
      setPreview(null);
      setError(codigoAMensaje(t, err));
    } finally {
      setValidando(false);
    }
  }

  async function activar(e: FormEvent) {
    e.preventDefault();
    if (!preview) return;
    setError(null);
    if (contrasena.length < 8) return setError(t('activarStaff.errorLongitud'));
    if (contrasena !== confirmar) return setError(t('activarStaff.errorCoincide'));

    setEnviando(true);
    try {
      await registrarActivacionStaff(preview.email, contrasena);
      await consumirActivacionStaff(code, preview.email);
      await iniciarSesion(preview.email, contrasena);
      navegar('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ErrorApi ? codigoAMensaje(t, err) : t('activarStaff.errorGenerico'));
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
        <section className="auth-card" aria-labelledby="activar-staff-titulo">
          <h1 id="activar-staff-titulo" className="auth-card__titulo">
            {t('activarStaff.titulo')}
          </h1>

          {!preview ? (
            <>
              <p className="auth-card__sub">{t('activarStaff.subCodigo')}</p>
              <form className="auth-form" onSubmit={validar}>
                <label className="auth-campo">
                  {t('activarStaff.codigo')}
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoComplete="one-time-code"
                    required
                  />
                </label>
                {error && (
                  <p role="alert" className="auth-error">
                    {error}
                  </p>
                )}
                <button className="auth-boton" type="submit" disabled={validando}>
                  {validando ? t('activarStaff.validando') : t('activarStaff.continuar')}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="auth-card__sub">{t('activarStaff.subCrear')}</p>
              <div className="auth-preview">
                <div className="auth-preview__fila">
                  <span className="auth-preview__etq">{t('activarStaff.correo')}</span>
                  <span className="auth-preview__val auth-preview__val--mono">{preview.email}</span>
                </div>
                <div className="auth-preview__fila">
                  <span className="auth-preview__etq">{t('activarStaff.rol')}</span>
                  <span className="auth-preview__val">{t(`rol.${preview.rol}`)}</span>
                </div>
              </div>

              <form className="auth-form" onSubmit={activar}>
                <label className="auth-campo">
                  {t('activarStaff.contrasena')}
                  <input
                    type="password"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label className="auth-campo">
                  {t('activarStaff.confirmar')}
                  <input
                    type="password"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
                {error && (
                  <p role="alert" className="auth-error">
                    {error}
                  </p>
                )}
                <button className="auth-boton" type="submit" disabled={enviando}>
                  {enviando ? t('activarStaff.activando') : t('activarStaff.activar')}
                </button>
              </form>
            </>
          )}

          <div className="auth-pie">
            <Link className="auth-link" to="/login">
              {t('activarStaff.volverLogin')}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
