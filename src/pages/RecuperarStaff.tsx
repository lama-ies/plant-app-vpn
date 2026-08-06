// Página pública de recuperación de contraseña del pool Staff (Amplify resetPassword/confirmResetPassword).
// Dos pasos: 1) el usuario pide el código (llega a su correo); 2) introduce el código + la nueva
// contraseña. Mismo patrón que RecuperarContrasena.tsx de plant-portal-client, adaptado al pool Staff.
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { confirmarRecuperacion, solicitarRecuperacion } from '../auth/cognito';
import { Marca } from '../components/Marca';
import { SelectorIdioma } from '../components/SelectorIdioma';
import { mensajeErrorRecuperacion } from '../lib/mensajesAuth';
import './auth.css';

export function RecuperarStaff() {
  const { t } = useTranslation();
  const navegar = useNavigate();

  const [paso, setPaso] = useState<'pedir' | 'confirmar'>('pedir');
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function pedir(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await solicitarRecuperacion(correo.trim().toLowerCase());
      setPaso('confirmar');
    } catch {
      // No revelar si el correo existe (anti-enumeración): pasar al paso 2 igualmente.
      setPaso('confirmar');
    } finally {
      setEnviando(false);
    }
  }

  async function confirmar_(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (contrasena.length < 8) return setError(t('recuperarStaff.errorLongitud'));
    if (contrasena !== confirmar) return setError(t('recuperarStaff.errorCoincide'));
    setEnviando(true);
    try {
      await confirmarRecuperacion(correo.trim().toLowerCase(), codigo.trim(), contrasena);
      navegar('/login', { replace: true });
    } catch (err) {
      // Mensaje específico según el error real de Cognito (código, política de contraseña, red o
      // servidor) — nunca "código expirado" adivinado cuando la causa real fue otra.
      setError(mensajeErrorRecuperacion(t, err));
      setEnviando(false);
    }
  }

  return (
    <main className="auth">
      <header className="auth__barra">
        <Marca />
        <SelectorIdioma />
      </header>

      <div className="auth__centro">
        <section className="auth-card" aria-labelledby="recuperar-staff-titulo">
          <h1 id="recuperar-staff-titulo" className="auth-card__titulo">
            {t('recuperarStaff.titulo')}
          </h1>

          {paso === 'pedir' ? (
            <>
              <p className="auth-card__sub">{t('recuperarStaff.subPedir')}</p>
              <form className="auth-form" onSubmit={pedir}>
                <label className="auth-campo">
                  {t('recuperarStaff.correo')}
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </label>
                <button className="auth-boton" type="submit" disabled={enviando}>
                  {enviando ? t('recuperarStaff.enviando') : t('recuperarStaff.enviarCodigo')}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="auth-card__sub">{t('recuperarStaff.subConfirmar', { correo })}</p>
              <form className="auth-form" onSubmit={confirmar_}>
                <label className="auth-campo">
                  {t('recuperarStaff.codigo')}
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    autoComplete="one-time-code"
                    required
                  />
                </label>
                <label className="auth-campo">
                  {t('recuperarStaff.nueva')}
                  <input
                    type="password"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label className="auth-campo">
                  {t('recuperarStaff.confirmar')}
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
                  {enviando ? t('recuperarStaff.guardando') : t('recuperarStaff.guardar')}
                </button>
                <button className="auth-link" type="button" onClick={() => setPaso('pedir')}>
                  {t('recuperarStaff.reenviar')}
                </button>
              </form>
            </>
          )}

          <div className="auth-pie">
            <Link className="auth-link" to="/login">
              {t('recuperarStaff.volverLogin')}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
