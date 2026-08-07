// Gestión del personal interno de IES (Plant_StaffUsuarios): listar, invitar, editar rol/zonas/estado,
// reenviar invitación pendiente y dar de baja. Hasta 2026-07-31 esta pantalla no existía — el lambda y las
// funciones de api.ts estaban listos pero sin ningún consumidor (hallazgo de la auditoría pre-AWS): no
// había forma de invitar un nuevo gerente/coordinador/técnico staff desde la app, solo por API directa.
// Jerarquía FIJA administrador > gerente > coordinador > técnico (sin Familia, a diferencia de
// GestionGerentes.tsx que invita miembros DE una familia S&O). Zonas: campo de texto libre con IDs
// separados por coma (mismo patrón "interino" que GestionGerentes.tsx/GestionZonas.tsx — un técnico staff
// puede tener zonas de varias familias distintas, no hay un selector de una sola familia que aplique aquí).
// Ver plant-arquitectura/07-app-vpn.md.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Pencil, RefreshCw, Send, Trash2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/contexto';
import { usePermissions } from '../hooks/usePermissions';
import {
  actualizarStaff,
  eliminarStaff,
  invitarStaff,
  listarStaff,
  reenviarInvitacionStaff,
  type UsuarioStaffApi,
} from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import { GotaCargando } from '../components/GotaCargando';
import { Modal } from '../components/Modal';
import { SelectorZonasStaff } from '../components/SelectorZonasStaff';
import './editor-perfil.css';
import './lista.css';

const ROLES_STAFF = ['administrador', 'gerente', 'coordinador', 'tecnico'];
const ESTADO_CSS: Record<string, string> = {
  active: 'activo',
  inactive: 'invitado',
  expired: 'expirado',
  suspended: 'suspendido',
};

