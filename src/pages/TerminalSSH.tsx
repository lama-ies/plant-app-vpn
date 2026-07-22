// Terminal SSH embebida (Fase 6.6.5), rol Administrador. La IP del host y la huella SSH esperada llegan
// desde la conexión VPN ya establecida (TarjetaEquipo -> conectarVpn -> Plant_PCs) — nunca se le piden al
// técnico. Solo pide usuario/contraseña del sistema operativo de la PC de sitio (no son credenciales
// Cognito). Usa xterm.js sobre los eventos que emite el núcleo Rust (`ssh.rs`).
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import './terminal-ssh.css';

interface EstadoRuta {
  direccionVirtual: string;
  llaveHostEsperada: string | null;
  nombreEquipo?: string;
}

export function TerminalSSH() {
  const { t } = useTranslation();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const estadoRuta = ubicacion.state as EstadoRuta | null;

  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [puerto, setPuerto] = useState(22);
  const [conectando, setConectando] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sesionIdRef = useRef(crypto.randomUUID());
  const contenedorRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const desuscriptoresRef = useRef<UnlistenFn[]>([]);

  // Sin datos de conexión (llegada directa a la ruta, sin pasar por TarjetaEquipo): no hay nada que hacer.
  useEffect(() => {
    if (!estadoRuta) navegar('/dashboard', { replace: true });
  }, [estadoRuta, navegar]);

  // Limpieza al desmontar: cierra la sesión SSH del lado Rust, desuscribe los eventos y libera la terminal.
  useEffect(() => {
    const sesionId = sesionIdRef.current;
    const desuscriptores = desuscriptoresRef.current;
    return () => {
      void invoke('ssh_cerrar', { sesionId });
      for (const desuscribir of desuscriptores) desuscribir();
      terminalRef.current?.dispose();
      terminalRef.current = null;
    };
  }, []);

  async function conectar(e: FormEvent) {
    e.preventDefault();
    if (!estadoRuta || !contenedorRef.current) return;
    setError(null);
    setConectando(true);
    const sesionId = sesionIdRef.current;

    try {
      const term = new Terminal({ convertEol: true, fontFamily: 'var(--fuente-datos)', fontSize: 13 });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(contenedorRef.current);
      fit.fit();
      terminalRef.current = term;

      const desuscribirDatos = await listen<number[]>(`ssh-datos-${sesionId}`, (evento) => {
        term.write(Uint8Array.from(evento.payload));
      });
      const desuscribirCierre = await listen(`ssh-cerrado-${sesionId}`, () => {
        setConectado(false);
        term.write('\r\n\x1b[33m[conexión cerrada]\x1b[0m\r\n');
      });
      desuscriptoresRef.current.push(desuscribirDatos, desuscribirCierre);
      term.onData((datos) => void invoke('ssh_enviar', { sesionId, datos }));

      await invoke('ssh_conectar', {
        params: {
          sesionId,
          host: estadoRuta.direccionVirtual,
          puerto,
          usuario,
          contrasena,
          llaveHostEsperada: estadoRuta.llaveHostEsperada,
        },
      });

      setConectado(true);
      const alRedimensionar = () => fit.fit();
      window.addEventListener('resize', alRedimensionar);
      desuscriptoresRef.current.push(() => window.removeEventListener('resize', alRedimensionar));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      terminalRef.current?.dispose();
      terminalRef.current = null;
    } finally {
      setConectando(false);
    }
  }

  if (!estadoRuta) return null;

  return (
    <div className="terminal-ssh">
      <div className="terminal-ssh__cab">
        <span className="terminal-ssh__titulo">{t('terminalSsh.titulo')}</span>
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

      {!conectado && (
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
          <button className="auth-boton" type="submit" disabled={conectando}>
            {conectando ? t('terminalSsh.conectando') : t('terminalSsh.conectar')}
          </button>
        </form>
      )}

      <div ref={contenedorRef} className="terminal-ssh__contenedor" />
    </div>
  );
}
