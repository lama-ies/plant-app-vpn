// Respaldos versionados de un equipo (Plant_Respaldos + S3).
//
// `07-app-vpn.md` los especifica por tarjeta de equipo: descargar el último, elegir una versión anterior y
// cargar uno nuevo con versionado automático (v1, v2, v3...), disponible para los cuatro roles sobre sus
// equipos. El backend y el bucket estaban completos desde hacía tiempo y NO había pantalla: `canRespaldos`
// era un flag muerto y la función no existía para el usuario (hallazgo de la auditoría 2026-08-07).
//
// La subida son tres pasos porque S3 se escribe directo con URL prefirmada (el archivo nunca pasa por la
// lambda): pedir la URL (el backend asigna la versión) -> PUT a S3 -> confirmar la metadata.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Loader2, Upload } from 'lucide-react';
import { Modal } from './Modal';
import {
  confirmarRespaldo,
  listarRespaldos,
  subirArchivoRespaldo,
  urlDescargaRespaldo,
  urlSubidaRespaldo,
  type RespaldoApi,
} from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';

interface Props {
  equipoId: string;
  nombreEquipo: string;
  onCerrar: () => void;
}

export function ModalRespaldos({ equipoId, nombreEquipo, onCerrar }: Props) {
  const { t } = useTranslation();
  const [respaldos, setRespaldos] = useState<RespaldoApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [descargando, setDescargando] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await listarRespaldos(equipoId);
      // Más reciente primero: la versión que se quiere descargar casi siempre es la última.
      setRespaldos([...r.versiones].sort((a, b) => b.version - a.version));
    } catch (e) {
      setError(codigoAMensaje(t, e));
    } finally {
      setCargando(false);
    }
  }, [equipoId, t]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function descargar(version: number) {
    setDescargando(version);
    setError(null);
    try {
      const { url } = await urlDescargaRespaldo(equipoId, version);
      // La URL prefirmada es de un solo uso y caduca en 15 min: se abre en el navegador del sistema.
      window.open(url, '_blank');
    } catch (e) {
      setError(codigoAMensaje(t, e));
    } finally {
      setDescargando(null);
    }
  }

  async function subir(archivo: File) {
    setSubiendo(true);
    setError(null);
    try {
      const { url, version } = await urlSubidaRespaldo(equipoId, archivo.name);
      await subirArchivoRespaldo(url, archivo);
      // La metadata SOLO se registra si el PUT a S3 salió bien: si falla, no queda una versión fantasma
      // apuntando a un objeto que no existe.
      await confirmarRespaldo(equipoId, version, archivo.name);
      await cargar();
    } catch (e) {
      setError(codigoAMensaje(t, e));
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <Modal titulo={t('respaldos.titulo', { equipo: nombreEquipo })} onCerrar={onCerrar}>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <div className="respaldos__acciones">
        <input
          ref={inputRef}
          type="file"
          id="respaldo-archivo"
          className="respaldos__input"
          disabled={subiendo}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) void subir(archivo);
          }}
        />
        <label htmlFor="respaldo-archivo" className={`auth-boton ${subiendo ? 'auth-boton--ocupado' : ''}`}>
          {subiendo ? <Loader2 size={15} className="girando" aria-hidden /> : <Upload size={15} aria-hidden />}
          {subiendo ? t('respaldos.subiendo') : t('respaldos.cargar')}
        </label>
        <span className="respaldos__nota">{t('respaldos.nota')}</span>
      </div>

      {cargando ? (
        <p className="vacio">{t('app.cargando')}</p>
      ) : respaldos.length === 0 ? (
        <p className="vacio">{t('respaldos.sinRespaldos')}</p>
      ) : (
        <ul className="lista">
          {respaldos.map((r) => (
            <li className="fila-lista" key={r.version}>
              <div className="fila-lista__cab">
                <span className="fila-lista__principal">
                  {t('respaldos.version', { n: r.version })} · {r.nombreArchivo}
                </span>
                <button
                  type="button"
                  className="icono-boton"
                  title={t('respaldos.descargar')}
                  aria-label={t('respaldos.descargar')}
                  disabled={descargando === r.version}
                  onClick={() => void descargar(r.version)}
                >
                  {descargando === r.version ? (
                    <Loader2 size={15} className="girando" aria-hidden />
                  ) : (
                    <Download size={15} aria-hidden />
                  )}
                </button>
              </div>
              <p className="fila-lista__detalle">
                {new Date(r.timestamp).toLocaleString()}
                {r.subidoPor ? ` · ${r.subidoPor}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