export function GestionStaff() {
  const { t } = useTranslation();
  const { identidad } = useAuth();
  const permisos = usePermissions();

  const [usuarios, setUsuarios] = useState<UsuarioStaffApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);
  const [modal, setModal] = useState<'invitar' | { editar: UsuarioStaffApi } | null>(null);
  const [reenviando, setReenviando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const r = await listarStaff();
      setUsuarios(r.usuarios);
    } catch (e) {
      setErrorCarga(codigoAMensaje(t, e));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function eliminar(u: UsuarioStaffApi) {
    if (!window.confirm(t('gestionStaff.confirmarEliminar', { correo: u.email }))) return;
    try {
      await eliminarStaff(u.email);
      await cargar();
    } catch (e) {
      window.alert(codigoAMensaje(t, e));
    }
  }

  async function reenviar(u: UsuarioStaffApi) {
    setMensajeOk(null);
    setReenviando(u.email);
    try {
      await reenviarInvitacionStaff(u.email);
      setMensajeOk(t('gestionStaff.reenviarOk', { correo: u.email }));
      await cargar();
    } catch (e) {
      window.alert(codigoAMensaje(t, e));
    } finally {
      setReenviando(null);
    }
  }

  return (
    <div className="editor">
      <h1 className="editor__titulo">{t('gestionStaff.titulo')}</h1>
      <p className="editor__sub">{t('gestionStaff.sub')}</p>

      <div className="panel-acciones">
        <button className="boton-tenue" type="button" onClick={() => void cargar()} disabled={cargando}>
          <RefreshCw size={16} aria-hidden />
          {t('gestionStaff.recargar')}
        </button>
        {permisos.canGestionStaff && (
          <button className="boton-tenue" type="button" onClick={() => setModal('invitar')}>
            <UserPlus size={16} aria-hidden />
            {t('gestionStaff.invitar')}
          </button>
        )}
      </div>

      {cargando && (
        <p className="vacio">
          <GotaCargando tamano="inline" texto={t('app.cargando')} />
        </p>
      )}
      {errorCarga && (
        <p className="auth-error" role="alert">
          <AlertTriangle size={15} aria-hidden /> {errorCarga}
        </p>
      )}
      {mensajeOk && <p className="auth-ok" role="status">{mensajeOk}</p>}
      {!cargando && !errorCarga && usuarios.length === 0 && <p className="vacio">{t('gestionStaff.sinUsuarios')}</p>}

      {!cargando && !errorCarga && usuarios.length > 0 && (
        <ul className="lista">
          {usuarios.map((u) => (
            <li className="fila-lista" key={u.email}>
              <div className="fila-lista__cab">
                <span className="fila-lista__principal">{u.nombre || u.email}</span>
                <span className={`estado-pill estado-pill--${ESTADO_CSS[u.estado] ?? 'invitado'}`}>
                  {t(`estadoCuenta.${u.estado}`)}
                </span>
              </div>
              <span className="fila-lista__meta">{u.email}</span>
              <span className="fila-lista__detalle">
                {t(`rol.${u.rol}`)}
                {u.zonaIds.length > 0 && ` — ${u.zonaIds.join(', ')}`}
              </span>
              {permisos.canGestionStaff && (
                <div className="tarjeta-equipo__acciones">
                  {(u.estado === 'inactive' || u.estado === 'expired') && (
                    <button
                      type="button"
                      className="icono-boton"
                      title={reenviando === u.email ? t('gestionStaff.reenviando') : t('gestionStaff.reenviar')}
                      disabled={reenviando === u.email}
                      onClick={() => void reenviar(u)}
                    >
                      <Send size={15} aria-hidden />
                    </button>
                  )}
                  <button
                    type="button"
                    className="icono-boton"
                    title={t('gestionStaff.editar')}
                    onClick={() => setModal({ editar: u })}
                  >
                    <Pencil size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="icono-boton icono-boton--peligro"
                    title={t('gestionStaff.eliminar')}
                    disabled={u.email === identidad?.email}
                    onClick={() => void eliminar(u)}
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {modal === 'invitar' && (
        <ModalInvitar
          onCerrar={() => setModal(null)}
          onListo={() => {
            setModal(null);
            void cargar();
          }}
        />
      )}
      {modal && typeof modal === 'object' && (
        <ModalEditar
          usuario={modal.editar}
          propioCorreo={identidad?.email ?? ''}
          onCerrar={() => setModal(null)}
          onListo={() => {
            setModal(null);
            void cargar();
          }}
        />
      )}
    </div>
  );
}

// --- Modal de invitación -----------------------------------------------------------------------------

interface PropsInvitar {
  onCerrar: () => void;
  onListo: () => void;
}

function ModalInvitar({ onCerrar, onListo }: PropsInvitar) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState(ROLES_STAFF[2]); // coordinador por defecto (evita invitar admin sin querer)
  const [zonaIds, setZonaIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Cuando SES no está activo, el backend devuelve el código para compartir manualmente.
  const [manual, setManual] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const r = await invitarStaff({
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
    } catch (e) {
      setError(codigoAMensaje(t, e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={t('gestionStaff.invitarTitulo')} onCerrar={onCerrar}>
      {manual ? (
        <div className="form-modal">
          <p className="auth-card__sub">{t('gestionStaff.codigoManual', { codigo: manual })}</p>
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
              {ROLES_STAFF.map((r) => (
                <option key={r} value={r}>
                  {t(`rol.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="auth-campo">
            {t('altaCliente.zonas')}
            <SelectorZonasStaff valor={zonaIds} onCambiar={setZonaIds} />
          </div>

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
              {enviando ? t('gestionStaff.invitando') : t('gestionStaff.invitar')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// --- Modal de edición --------------------------------------------------------------------------------

interface PropsEditar {
  usuario: UsuarioStaffApi;
  propioCorreo: string;
  onCerrar: () => void;
  onListo: () => void;
}

function ModalEditar({ usuario, propioCorreo, onCerrar, onListo }: PropsEditar) {
  const { t } = useTranslation();
  const [nombre, setNombre] = useState(usuario.nombre ?? '');
  const [rol, setRol] = useState(usuario.rol);
  const [zonaIds, setZonaIds] = useState<string[]>(usuario.zonaIds);
  const [suspendido, setSuspendido] = useState(usuario.estado === 'suspended');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const esUnoMismo = usuario.email === propioCorreo;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await actualizarStaff({
        email: usuario.email,
        nombre: nombre.trim() || undefined,
        rol,
        zonaIds,
        // Solo cambia el estado entre active/suspended (no toca invitaciones inactive/expired) — mismo
        // criterio que GestionUsuarios.tsx del portal.
        estado:
          esUnoMismo || usuario.estado === 'inactive' || usuario.estado === 'expired'
            ? undefined
            : suspendido
              ? 'suspended'
              : 'active',
      });
      onListo();
    } catch (e) {
      setError(codigoAMensaje(t, e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={t('gestionStaff.editarTitulo')} onCerrar={onCerrar}>
      <form className="form-modal" onSubmit={guardar}>
        <p className="auth-card__sub">{usuario.email}</p>
        <label className="auth-campo">
          {t('altaCliente.ownerNombre')}
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="auth-campo">
          {t('activarStaff.rol')}
          <select value={rol} onChange={(e) => setRol(e.target.value)} disabled={esUnoMismo}>
            {ROLES_STAFF.map((r) => (
              <option key={r} value={r}>
                {t(`rol.${r}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="auth-campo">
          {t('altaCliente.zonas')}
          <SelectorZonasStaff valor={zonaIds} onCambiar={setZonaIds} />
        </div>

        {!esUnoMismo && (usuario.estado === 'active' || usuario.estado === 'suspended') && (
          <label className="auth-campo auth-campo--casilla">
            <input type="checkbox" checked={suspendido} onChange={(e) => setSuspendido(e.target.checked)} />
            {t('gestionStaff.suspender')}
          </label>
        )}

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
            {enviando ? t('gestionStaff.guardando') : t('gestionStaff.guardar')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
