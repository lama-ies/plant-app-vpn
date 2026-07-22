// Gestión de zonas de una Familia (Fase 6.6.11), rol Administrador: crear/renombrar/eliminar zonas contra
// Plant_Zonas (ya extendido para operar cualquier familia desde el pool Staff). Interino: la familia se
// identifica por su ID directo (mismo patrón que el buscador de PC en Dashboard) mientras no exista un
// listado de clientes/familias en app-vpn.
import { useCallback, useState, type FormEvent } from 'react';
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { actualizarZona, crearZona, eliminarZona, listarZonas, type ZonaApi } from '../lib/api';
import { codigoAMensaje } from '../lib/mensajesError';
import './lista.css';

export function GestionZonas() {
  const { t } = useTranslation();
  const [familiaId, setFamiliaId] = useState('');
  const [zonas, setZonas] = useState<ZonaApi[] | null>(null);
  const [nombreNueva, setNombreNueva] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(
    async (id: string) => {
      setCargando(true);
      setError(null);
      try {
        const r = await listarZonas(id);
        setZonas(r.zonas);
      } catch (e) {
        setError(codigoAMensaje(t, e));
        setZonas(null);
      } finally {
        setCargando(false);
      }
    },
    [t],
  );

  function buscar(e: FormEvent) {
    e.preventDefault();
    if (familiaId.trim()) void cargar(familiaId.trim());
  }

  async function agregar(e: FormEvent) {
    e.preventDefault();
    if (!nombreNueva.trim()) return;
    try {
      await crearZona(familiaId.trim(), nombreNueva.trim());
      setNombreNueva('');
      await cargar(familiaId.trim());
    } catch (e) {
      setError(codigoAMensaje(t, e));
    }
  }

  async function guardarNombre(zonaId: string) {
    if (!nombreEditado.trim()) return;
    try {
      await actualizarZona(familiaId.trim(), zonaId, nombreEditado.trim());
      setEditando(null);
      await cargar(familiaId.trim());
    } catch (e) {
      setError(codigoAMensaje(t, e));
    }
  }

  async function eliminar(zonaId: string) {
    try {
      await eliminarZona(familiaId.trim(), zonaId);
      await cargar(familiaId.trim());
    } catch (e) {
      setError(codigoAMensaje(t, e));
    }
  }

  return (
    <div className="panel">
      <p className="panel__titulo">{t('gestionZonas.titulo')}</p>

      <form className="panel-acciones" onSubmit={buscar}>
        <label className="auth-campo">
          {t('altaCliente.numeroCliente')} / familiaId
          <input type="text" value={familiaId} onChange={(e) => setFamiliaId(e.target.value)} required />
        </label>
        <button type="submit" className="boton-tenue" disabled={cargando}>
          {cargando ? t('dashboard.buscando') : t('dashboard.buscar')}
        </button>
      </form>

      {error && (
        <p className="auth-error" role="alert">
          <AlertTriangle size={15} aria-hidden /> {error}
        </p>
      )}

      {zonas && (
        <>
          <form className="panel-acciones" onSubmit={agregar}>
            <label className="auth-campo">
              {t('gestionZonas.nuevaZona')}
              <input type="text" value={nombreNueva} onChange={(e) => setNombreNueva(e.target.value)} required />
            </label>
            <button type="submit" className="boton-tenue">
              <Plus size={16} aria-hidden />
              {t('gestionZonas.agregar')}
            </button>
          </form>

          {zonas.length === 0 && <p className="vacio">{t('gestionZonas.sinZonas')}</p>}

          <ul className="lista">
            {zonas.map((z) => (
              <li className="fila-lista" key={z.zonaId}>
                <div className="fila-lista__cab">
                  {editando === z.zonaId ? (
                    <input
                      type="text"
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <span className="fila-lista__principal">{z.nombre}</span>
                  )}
                  <div className="tarjeta-equipo__acciones">
                    {editando === z.zonaId ? (
                      <button type="button" className="boton-tenue" onClick={() => void guardarNombre(z.zonaId)}>
                        {t('gestionZonas.guardar')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="icono-boton"
                        title={t('gestionZonas.renombrar')}
                        onClick={() => {
                          setEditando(z.zonaId);
                          setNombreEditado(z.nombre);
                        }}
                      >
                        <Pencil size={15} aria-hidden />
                      </button>
                    )}
                    <button
                      type="button"
                      className="icono-boton icono-boton--peligro"
                      title={t('gestionZonas.eliminar')}
                      onClick={() => void eliminar(z.zonaId)}
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
