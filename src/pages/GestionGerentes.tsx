// Agregar Gerentes/miembros a una familia S&O ya existente (Fase 6.6.11), rol Administrador: usa
// Plant_InviteUser, que para el pool Staff permite invitar CUALQUIER rol — incluido otro Gerente peer, algo
// que la matriz normal no permite entre pares (ver nota en el lambda). El correo se envía si SES está
// activo; si no, se muestra el código para compartir manualmente (mismo patrón que GestionUsuarios del
// portal).
//
// Lista + Resend + Cancel (2026-07-31, cierre de hallazgo de auditoría): hasta ahora esta pantalla era un
// formulario de un solo disparo, sin lista — si la invitación vencía o el correo se tecleaba mal, Staff no
// tenía NINGÚN camino para reenviarla ni cancelarla, y reintentar con el mismo correo daba un 409 duro
// (USUARIO_ALREADY_EXISTS) sin salida. Se cerró en 3 capas: Plant_InviteUser ahora tolera reintentar sobre
// una fila pendiente (reemplaza en vez de fallar); Plant_ListUsers/Plant_ResendInvitation/Plant_RemoveUser
// ahora aceptan identidad Staff además de Portal (mismo privilegio de blanket authority que ya tenía
// Plant_InviteUser). Se busca por familiaId (no hay listado global de familias con miembros, mismo criterio
// que Auditoria.tsx) — al buscar se ve la familia completa y desde ahí se invita/reenvía/cancela. La
// familia se elige de una lista filtrable (SelectorFamilia, acotada a tipo "so" — esta pantalla es
// exclusiva de familias S&O), en vez de pegar el familiaId a mano.
import { useCallback, useState, type FormEvent } from 'react';
import { AlertTriangle, Send, Trash2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  eliminarUsuarioFamilia,
  invitarMiembroFamilia,
  listarUsuariosFamilia,
  reenviarInvitacionFamilia,
  type UsuarioFamiliaApi,
} from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import { GotaCargando } from '../components/GotaCargando';
import { Modal } from '../components/Modal';
import { SelectorFamilia } from '../components/SelectorFamilia';
import './editor-perfil.css';
import './lista.css';

const ROLES_SO = ['gerente', 'coordinador', 'tecnico'];
const ESTADO_CSS: Record<string, string> = {
  active: 'activo',
  inactive: 'invitado',
  expired: 'expirado',
  suspended: 'suspendido',
};

