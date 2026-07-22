// Tarjeta de un equipo/PC: establece o cierra la conexión VPN (automática, sin pedir ninguna llave — ver
// vpn/conexion.ts) y, una vez conectado, abre la terminal SSH con la IP y la huella de host ya resueltas.
import { useState } from 'react';
import { FolderUp, Terminal as IconoTerminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { conectarVpn, desconectarVpn, type ConexionEstablecida } from '../vpn/conexion';
import { usePermissions } from '../hooks/usePermissions';
import type { PcApi } from '../lib/api';
import './tarjeta-equipo.css';

export function TarjetaEquipo({ pc }: { pc: PcApi }) {
  const { t } = useTranslation();
  const navegar = useNavigate();
  const permisos = usePermissions();

  const [conexion, setConexion] = useState<ConexionEstablecida | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function conectar() {
    setError(null);
    setCargando(true);
    try {
      setConexion(await conectarVpn(pc.pcId));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('tarjetaEquipo.errorConectar'));
    } finally {
      setCargando(false);
    }
  }

  async function desconectar() {
    if (!conexion) return;
    setCargando(true);
    try {
      await desconectarVpn(conexion.sesionId);
    } finally {
      setConexion(null);
      setCargando(false);
    }
  }

  function estadoRuta() {
    return {
      direccionVirtual: conexion!.direccionVirtual,
      llaveHostEsperada: conexion!.llaveHostEsperada,
      nombreEquipo: pc.nombre,
    };
  }

  function abrirTerminal() {
    if (conexion) navegar('/terminal-ssh', { state: estadoRuta() });
  }

  function abrirTransferencia() {
    if (conexion) navegar('/transferencia-archivos', { state: estadoRuta() });
  }

  return (
    <div className="tarjeta-equipo">
      <div className="tarjeta-equipo__cab">
        <span className="tarjeta-equipo__nombre">{pc.nombre}</span>
        <span className="tarjeta-equipo__id">{pc.pcId.slice(0, 8)}</span>
      </div>

      <span className="tarjeta-equipo__estado">
        <span className={`tarjeta-equipo__punto${conexion ? ' tarjeta-equipo__punto--activo' : ''}`} />
        {conexion ? t('tarjetaEquipo.conectado') : pc.direccionVirtual ? '—' : t('tarjetaEquipo.sinIpVirtual')}
      </span>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <div className="tarjeta-equipo__acciones">
        {!conexion ? (
          <button
            type="button"
            className="boton-tenue"
            onClick={() => void conectar()}
            disabled={cargando || !pc.direccionVirtual}
          >
            {cargando ? t('tarjetaEquipo.conectando') : t('tarjetaEquipo.conectar')}
          </button>
        ) : (
          <>
            <button type="button" className="boton-tenue" onClick={() => void desconectar()} disabled={cargando}>
              {cargando ? t('tarjetaEquipo.desconectando') : t('tarjetaEquipo.desconectar')}
            </button>
            {permisos.canSsh && (
              <button type="button" className="boton-tenue" onClick={abrirTerminal}>
                <IconoTerminal size={15} aria-hidden />
                {t('tarjetaEquipo.abrirTerminal')}
              </button>
            )}
            {permisos.canTransferirArchivos && (
              <button type="button" className="boton-tenue" onClick={abrirTransferencia}>
                <FolderUp size={15} aria-hidden />
                {t('tarjetaEquipo.abrirTransferencia')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
