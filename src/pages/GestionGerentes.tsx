// Agregar Gerentes/miembros a una familia S&O ya existente (Fase 6.6.11), rol Administrador: usa
// Plant_InviteUser, que para el pool Staff permite invitar CUALQUIER rol — incluido otro Gerente peer, algo
// que la matriz normal no permite entre pares (ver nota en el lambda). El correo se envía si SES está
// activo; si no, se muestra el código para compartir manualmente (mismo patrón que GestionUsuarios del
// portal).
import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { invitarMiembroFamilia } from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import './editor-perfil.css';

const ROLES_SO = ['gerente', 'coordinador', 'tecnico'];

export function GestionGerentes() {
  const { t } = useTranslation();
  const [familiaId, setFamiliaId] = useState('');
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('gerente');
  const [zonasTexto, setZonasTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ correoEnviado: boolean; activationCode?: string } | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResultado(null);
    setEnviando(true);
    try {
      const zonaIds = zonasTexto
        .split(',')
        .map((z) => z.trim())
        .filter(Boolean);
      const r = await invitarMiembroFamilia({
        familiaId: familiaId.trim(),
        email: email.trim(),
        nombre: nombre.trim() || undefined,
        rol,
        zonaIds: zonaIds.length ? zonaIds : undefined,
      });
      setResultado(r);
    } catch (err) {
      setError(codigoAMensaje(t, err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="editor">
      <h1 className="editor__titulo">{t('gestionGerentes.titulo')}</h1>
      <p className="editor__sub">{t('gestionGerentes.sub')}</p>

      <form className="seccion" onSubmit={enviar}>
        <div className="rejilla-campos">
          <label className="auth-campo">
            {t('altaCliente.numeroCliente')} / familiaId
            <input type="text" value={familiaId} onChange={(e) => setFamiliaId(e.target.value)} required />
          </label>
          <label className="auth-campo">
            {t('activarStaff.correo')}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="auth-campo">
            {t('altaCliente.ownerNombre')}
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="auth-campo">
            {t('activarStaff.rol')}
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              {ROLES_SO.map((r) => (
                <option key={r} value={r}>
                  {t(`rol.${r}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="auth-campo">
          {t('altaCliente.zonas')}
          <input
            type="text"
            value={zonasTexto}
            onChange={(e) => setZonasTexto(e.target.value)}
            placeholder={t('altaCliente.zonasEjemplo')}
          />
        </label>

        {error && (
          <p className="auth-error" role="alert">
            <AlertTriangle size={15} aria-hidden /> {error}
          </p>
        )}
        {resultado && (
          <p className="auth-ok">
            <CheckCircle2 size={16} aria-hidden />{' '}
            {resultado.correoEnviado
              ? t('gestionGerentes.enviadoOk')
              : t('gestionGerentes.codigoManual', { codigo: resultado.activationCode })}
          </p>
        )}

        <div className="editor__acciones">
          <button type="submit" className="auth-boton" disabled={enviando}>
            <UserPlus size={16} aria-hidden />
            {enviando ? t('gestionGerentes.invitando') : t('gestionGerentes.invitar')}
          </button>
        </div>
      </form>
    </div>
  );
}
