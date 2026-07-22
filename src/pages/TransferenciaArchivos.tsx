// Transferencia de archivos por SFTP (Fase 6.6.6), rol Administrador. Mismo principio que TerminalSSH: el
// host y la huella SSH llegan resueltos por la conexión VPN ya establecida (TarjetaEquipo), nunca se piden.
// Cada operación (listar/subir/descargar) abre su propia sesión SFTP en el núcleo Rust (sftp.rs) — no hay
// una sesión persistida del lado del frontend, solo las credenciales que se reusan en cada llamada.
import { useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowUp, Download, File, Folder, Upload } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import './terminal-ssh.css';

interface EstadoRuta {
  direccionVirtual: string;
  llaveHostEsperada: string | null;
  nombreEquipo?: string;
}

interface EntradaRemota {
  nombre: string;
  esDirectorio: boolean;
  tamanoBytes: number;
}

function uneRuta(base: string, nombre: string): string {
  return base.endsWith('/') ? `${base}${nombre}` : `${base}/${nombre}`;
}

function rutaPadre(ruta: string): string {
  const limpia = ruta.replace(/\/+$/, '');
  const i = limpia.lastIndexOf('/');
  return i <= 0 ? '/' : limpia.slice(0, i);
}

export function TransferenciaArchivos() {
  const { t } = useTranslation();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const estadoRuta = ubicacion.state as EstadoRuta | null;

  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [puerto, setPuerto] = useState(22);
  const [conectado, setConectado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ruta, setRuta] = useState('/');
  const [entradas, setEntradas] = useState<EntradaRemota[]>([]);

  if (!estadoRuta) {
    navegar('/dashboard', { replace: true });
    return null;
  }

  function parametros() {
    return {
      host: estadoRuta!.direccionVirtual,
      puerto,
      usuario,
      contrasena,
      llaveHostEsperada: estadoRuta!.llaveHostEsperada,
    };
  }

  async function listar(rutaAListar: string) {
    setError(null);
    setCargando(true);
    try {
      const r = await invoke<EntradaRemota[]>('sftp_listar', { params: parametros(), ruta: rutaAListar });
      setEntradas(r);
      setRuta(rutaAListar);
      setConectado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCargando(false);
    }
  }

  async function conectar(e: FormEvent) {
    e.preventDefault();
    await listar('/');
  }

  async function descargar(nombre: string) {
    const remoto = uneRuta(ruta, nombre);
    const destino = await save({ defaultPath: nombre });
    if (!destino) return;
    setError(null);
    try {
      await invoke('sftp_descargar', { params: parametros(), rutaRemota: remoto, rutaLocal: destino });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function subir() {
    const seleccion = await open({ multiple: false });
    if (!seleccion || Array.isArray(seleccion)) return;
    const nombreLocal = seleccion.split(/[\\/]/).pop() ?? seleccion;
    setError(null);
    try {
      await invoke('sftp_subir', { params: parametros(), rutaLocal: seleccion, rutaRemota: uneRuta(ruta, nombreLocal) });
      await listar(ruta);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="terminal-ssh">
      <div className="terminal-ssh__cab">
        <span className="terminal-ssh__titulo">{t('transferencia.titulo')}</span>
        <span className="terminal-ssh__host">
          {estadoRuta.nombreEquipo ? `${estadoRuta.nombreEquipo} — ` : ''}
          {estadoRuta.direccionVirtual}
        </span>
      </div>

      {!estadoRuta.llaveHostEsperada && (
        <p className="terminal-ssh__aviso">
          <AlertTriangle size={14} aria-hidden />
          {t('terminalSsh.sinHuella')}
        </p>
      )}

      {!conectado ? (
        <form className="terminal-ssh__login" onSubmit={conectar}>
          <div className="terminal-ssh__login-fila">
            <label className="auth-campo">
              {t('terminalSsh.usuario')}
              <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
            </label>
            <label className="auth-campo">
              {t('terminalSsh.puerto')}
              <input type="number" value={puerto} onChange={(e) => setPuerto(Number(e.target.value) || 22)} />
            </label>
          </div>
          <label className="auth-campo">
            {t('terminalSsh.contrasena')}
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="auth-boton" type="submit" disabled={cargando}>
            {cargando ? t('terminalSsh.conectando') : t('terminalSsh.conectar')}
          </button>
        </form>
      ) : (
        <>
          <div className="sftp__ruta">
            <label className="auth-campo">
              {t('transferencia.ruta')}
              <input type="text" value={ruta} onChange={(e) => setRuta(e.target.value)} />
            </label>
            <button type="button" className="boton-tenue" onClick={() => void listar(ruta)} disabled={cargando}>
              {t('dashboard.buscar')}
            </button>
            <button type="button" className="boton-tenue" onClick={() => void listar(rutaPadre(ruta))} disabled={cargando}>
              <ArrowUp size={15} aria-hidden />
              {t('transferencia.subirNivel')}
            </button>
            <button type="button" className="boton-tenue" onClick={() => void subir()}>
              <Upload size={15} aria-hidden />
              {t('transferencia.subirArchivo')}
            </button>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              <AlertTriangle size={14} aria-hidden /> {error}
            </p>
          )}

          <div className="sftp-lista">
            {entradas.map((entrada) => (
              <div className="sftp-fila" key={entrada.nombre}>
                <span className="sftp-fila__nombre">
                  {entrada.esDirectorio ? <Folder size={15} aria-hidden /> : <File size={15} aria-hidden />}
                  {entrada.esDirectorio ? (
                    <button
                      type="button"
                      className="sftp-fila__nombre--carpeta"
                      onClick={() => void listar(uneRuta(ruta, entrada.nombre))}
                    >
                      {entrada.nombre}
                    </button>
                  ) : (
                    entrada.nombre
                  )}
                </span>
                {!entrada.esDirectorio && (
                  <>
                    <span className="sftp-fila__tamano">{entrada.tamanoBytes.toLocaleString()} B</span>
                    <button type="button" className="icono-boton" title={t('transferencia.descargar')} onClick={() => void descargar(entrada.nombre)}>
                      <Download size={15} aria-hidden />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