export function GestionGerentes() {
  const { t } = useTranslation();
  const [familiaId, setFamiliaId] = useState('');
  const [buscada, setBuscada] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioFamiliaApi[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState<string | null>(null);
  const [modalInvitar, setModalInvitar] = useState(false);

  const buscar = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setCargando(true);
    setErrorCarga(null);
    setMensajeOk(null);
    try {
      const r = await listarUsuariosFamilia(id.trim());
      setUsuarios(r.usuarios);
      setBuscada(id.trim());
    } catch (e) {
      setErrorCarga(codigoAMensaje(t, e));
      setUsuarios([]);
      setBuscada(null);
    } finally {
      setCargando(false);
    }
  }, [t]);

  async function reenviar(u: UsuarioFamiliaApi) {
    if (!buscada) return;
    setMensajeOk(null);
    setReenviando(u.email);
    try {
      await reenviarInvitacionFamilia(buscada, u.email);
      setMensajeOk(t('gestionGerentes.reenviarOk', { correo: u.email }));
      await buscar(buscada);
    } catch (e) {
      window.alert(codigoAMensaje(t, e));
    } finally {
      setReenviando(null);
    }
  }

  async function eliminar(u: UsuarioFamiliaApi) {
    if (!buscada) return;
    if (!window.confirm(t('gestionGerentes.confirmarEliminar', { correo: u.email }))) return;
    try {
      await eliminarUsuarioFamilia(buscada, u.email);
      await buscar(buscada);
    } catch (e) {
      window.alert(codigoAMensaje(t, e));
    }
  }

  return (
    <div className="editor">
      <h1 className="editor__titulo">{t('gestionGerentes.titulo')}</h1>
      <p className="editor__sub">{t('gestionGerentes.sub')}</p>

      <SelectorFamilia
        valor={familiaId}
        tipo="so"
        onSeleccionar={(f) => {
          setFamiliaId(f.familiaId);
          void buscar(f.familiaId);
        }}
      />
      {cargando && (
        <p className="vacio">
          <GotaCargando tamano="inline" texto={t('gestionGerentes.buscando')} />
        </p>
      )}
      <div className="panel-acciones">
        {buscada && (
          <button type="button" className="boton-tenue" onClick={() => setModalInvitar(true)}>
            <UserPlus size={16} aria-hidden />
            {t('gestionGerentes.invitar')}
          </button>
        )}
      </div>

      {errorCarga && (
        <p className="auth-error" role="alert">
          <AlertTriangle size={15} aria-hidden /> {errorCarga}
        </p>
      )}
      {mensajeOk && <p className="auth-ok" role="status">{mensajeOk}</p>}

      {buscada && !errorCarga && usuarios.length === 0 && !cargando && (
        <p className="vacio">{t('gestionGerentes.sinUsuarios')}</p>
      )}

      {buscada && usuarios.length > 0 && (
        <ul className="lista">
          {usuarios.map((u) => (
            <li className="fila-lista" key={u.email}>
              <div className="fila-lista__cab">
                <span className="fila-lista__principal">{u.nombre || u.email}</span>
                <span className={`estado-pill estado-pill--${ESTADO_CSS[u.status] ?? 'invitado'}`}>
                  {t(`estadoCuenta.${u.status}`)}
                </span>
              </div>
              <span className="fila-lista__meta">{u.email}</span>
              <span className="fila-lista__detalle">
                {t(`rol.${u.rol}`)}
                {u.zonaIds && u.zonaIds.length > 0 && ` — ${u.zonaIds.join(', ')}`}
              </span>
              <div className="tarjeta-equipo__acciones">
                {(u.status === 'inactive' || u.status === 'expired') && (
                  <button
                    type="button"
                    className="icono-boton"
                    title={reenviando === u.email ? t('gestionGerentes.reenviando') : t('gestionGerentes.reenviar')}
                    disabled={reenviando === u.email}
                    onClick={() => void reenviar(u)}
                  >
                    <Send size={15} aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  className="icono-boton icono-boton--peligro"
                  title={t('gestionGerentes.eliminar')}
                  onClick={() => void eliminar(u)}
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalInvitar && buscada && (
        <ModalInvitar
          familiaId={buscada}
          onCerrar={() => setModalInvitar(false)}
          onListo={() => {
            setModalInvitar(false);
            void buscar(buscada);
          }}
        />
      )}
    </div>
  );
}

// --- Modal de invitación -----------------------------------------------------------------------------

interface PropsInvitar {
  familiaId: string;
  onCerrar: () => void;
  onListo: () => void;
}

function ModalInvitar({ familiaId, onCerrar, onListo }: PropsInvitar) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('gerente');
  const [zonasTexto, setZonasTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cuando SES no está activo, el backend devuelve el código para compartir manualmente.
  const [manual, setManual] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const zonaIds = zonasTexto
        .split(',')
        .map((z) => z.trim())
        .filter(Boolean);
      const r = await invitarMiembroFamilia({
        familiaId,
        email: email.trim().toLowerCase(),
        nombre: nombre.trim() || undefined,
        rol,
        zonaIds: zonaIds.length ? zonaIds : undefined,
      });
      if (!r.correoEnviado && r.activationCode) {
        setManual(r.activationCode);
      } else {
        onListo();
      }
    } catch (err) {
      setError(codigoAMensaje(t, err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={t('gestionGerentes.invitarTitulo')} onCerrar={onCerrar}>
      {manual ? (
        <div className="form-modal">
          <p className="auth-card__sub">{t('gestionGerentes.codigoManual', { codigo: manual })}</p>
          <div className="form-modal__pie">
            <button type="button" className="auth-boton" onClick={onListo}>
              {t('comun.listo')}
            </button>
          </div>
        </div>
      ) : (
        <form className="form-modal" onSubmit={enviar}>
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
              {error}
            </p>
          )}
          <div className="form-modal__pie">
            <button type="button" className="boton-tenue" onClick={onCerrar}>
              {t('comun.cancelar')}
            </button>
            <button type="submit" className="auth-boton" disabled={enviando}>
              {enviando ? t('gestionGerentes.invitando') : t('gestionGerentes.invitar')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
